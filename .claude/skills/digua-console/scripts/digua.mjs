#!/usr/bin/env node
// digua — llm-portal CLI. Pure Node (global fetch), no deps.
// Auth via PAT (device-code login or --token). Talks to the /api/v1 layer.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const CONFIG_DIR = path.join(os.homedir(), ".digua");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
// ⚠️ 两个地址别搞混：
//   门户/控制台 = 这个 CLI 调的（管理 key/用量，PAT 鉴权）
const DEFAULT_URL = "https://digua-ai.d-robotics.cc";
//   模型网关/代理 = 拿 sk- key 去调模型的地方（OpenAI 兼容，LiteLLM key 鉴权）
const GATEWAY_URL = "https://ai-api.d-robotics.cc";

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}
function saveConfig(c) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2));
}
function baseUrl() {
  return process.env.DIGUA_URL || loadConfig().url || DEFAULT_URL;
}
function token() {
  return process.env.DIGUA_TOKEN || loadConfig().token || "";
}

async function api(method, p, body) {
  const res = await fetch(baseUrl() + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json.error || res.status;
    if (res.status === 401) die("未登录或令牌失效，请先 `digua login`");
    die(`请求失败 (${res.status})：${msg}`);
  }
  return json;
}

function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}
function arg(flags, argv) {
  for (const f of flags) {
    const i = argv.indexOf(f);
    if (i >= 0) return argv[i + 1];
  }
  return undefined;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- commands ----------

async function login(argv) {
  const url = arg(["--url", "-u"], argv);
  if (url) {
    const c = loadConfig();
    c.url = url;
    saveConfig(c);
  }
  const tok = arg(["--token", "-t"], argv);
  if (tok) {
    const c = loadConfig();
    c.token = tok;
    saveConfig(c);
    const me = await api("GET", "/api/v1/me");
    console.log(`✓ 已登录：${me.openId}（${me.role}）`);
    return;
  }
  // device code flow
  const start = await fetch(baseUrl() + "/api/device/code", { method: "POST" }).then((r) =>
    r.json(),
  );
  console.log("\n请在浏览器中授权：");
  console.log("  打开：" + (start.verification_uri_complete || start.verification_uri));
  console.log("  设备码：" + start.user_code + "\n");
  try {
    const opener =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    execSync(`${opener} "${start.verification_uri_complete || start.verification_uri}"`, {
      stdio: "ignore",
    });
  } catch {
    /* user opens manually */
  }
  process.stdout.write("等待授权");
  const deadline = Date.now() + (start.expires_in || 600) * 1000;
  while (Date.now() < deadline) {
    await sleep((start.interval || 3) * 1000);
    process.stdout.write(".");
    const r = await fetch(baseUrl() + "/api/device/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: start.device_code }),
    }).then((x) => x.json());
    if (r.status === "approved" && r.token) {
      const c = loadConfig();
      c.token = r.token;
      saveConfig(c);
      const me = await api("GET", "/api/v1/me");
      console.log(`\n✓ 已登录：${me.openId}（${me.role}）`);
      return;
    }
    if (r.status === "expired") die("\n设备码已过期，请重试");
  }
  die("\n授权超时");
}

async function whoami() {
  const me = await api("GET", "/api/v1/me");
  console.log(`${me.openId}（${me.role}）`);
}

