#!/usr/bin/env node
/**
 * doc-quality — 文档质量确定性规则检查器
 *
 * 规则来源：.claude/skills/{format-check,term-check,structure-check,step-check}/SKILL.md
 * 供 CI 与本地共用。只做可判定的机械规则；行文逻辑、步骤完整性等判断性规则仍由 skill/Agent 负责。
 *
 * 用法：
 *   node scripts/doc-quality.js docs/
 *   node scripts/doc-quality.js --changed-only --base origin/main
 *   node scripts/doc-quality.js docs/ --baseline .doc-quality-baseline.json
 *   node scripts/doc-quality.js docs/ --json > report.json
 *   node scripts/doc-quality.js docs/ --baseline .doc-quality-baseline.json --write-baseline
 *
 * 退出码：0 = 无新增 error；1 = 有新增 error（warn 不影响退出码）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ---------- 参数 ----------

function parseArgs(argv) {
  const opts = {
    paths: [],
    changedOnly: false,
    base: 'origin/main',
    baseline: null,
    writeBaseline: false,
    json: false,
    github: false,
    fix: false,
    quiet: false,
    failOnWarn: false,
    maxWarn: null,
    glossary: path.join(__dirname, '..', 'glossary.json'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--changed-only') opts.changedOnly = true;
    else if (a === '--base') opts.base = argv[++i];
    else if (a === '--baseline') opts.baseline = argv[++i];
    else if (a === '--write-baseline') opts.writeBaseline = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--github') opts.github = true;
    else if (a === '--fix') opts.fix = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--fail-on-warn') opts.failOnWarn = true;
    else if (a === '--max-warn') opts.maxWarn = parseInt(argv[++i], 10);
    else if (a === '--glossary') opts.glossary = argv[++i];
    else if (a === '-h' || a === '--help') { console.log(usage()); process.exit(0); }
    else if (a.startsWith('-')) { console.error(`未知参数: ${a}`); process.exit(2); }
    else opts.paths.push(a);
  }
  return opts;
}

function usage() {
  return `doc-quality [paths...] [options]

  --changed-only          只检查相对 --base 的改动文件
  --base <ref>            git 基线，默认 origin/main
  --baseline <file>       存量问题基线，命中即忽略
  --write-baseline        生成/更新基线文件（需配合 --baseline）
  --json                  输出 JSON
  --github                输出 GitHub Actions annotation（::error / ::warning）
  --fix                   直接修复可自动修复的问题（仅正文，跳过代码块、行内代码与 URL）
  --quiet                 只输出汇总
  --fail-on-warn          warn 也返回非零
  --max-warn <n>          warn 超过 n 条则失败
  --glossary <file>       术语表路径，默认仓库根 glossary.json`;
}

// ---------- 术语 ----------

// glossary 里有很多短形式（S100 / USB / can / gpio …）在正文中无法无歧义判定。
// 这些只给 Agent 做上下文判断，不进 CI 阻断。
const TERM_AMBIGUOUS = new Set([
  'S100', 'S600', 'X3', 'X5', 'X5 Module',
  'USB', 'usb', 'Usb', 'can', 'Can', 'gpio', 'pwm', 'uart', 'i2c', 'spi', 'ttl',
  'vlm', 'Vlm', 'VlM', 'vla', 'Vla', 'VlA', 'uvc', 'Uvc', 'uac', 'Uac',
  'asr', 'Asr', 'kws', 'Kws', 'tts', 'Tts', 'llm', 'Llm', 'rtf', 'Rtf',
  'yolo', 'Yolo', 'ttft', 'Ttft', 'tps', 'Tps', 'wav', 'Wav',
  'nvme', 'ufs', 'dfu', 'fastboot', 'bootloader', 'miniboot', 'secure', 'Secure', 'SECURE',
  'sensor', 'Sensor', 'serdes', 'Serdes', 'SERDES', 'poe', 'poe',
  'wifi', 'WiFi', 'Wifi', 'WI-FI', 'Wi-fi',
  'oled', 'Oled', 'OLED 屏',
  '板子',
]);

function loadTerms(glossaryPath) {
  const terms = [];
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));
  } catch (e) {
    console.error(`[doc-quality] 读取术语表失败: ${glossaryPath} (${e.message})`);
    return terms;
  }
  for (const entry of raw.glossary || []) {
    if (entry['状态'] && entry['状态'] !== '现行') continue;
    const std = entry['标准写法'];
    for (const wrong of entry['错误写法'] || []) {
      if (!wrong || wrong === std) continue;
      if (TERM_AMBIGUOUS.has(wrong)) continue;
      if (wrong.length < 2) continue;
      terms.push({ wrong, std, category: entry['分类'] || '' });
    }
  }
  // 长形式优先，避免 "RDK-S100" 先被 "S100" 命中
  terms.sort((a, b) => b.wrong.length - a.wrong.length);
  return terms;
}

// ---------- 文本预处理 ----------

const CJK = '\\u3400-\\u4dbf\\u4e00-\\u9fff';
const CJK_RE = new RegExp(`[${CJK}]`);
const LATIN_NUM_RE = /[A-Za-z0-9]/;

/** 用等长占位符替换，保留边界位置 */
function mask(s, re, ch) {
  return s.replace(re, (m) => ch.repeat(m.length));
}