async function key(argv) {
  const sub = argv[0];
  if (sub === "list") {
    const { keys } = await api("GET", "/api/v1/keys");
    if (!keys.length) return console.log("（没有 key）");
    for (const k of keys)
      console.log(`${k.status === "active" ? "●" : "○"} ${k.keyAlias}  [${k.status}]  ${k.id}`);
  } else if (sub === "create") {
    const name = argv[1];
    if (!name) die("用法：digua key create <名称> [--budget N] [--models a,b]");
    const budget = arg(["--budget"], argv);
    const models = arg(["--models"], argv);
    const r = await api("POST", "/api/v1/keys", {
      alias: name,
      maxBudget: budget ? Number(budget) : null,
      models: models ? models.split(",").map((s) => s.trim()) : null,
    });
    console.log(`✓ 已创建「${r.alias}」，明文仅此一次：\n\n  ${r.key}\n`);
    console.log(`  ↑ 这把 key 用于【模型网关】（不是本门户地址）：`);
    console.log(`    ${GATEWAY_URL}/v1   （OpenAI 兼容，模型名见 ${GATEWAY_URL}/v1/models）`);
    console.log(`  例：curl ${GATEWAY_URL}/v1/chat/completions -H "Authorization: Bearer ${r.key.slice(0, 8)}…" -d '{"model":"glm-5.2","messages":[...]}'\n`);
  } else if (sub === "revoke") {
    const id = argv[1];
    if (!id) die("用法：digua key revoke <id>");
    await api("DELETE", `/api/v1/keys?id=${encodeURIComponent(id)}`);
    console.log("✓ 已吊销");
  } else {
    die("用法：digua key <list|create|revoke>");
  }
}

async function usage(argv) {
  const days = Number(arg(["--days"], argv) || 30);
  const { summary, trend } = await api("GET", `/api/v1/usage?days=${days}`);
  if (!summary.hasKeys) return console.log("还没有归属到你的 key，去网页 /keys 创建或认领。");
  console.log(`近 ${days} 天：`);
  console.log(`  请求数   ${summary.requests.toLocaleString()}`);
  console.log(`  Token    ${summary.tokens.toLocaleString()}`);
  console.log(`  费用     $${summary.spend.toFixed(2)}`);
  console.log(`  活跃天数 ${summary.activeDays}`);
  if (trend.length) {
    const max = Math.max(...trend.map((t) => t.requests), 1);
    console.log("\n每日请求：");
    for (const t of trend.slice(-14)) {
      const bar = "█".repeat(Math.round((t.requests / max) * 24));
      console.log(`  ${t.day}  ${bar} ${t.requests}`);
    }
  }
}

async function page(argv) {
  const sub = argv[0];
  if (sub === "publish") {
    const file = argv[1];
    if (!file) die("用法：digua page publish <file.html> [--name <名称>] [--visibility private|dept|company|link|public]（默认 private=仅本人）");
    let html;
    try {
      html = fs.readFileSync(file, "utf8");
    } catch {
      die(`读不到文件：${file}`);
    }
    const name =
      arg(["--name", "-n"], argv) ||
      path.basename(file).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    // 默认仅本人可见；用户明确要共享时才 --visibility dept/company/link/public。
    const visibility = arg(["--visibility", "-V"], argv) || "private";
    const r = await api("POST", "/api/v1/pages", { name, html, visibility });
    console.log(`✓ 已${r.updated ? "更新" : "发布"}「${r.name}」（${(r.size / 1024).toFixed(1)} KB）\n\n  ${r.url}\n`);
  } else if (sub === "list") {
    const { pages } = await api("GET", "/api/v1/pages");
    if (!pages.length) return console.log("（没有托管页面）");
    for (const p of pages)
      console.log(`● ${p.name}  ${(p.size / 1024).toFixed(1)} KB  ${p.url}`);
  } else if (sub === "rm") {
    const name = argv[1];
    if (!name) die("用法：digua page rm <名称>");
    await api("DELETE", `/api/v1/pages?name=${encodeURIComponent(name)}`);
    console.log(`✓ 已删除「${name}」`);
  } else {
    die("用法：digua page <publish|list|rm>");
  }
}

async function skill(argv) {
  const sub = argv[0];
  if (sub === "list" || sub === "search") {
    const q = argv[1] && !argv[1].startsWith("-") ? argv[1] : "";
    const { skills } = await api("GET", "/api/v1/skills" + (q ? `?q=${encodeURIComponent(q)}` : ""));
    if (!skills.length) return console.log("（没有可见的 skill）");
    for (const s of skills) {
      const shared = s.access === "shared" ? "  [指定你可见]" : "";
      const disp = s.title && s.title !== s.name ? `${s.title}（${s.name}）` : s.name;
      console.log(`● ${disp}  v${s.version}  ↓${s.downloads}  ${s.owner || ""}${shared}${s.description ? "  — " + s.description.slice(0, 50) : ""}`);
    }
    console.log(`\n安装：digua skill install <名称>（[指定你可见] = 他人专门分享给你的）`);
  } else if (sub === "install" || sub === "update") {
    const name = argv[1];
    if (!name) die(`用法：digua skill ${sub} <名称> [--owner <人> | --id <skillId>]`);
    // Resolve a single skill id — names aren't globally unique (per-owner
    // namespace), so disambiguate by --owner / --id when several match.
    let id = arg(["--id"], argv);
    if (!id) {
      const wantOwner = arg(["--owner", "-o"], argv);
      const { skills } = await api("GET", `/api/v1/skills?q=${encodeURIComponent(name)}`);
      let matches = skills.filter((s) => s.name === name);
      if (wantOwner) matches = matches.filter((s) => (s.owner || "") === wantOwner);
      if (matches.length === 0) die(`找不到可见的 skill：${name}${wantOwner ? `（owner=${wantOwner}）` : ""}`);
      if (matches.length > 1) {
        console.error(`✗ 有 ${matches.length} 个同名「${name}」，请用 --owner 或 --id 指定其一：`);
        for (const m of matches) console.error(`   --owner "${m.owner}"   或   --id ${m.id}    (v${m.version} ↓${m.downloads})`);
        process.exit(1);
      }
      id = matches[0].id;
    }
    const res = await fetch(baseUrl() + `/api/v1/skills/download?id=${encodeURIComponent(id)}`, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    });
    if (res.status === 401) die("未登录或令牌失效，请先 `digua login`");
    if (res.status === 404) die(`找不到可见的 skill（id=${id}）`);
    if (!res.ok) die(`下载失败 (${res.status})`);
    const cd = res.headers.get("content-disposition") || "";
    const fn = (cd.match(/filename="?([^"]+)"?/) || [])[1] || name + ".zip";
    const buf = Buffer.from(await res.arrayBuffer());
    const skillsDir = path.join(os.homedir(), ".claude", "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    if (fn.endsWith(".zip")) {
      const tmp = path.join(os.tmpdir(), `digua-skill-${Date.now()}.zip`);
      fs.writeFileSync(tmp, buf);
      try {
        execSync(`unzip -o "${tmp}" -d "${skillsDir}"`, { stdio: "ignore" });
      } catch {
        die(`解压失败（需系统 unzip）。已下载到 ${tmp}，请手动解压到 ${skillsDir}`);
      }
      fs.unlinkSync(tmp);
    } else {
      const d = path.join(skillsDir, name);
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, "SKILL.md"), buf);
    }
    console.log(`✓ 已${sub === "update" ? "更新" : "安装"} skill「${name}」→ ${skillsDir}/${name}\n  重启你的 agent（如 Claude Code）后生效`);
  } else if (sub === "upload") {
    const file = argv[1];
    if (!file) die('用法：digua skill upload <SKILL.md 或 zip> [--visibility self|dept|all] [--title "中文显示名"]（默认 self=仅本人）');
    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch {
      die(`读不到文件：${file}`);
    }
    // 默认仅本人可见；用户明确要共享时才 --visibility dept/all。
    const vis = arg(["--visibility", "-V"], argv) || "self";
    // 卡片显示名（中文优先）：--title 手填 > SKILL.md frontmatter title: > 服务端自动生成。
    const title = arg(["--title", "-t"], argv);
    const res = await fetch(
      baseUrl() +
        `/api/v1/skills?filename=${encodeURIComponent(path.basename(file))}&visibility=${vis}` +
        (title ? `&title=${encodeURIComponent(title)}` : ""),
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: buf,
      },
    );
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) die("未登录或令牌失效，请先 `digua login`");
    if (!res.ok) die(`上传失败 (${res.status})：${j.error || ""}`);
    const shownName = j.title && j.title !== j.name ? `${j.title}（${j.name}）` : j.name;
    console.log(`✓ 已${j.updated ? "更新" : "上传"} skill「${shownName}」v${j.version}（可见性 ${vis}）`);
    if (Array.isArray(j.warnings) && j.warnings.length) {
      console.log("⚠ 安全提示（已放行）：");
      for (const w of j.warnings) console.log(`   · ${w}`);
    }
  } else {
    die("用法：digua skill <list|install|update|upload>");
  }
}