function stripFrontmatter(lines) {
  let start = 0;
  if (lines[0] && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---' || lines[i].trim() === '...') { start = i + 1; break; }
    }
  }
  return start;
}

const FENCE_RE = /^\s*(`{3,}|~{3,})(.*)$/;

// ---------- 规则 ----------

const RULES = {
  'spacing/cjk-latin': { severity: 'error', desc: '中英文/数字之间缺空格' },
  'spacing/cjk-link': { severity: 'warn', desc: '中文与链接之间缺空格' },
  'term/wrong-form': { severity: 'error', desc: '术语错误写法' },
  'image/http': { severity: 'error', desc: '图片使用 http://' },
  'code/fence-language': { severity: 'error', desc: '代码块未标注语言' },
  'heading/h1-missing': { severity: 'error', desc: '缺少 H1' },
  'heading/h1-multiple': { severity: 'error', desc: '多个 H1' },
  'heading/level-jump': { severity: 'warn', desc: '标题层级跳跃' },
  'heading/duplicate': { severity: 'warn', desc: '标题重复' },
  'emoji/body': { severity: 'warn', desc: '正文使用 emoji' },
  'date/cjk': { severity: 'warn', desc: '中文数字日期' },
  'link/relative-no-ext': { severity: 'warn', desc: '相对链接缺少 .md 后缀' },
  'html/br': { severity: 'warn', desc: '<br> 缺少斜杠' },
};

function scanFile(file, text, terms) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const fmEnd = stripFrontmatter(lines);

  // 按内容判断语种：CJK 字符过少视为英文文档，跳过中文特有规则（间距/术语/日期）
  const cjkCount = (text.match(new RegExp(`[${CJK}]`, 'g')) || []).length;
  const isZh = cjkCount >= 20;

  let fence = null;               // { char, len }
  const scopeStack = [];          // DocScope 区块 id 栈
  let scopeSeq = 0;
  const headings = [];            // { level, text, key }
  const headingStack = [];        // 当前标题路径，用于区分不同父章节下的同名小节
  let prevHeadingLevel = 0;
  const dupSeen = new Map();
  const seenFenceBare = new Set();
  let inComment = false;
  let inTable = 0;

  const push = (rule, line, message, snippet) => {
    const r = RULES[rule];
    findings.push({
      file, line, rule, severity: r.severity, message,
      snippet: (snippet || '').trim().slice(0, 160),
    });
  };

  for (let i = fmEnd; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNo = i + 1;
    const line = rawLine;

    // --- HTML 注释放行（常见于注释掉的表格行）---
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    if (/<!--/.test(line) && !/-->/.test(line.slice(line.indexOf('<!--') + 4))) {
      inComment = true;
      continue;
    }

    // --- HTML 表格区域（图标类 emoji 不算正文）---
    if (/<table\b/i.test(line)) inTable++;
    if (/<\/table>/i.test(line)) inTable = Math.max(0, inTable - 1);

    // --- DocScope 区块（同标题在不同产品区块内重复属正常）---
    if (/<DocScope\b/.test(line)) scopeStack.push(`s${++scopeSeq}`);
    if (/<\/DocScope>/.test(line)) scopeStack.pop();
    const scopeKey = scopeStack.length ? scopeStack.join('/') : 'root';

    // --- 代码围栏 ---
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const info = fenceMatch[2].trim();
      if (fence) {
        const closes = marker[0] === fence.char && marker.length >= fence.len && info === '';
        if (closes) { fence = null; continue; }
        // 围栏内：不检查内容
        continue;
      }
      if (info === '') {
        // 裸围栏（闭合围栏已在上面处理）。同一行只报一次。
        if (!seenFenceBare.has(lineNo)) {
          seenFenceBare.add(lineNo);
          push('code/fence-language', lineNo, '代码块未标注语言，请补 bash / text / python 等');
        }
      }
      fence = { char: marker[0], len: marker.length };
      continue;
    }
    if (fence) continue;

    // --- 行内预处理（保留长度，便于定位）---
    let m = line;
    // HTML 标签（含 mdx 属性）整体抹掉
    m = mask(m, /<[^>]*>/g, ' ');
    // MDX 表达式 {{...}}
    m = mask(m, /\{\{?[^}]*\}?\}/g, ' ');
    // URL
    m = mask(m, /https?:\/\/[^\s)]+/g, 'X');
    // 行内代码
    m = mask(m, /`[^`]*`/g, 'X');
    // 表格分隔行
    if (/^\s*\|?[\s:-]+\|[\s:|-]*$/.test(m)) continue;

    // --- 标题 ---
    const hMatch = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const htext = hMatch[2].replace(/`([^`]*)`/g, '$1').trim();
      const hasAnchor = /\{#[-a-zA-Z0-9_]+\}\s*$/.test(htext);
      const cleanText = htext.replace(/\s*\{#[-a-zA-Z0-9_]+\}\s*$/, '');

      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      const parentPath = headingStack.map(h => h.text).join(' > ');
      headingStack.push({ level, text: cleanText });

      headings.push({ level, text: cleanText, line: lineNo });
      if (prevHeadingLevel && level > prevHeadingLevel + 1) {
        push('heading/level-jump', lineNo,
          `标题层级跳跃 H${prevHeadingLevel} → H${level}`, cleanText);
      }
      prevHeadingLevel = level;

      // 显式锚点 {#id} 是作者有意消歧，不按重复报
      if (!hasAnchor) {
        const key = `${scopeKey}|${level}|${parentPath}|${cleanText}`;
        const n = (dupSeen.get(key) || 0) + 1;
        dupSeen.set(key, n);
        if (n === 2) {
          push('heading/duplicate', lineNo, `标题重复「${cleanText}」（同章节内同层同文）`, cleanText);
        }
      }
    }

    // --- 图片 http ---
    const imgRaw = line.match(/<img[^>]*\ssrc=(["'])http:\/\//i) || line.match(/!\[[^\]]*\]\(http:\/\//);
    if (imgRaw) push('image/http', lineNo, '图片使用 http://，请改为 https://');

    // --- <br> ---
    if (/<br\s*>/.test(line)) push('html/br', lineNo, '<br> 缺少斜杠，MDX 下应为 <br />');

    // --- 日期 ---
    if (isZh) {
      const dateRe = /\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/g;
      const dateHits = [...m.matchAll(dateRe)];
      if (dateHits.length) {
        for (const d of dateHits) {
          push('date/cjk', lineNo, `中文数字日期「${d[0].replace(/\s+/g, '')}」，应为 YYYY-MM-DD`, d[0]);
        }
        m = m.replace(dateRe, (x) => ' '.repeat(x.length));
      }

      // --- 中英/数字间距 ---
      const spacing = findSpacing(m);
      for (const s of spacing) {
        push('spacing/cjk-latin', lineNo,
          `中英文/数字之间缺空格「${s.fragment}」`, s.fragment);
      }
    }

    // --- 中文与链接之间缺空格 ---
    const linkRe = /(!?)\[([^\]]+)\]\(([^)]*)\)/g;
    let lm;
    while ((lm = linkRe.exec(line)) !== null) {
      if (lm[1] === '!') continue;
      const before = line[lm.index - 1] || '';
      const after = line[lm.index + lm[0].length] || '';
      if (isZh && (CJK_RE.test(before) || CJK_RE.test(after))) {
        push('spacing/cjk-link', lineNo, `中文与链接之间缺空格「${line.slice(Math.max(0, lm.index - 6), lm.index + lm[0].length + 6)}」`);
      }
      // 相对链接缺后缀
      const target = lm[3].trim();
      if (target.startsWith('./') && !target.startsWith('../') &&
          !/\.(md|mdx|png|jpe?g|gif|svg|webp|pdf|zip)(#.*)?$/i.test(target) &&
          !target.endsWith('/')) {
        push('link/relative-no-ext', lineNo, `相对链接缺少 .md 后缀「${target}」`);
      }
    }

    // --- emoji ---
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2705}\u{274C}]/gu;
    const emojiHits = [...m.matchAll(emojiRe)];
    // 表格内的图标（如下载链接的 📄）与 admonition 标题属于视觉提示，不算正文 emoji
    if (emojiHits.length && !inTable && !/^\s*:::/.test(line)) {
      push('emoji/body', lineNo, `正文使用 emoji「${emojiHits.map(e => e[0]).join('')}」，改用文字或 admonition`);
    }

    // --- 术语（在掩码后的行上，行内代码已排除；英文文档跳过）---
    for (const t of isZh ? terms : []) {
      const hit = findTerm(m, t.wrong);
      if (!hit) continue;
      push('term/wrong-form', lineNo, `「${t.wrong}」→「${t.std}」`, hit.text);
      // 已命中的片段掩掉，避免长形式（「Xburn 工具」）与其子串（「Xburn」）重复计数
      m = m.slice(0, hit.index) + ' '.repeat(hit.text.length) + m.slice(hit.index + hit.text.length);
    }
  }

  // --- H1 ---
  const h1 = headings.filter(h => h.level === 1);
  if (h1.length === 0) push('heading/h1-missing', 1, '缺少 H1 文档标题');
  else if (h1.length > 1) {
    push('heading/h1-multiple', h1[1].line, `存在 ${h1.length} 个 H1，只应有 1 个`, h1[1].text);
  }

  return findings;
}

/** 找到 CJK 与拉丁/数字相邻（无空格）的位置 */
function findSpacing(s) {
  const out = [];
  const cjk = new RegExp(`[${CJK}]`, 'g');
  let mm;
  while ((mm = cjk.exec(s)) !== null) {
    const idx = mm.index;
    const next = s[idx + 1];
    const prev = s[idx - 1];
    if (next && LATIN_NUM_RE.test(next)) {
      out.push({ fragment: s.slice(idx, idx + 1) + next });
    }
    if (prev && LATIN_NUM_RE.test(prev)) {
      out.push({ fragment: prev + s[idx] });
    }
  }
  // 同一位置左右都命中时去重
  const seen = new Set();
  return out.filter(o => {
    if (seen.has(o.fragment)) return false;
    seen.add(o.fragment);
    return true;
  });
}

function findTerm(line, wrong) {
  if (CJK_RE.test(wrong)) {
    const i = line.indexOf(wrong);
    return i >= 0 ? { index: i, length: wrong.length, text: wrong } : null;
  }
  const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![A-Za-z0-9_.-])${escaped}(?![A-Za-z0-9_.-])`);
  const m = re.exec(line);
  return m ? { index: m.index, length: m[0].length, text: m[0] } : null;
}