async function ask(argv) {
  const q = argv.join(" ");
  if (!q) die('用法：digua ask "我这个月花了多少钱"');
  const { summary } = await api("GET", "/api/v1/usage?days=30");
  if (!summary.hasKeys) return console.log("还没有归属到你的 key，无法分析。去网页 /keys 认领。");
  const has = (re) => re.test(q);
  let ans;
  if (has(/(花|费用|多少钱|spend|成本)/)) ans = `近 30 天你的费用约 $${summary.spend.toFixed(2)}。`;
  else if (has(/(token|令牌量|tokens)/)) ans = `近 30 天你消耗了 ${summary.tokens.toLocaleString()} 个 token。`;
  else if (has(/(活跃|多少天|天数)/)) ans = `近 30 天你有 ${summary.activeDays} 个活跃日。`;
  else if (has(/(请求|调用|多少次|次数)/)) ans = `近 30 天你发起了 ${summary.requests.toLocaleString()} 次请求。`;
  else
    ans = `近 30 天：${summary.requests.toLocaleString()} 请求 / ${summary.tokens.toLocaleString()} token / $${summary.spend.toFixed(2)} / ${summary.activeDays} 活跃天。`;
  console.log(ans);
}

function help() {
  console.log(`digua — 地瓜 AI 控制台 CLI

⚠️ 两个地址别搞混：
  · 门户/控制台  ${DEFAULT_URL}   ← 本 CLI 调它（管理 key/用量，PAT 鉴权）
  · 模型网关/代理 ${GATEWAY_URL}     ← 拿 sk- key 去调模型（OpenAI 兼容：/v1/chat/completions、/v1/models）

用法：
  digua login [--token <PAT>] [--url <baseUrl>]   设备码登录，或直接用令牌
  digua whoami                                    当前身份
  digua key list                                  我的 key
  digua key create <名称> [--budget N] [--models a,b]
  digua key revoke <id>
  digua usage [--days N]                          我的用量
  digua page publish <file.html> [--name <名称>] [--visibility private|dept|company|link|public]  发布/更新托管静态页（默认 private=仅本人）
  digua page list                                 我的托管页面
  digua page rm <名称>                            删除托管页面
  digua skill list [关键词]                        浏览/搜索 Skill Market
  digua skill install <名称> [--owner <人>|--id <id>]  安装 skill 到 ~/.claude/skills/（同名多个时用 --owner/--id 指定）
  digua skill update <名称> [--owner <人>|--id <id>]   拉取最新并覆盖更新
  digua skill upload <file> [--visibility self|dept|all] [--title "中文显示名"]  上传/更新自己的 skill（同名即更新，默认 self=仅本人；不给 --title 时自动生成中文卡片名）
  digua ask "<问题>"                              大白话问用量

Skill Market（地瓜控制台）是 skill 的统一拉取/更新源；upload 同名即更新，不产生重复。
环境变量：DIGUA_URL、DIGUA_TOKEN`);
}

// ---------- main ----------
const [cmd, ...rest] = process.argv.slice(2);
const run = {
  login,
  whoami,
  key,
  usage,
  page,
  skill,
  ask,
  help,
  "-h": help,
  "--help": help,
};
const fn = run[cmd] || help;
Promise.resolve(fn(rest)).catch((e) => die(e.message));