// ---------- 自动修复 ----------

// 不参与修复的区间：行内代码、URL、HTML 标签、MDX 表达式
const PROTECT_RES = [
  /`[^`]*`/g,
  /https?:\/\/[^\s)]+/g,
  /<[^>]*>/g,
  /\{\{?[^}]*\}?\}/g,
];

function protectedIntervals(line) {
  const ivs = [];
  for (const re of PROTECT_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) ivs.push([m.index, m.index + m[0].length]);
  }
  ivs.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const iv of ivs) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }
  return merged;
}

/** 只对非保护区间应用 fn */
function mapUnprotected(line, fn) {
  const ivs = protectedIntervals(line);
  let out = '';
  let pos = 0;
  for (const [s, e] of ivs) {
    out += fn(line.slice(pos, s));
    out += line.slice(s, e);
    pos = e;
  }
  return out + fn(line.slice(pos));
}

function termRegex(wrong) {
  const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (CJK_RE.test(wrong)) return new RegExp(escaped, 'g');
  return new RegExp(`(?<![A-Za-z0-9_.-])${escaped}(?![A-Za-z0-9_.-])`, 'g');
}

/** 修复单个未受保护片段：日期、术语、中英间距 */
function fixSegment(seg, terms) {
  let count = 0;
  let s = seg;

  s = s.replace(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, (m, y, mo, d) => {
    count++;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  });

  for (const t of terms) {
    s = s.replace(termRegex(t.wrong), () => { count++; return t.std; });
  }

  const before = s;
  s = s.replace(new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g'), '$1 $2')
       .replace(new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g'), '$1 $2');
  // 每次替换只插入一个空格，长度差即修复条数
  count += s.length - before.length;

  return { text: s, count };
}

/** 中文与链接之间补空格 */
function fixLinkSpacing(line) {
  const ivs = protectedIntervals(line);
  const isProtected = (i) => ivs.some(([s, e]) => i >= s && i < e);
  const re = /(!?)\[([^\]]+)\]\(([^)]*)\)/g;
  const inserts = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m[1] === '!') continue;
    const start = m.index;
    const end = start + m[0].length;
    if (isProtected(start)) continue;
    const before = line[start - 1];
    const after = line[end];
    if (before && before !== ' ' && CJK_RE.test(before)) inserts.push(start);
    if (after && after !== ' ' && CJK_RE.test(after)) inserts.push(end);
  }
  if (!inserts.length) return { text: line, count: 0 };
  let out = line;
  for (const i of inserts.sort((a, b) => b - a)) out = out.slice(0, i) + ' ' + out.slice(i);
  return { text: out, count: inserts.length };
}

function fixText(text, terms) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const fmEnd = stripFrontmatter(lines);
  let fence = null;
  let inComment = false;
  let count = 0;

  for (let i = fmEnd; i < lines.length; i++) {
    let line = lines[i];

    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    if (/<!--/.test(line) && !/-->/.test(line.slice(line.indexOf('<!--') + 4))) {
      inComment = true;
      continue;
    }

    const fm = line.match(FENCE_RE);
    if (fm) {
      const marker = fm[1];
      const info = fm[2].trim();
      if (fence) {
        if (marker[0] === fence.char && marker.length >= fence.len && info === '') fence = null;
        continue;
      }
      if (info === '') {
        lines[i] = line + 'text';
        count++;
      }
      fence = { char: marker[0], len: marker.length };
      continue;
    }
    if (fence) continue;

    let out = line;
    out = out.replace(/<br\s*>/g, () => { count++; return '<br />'; });
    out = out.replace(/(<img[^>]*\ssrc=["'])http:\/\//gi, (m, p) => { count++; return p + 'https://'; });
    out = out.replace(/(!\[[^\]]*\]\()http:\/\//g, (m, p) => { count++; return p + 'https://'; });

    out = mapUnprotected(out, (seg) => {
      const r = fixSegment(seg, terms);
      count += r.count;
      return r.text;
    });

    const ls = fixLinkSpacing(out);
    count += ls.count;
    out = ls.text;

    if (out !== line) lines[i] = out;
  }

  return { text: lines.join(eol), count };
}

// ---------- 文件收集 ----------

const SKIP_DIRS = new Set(['node_modules', '.git', '.docusaurus', 'build', 'dist', '.next']);
const DOC_EXT = new Set(['.md', '.mdx']);

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') { if (SKIP_DIRS.has(e.name)) continue; }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, out);
    } else if (DOC_EXT.has(path.extname(e.name))) {
      out.push(p);
    }
  }
}

function changedFiles(base) {
  const out = [];
  try {
    const raw = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    out.push(...raw.split('\n').filter(Boolean));
  } catch (e) {
    // 返回 null 而不是 []：拿不到基准 ≠ 没有改动。返回空数组会让脚本
    // 扫 0 个文件、报 0 条问题、退出 0，看起来像「检查通过」。
    console.error(`[doc-quality] 无法获取改动文件（${base}）: ${e.message}`);
    return null;
  }
  return out.filter(f => DOC_EXT.has(path.extname(f)));
}

function isEnglishDoc(p) {
  return /(^|\/)i18n\//.test(p.replace(/\\/g, '/'));
}

// ---------- 基线 ----------

function fingerprint(f) {
  return crypto.createHash('sha1')
    .update(`${f.rule}|${normalizePath(f.file)}|${f.snippet}`)
    .digest('hex').slice(0, 16);
}

function normalizePath(p) {
  const cwd = process.cwd();
  return path.isAbsolute(p) ? path.relative(cwd, p) : p;
}

function loadBaseline(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.fingerprints || {};
  } catch {
    return {};
  }
}

// ---------- 主流程 ----------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const terms = loadTerms(opts.glossary);
  const baseline = opts.baseline ? loadBaseline(opts.baseline) : {};
  const baselineHits = {};

  let files = [];
  if (opts.changedOnly) {
    files = changedFiles(opts.base);
    if (files === null) {
      console.error('[doc-quality] 检查未执行：无法确定改动文件。请确认基线 ref 存在（CI 中通常是 origin/<目标分支>，需要先 fetch 成远程跟踪分支）。');
      process.exit(2);
    }
  } else if (opts.paths.length) {
    for (const p of opts.paths) {
      const st = fs.statSync(p, { throwIfNoEntry: false });
      if (!st) continue;
      if (st.isDirectory()) walk(p, files);
      else if (DOC_EXT.has(path.extname(p))) files.push(p);
    }
  } else {
    console.error('[doc-quality] 请指定路径或使用 --changed-only');
    process.exit(2);
  }
  files = [...new Set(files)];

  if (files.length === 0 && !opts.changedOnly) {
    console.error(`[doc-quality] 未找到 .md/.mdx 文件：${opts.paths.join(', ')}`);
    process.exit(2);
  }

  const all = [];
  let skippedEn = 0;
  let fixedFiles = 0;
  let fixedCount = 0;
  for (const f of files) {
    const rel = normalizePath(f);
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (opts.fix) {
      const r = fixText(text, terms);
      if (r.count > 0 && r.text !== text) {
        try {
          fs.writeFileSync(f, r.text);
          fixedFiles++;
          fixedCount += r.count;
          text = r.text;
        } catch (e) {
          console.error(`[doc-quality] 写入失败: ${rel} (${e.message})`);
        }
      }
    }
    const cjkCount = (text.match(new RegExp(`[${CJK}]`, 'g')) || []).length;
    if (cjkCount < 20) skippedEn++;
    const found = scanFile(rel, text, terms);
    for (const item of found) {
      const fp = fingerprint(item);
      if (baseline[fp]) {
        baselineHits[fp] = (baselineHits[fp] || 0) + 1;
        if (baselineHits[fp] <= baseline[fp]) continue;
      }
      all.push({ ...item, fingerprint: fp });
    }
  }

  const errors = all.filter(f => f.severity === 'error');
  const warns = all.filter(f => f.severity === 'warn');

  if (opts.writeBaseline && opts.baseline) {
    const fps = {};
    for (const f of all) fps[f.fingerprint] = (fps[f.fingerprint] || 0) + 1;
    fs.writeFileSync(opts.baseline, JSON.stringify({ generatedAt: new Date().toISOString(), fingerprints: fps }, null, 2) + '\n');
    if (!opts.quiet) console.error(`[doc-quality] 已写入基线 ${opts.baseline}（${Object.keys(fps).length} 条）`);
  }

  if (opts.json) {
    console.log(JSON.stringify({
      files: files.length,
      checkedZh: files.length - skippedEn,
      skippedEnglish: skippedEn,
      errors: errors.length,
      warnings: warns.length,
      findings: all,
    }, null, 2));
  } else if (opts.github) {
    for (const f of all) {
      const level = f.severity === 'error' ? 'error' : 'warning';
      const msg = `[${f.rule}] ${f.message}`.replace(/%/g, '%25').replace(/\r?\n/g, '%0A');
      console.log(`::${level} file=${f.file},line=${f.line},title=doc-quality::${msg}`);
    }
    if (!opts.quiet) {
      console.error(`[doc-quality] ${files.length} 个文件（跳过英文 ${skippedEn}） · ${errors.length} error / ${warns.length} warn`);
    }
  } else {
    for (const f of all) {
      const tag = f.severity === 'error' ? 'ERROR' : 'WARN ';
      console.log(`${f.file}:${f.line}: ${tag} [${f.rule}] ${f.message}`);
    }
    if (!opts.quiet) {
      if (opts.fix) {
        console.error(`[doc-quality] 已修复 ${fixedCount} 处，写入 ${fixedFiles} 个文件`);
      }
      const byRule = {};
      for (const f of all) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
      console.error(`\n[doc-quality] ${files.length} 个文件（跳过英文 ${skippedEn}） · ${errors.length} error / ${warns.length} warn`);
      if (Object.keys(byRule).length) {
        console.error('[doc-quality] 按规则：' + Object.entries(byRule)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k}=${v}`).join(', '));
      }
    }
  }

  const failed = errors.length > 0 ||
    (opts.maxWarn !== null && warns.length > opts.maxWarn) ||
    (opts.failOnWarn && warns.length > 0);
  // 用 exitCode 而不是 process.exit()：大 JSON 经管道输出时 exit() 会截断 stdout
  process.exitCode = failed ? 1 : 0;
}

main();
