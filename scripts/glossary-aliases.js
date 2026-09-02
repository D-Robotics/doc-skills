#!/usr/bin/env node
/**
 * glossary.json → 检索别名 JSON 派生脚本(单一数据源,纯 Node 标准库,无外部依赖)
 *
 * 单一事实来源仍是 glossary.json;本脚本是它的下游派生态(同 glossary-to-csv.js)。
 * 改术语只改 JSON,重跑本脚本重生成 `glossary-aliases.json`,不手动维护第二份。
 *
 * 对接研发自建 rdk-docs-mcp 的 mcp/src/search.ts:
 *   产出 `aliases` 的形状与 search.ts 的 SYNONYMS 对象一致
 *   (Record<string, string[]> = 错误写法变体 → 要额外拿去匹配文档的词数组),
 *   研发可 `{ ...SYNONYMS, ...aliases }` 一行 merge,或在同一条扩词循环旁再遍历一份。
 *   另产出 `skipped`,把被规则剔除的变体连同原因列明,透明可见、不静默丢弃。
 *
 * 剔除规则(为什么不是"错误写法全量倒进去"):
 *   1. 大小写变体 —— 检索已把查询词与文档都 .toLowerCase() 归一,EMMC/eMMC 这类
 *      裸大小写差异直接命中,无需别名。
 *   2. 含空格 / + / / 的多 token 或连写 —— search.ts 只在切出"单个 token"后才做
 *      同义扩展,含空格或非法字符的 key 永远打不中,属预留或需另一套机制。
 *   3. 长于 2 字的纯中文 —— 中文检索按二元(bigram)切词,3 字以上整词不会被当成
 *      单个 token 命中(如「无系统板」→「无系/系统/统板」)。
 *   4. 已是匹配目标(标准写法/英文名称)字面或子串 —— 该变体本身就能在文档正文里
 *      字面命中,架别名属冗余(如「S100」⊂「RDK S100」)。
 *
 * 英文名称只有当它"去掉括号注释、无空格无断裂符、是单个检索 token"时才收作匹配目标;
 * 多词英文名(如「Power over Ethernet」「Sign in / Log in」)对中文文档检索帮助有限,暂不收。
 *
 * 用法:
 *   node scripts/glossary-aliases.js                  # 写 scripts/glossary-aliases.json
 *   node scripts/glossary-aliases.js -o other.json    # 写到指定路径
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- 参数 ----------
const args = process.argv.slice(2);
let outPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') {
    outPath = args[i + 1];
    i++;
  }
}

// ---------- 路径 ----------
const ROOT = path.resolve(__dirname, '..');
const GLOSSARY_JSON = path.join(ROOT, 'glossary.json');
const DEFAULT_OUT = path.join(__dirname, 'glossary-aliases.json');
const target = outPath || DEFAULT_OUT;

if (!fs.existsSync(GLOSSARY_JSON)) {
  console.error(`✘ 找不到术语表数据: ${GLOSSARY_JSON}`);
  process.exit(1);
}

// ---------- 读取 ----------
const data = JSON.parse(fs.readFileSync(GLOSSARY_JSON, 'utf8'));
const glossary = Array.isArray(data.glossary) ? data.glossary : [];

if (glossary.length === 0) {
  console.error('✘ glossary.json 无术语条目(glossary 数组为空)');
  process.exit(1);
}

// ---------- 归一 / 判定 ----------
function lower(s) {
  return String(s == null ? '' : s).toLowerCase();
}

// 单个检索 token 才配当 key / 匹配目标:ascii 连续段,或 2 字纯中文 bigram
function isValidKey(k) {
  return /^[a-z0-9][a-z0-9_.-]*$/.test(k) || /^[一-鿿]{2}$/.test(k);
}

// 英文名称 → 单 token 匹配目标:去掉括号注释与 /、+ 断裂符后,仍须是单个检索 token
function cleanEn(en) {
  if (!en) return '';
  const t = lower(en)
    .replace(/\([^)]*\)/g, '')
    .replace(/[/,+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return isValidKey(t) ? t : '';
}

// ---------- 派生 ----------
const aliases = {};
const skipped = [];
const reasonCounts = {};

function noteSkip(canon, variant, reason) {
  skipped.push({ 术语: canon, 变体: variant, 原因: reason });
  reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
}

for (const term of glossary) {
  const canon = term['标准写法'];
  if (!canon) continue;
  const canonLow = lower(canon);
  const wrong = Array.isArray(term['错误写法']) ? term['错误写法'] : [];

  // 匹配目标:标准写法(必)+ 英文名称(干净的单 token 且不等于标准写法才收)
  const targets = [canonLow];
  const en = cleanEn(term['英文名称']);
  if (en && en !== canonLow && !targets.includes(en)) targets.push(en);

  for (const v of wrong) {
    const k = lower(v);
    if (!k) {
      noteSkip(canon, v, '空变体');
    } else if (k === canonLow) {
      noteSkip(canon, v, '大小写变体,检索已小写归一');
    } else if (/\s/.test(v)) {
      noteSkip(canon, v, '含空格多 token,单 token 扩词打不中');
    } else if (!isValidKey(k)) {
      noteSkip(canon, v, '非单个检索 token(+或/连写,或超长中文)');
    } else if (targets.some((t) => t.includes(k))) {
      noteSkip(canon, v, '已是匹配目标字面/子串,字面即命中');
    } else {
      if (!aliases[k]) aliases[k] = [];
      for (const t of targets) {
        if (!aliases[k].includes(t)) aliases[k].push(t);
      }
    }
  }
}

// 别名按 key 排序,保证重跑重生成的 JSON 稳定可 diff
const sortedAliases = Object.fromEntries(
  Object.keys(aliases)
    .sort()
    .map((k) => [k, aliases[k]]),
);

const payload = {
  $comment:
    '由 scripts/glossary-aliases.js 从 glossary.json 派生(单一事实来源见 glossary.json)。' +
    'aliases = 错误写法变体 → 匹配目标数组(标准写法 + 干净英文名称),可 merge 进 rdk-docs-mcp 的 mcp/src/search.ts SYNONYMS。' +
    'skipped = 被剔除的变体及原因。重跑脚本重生成,勿手动编辑本文件。',
  aliases: sortedAliases,
  skipped,
};

// ---------- 输出 ----------
fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');

// 派生的 TS 模块(给 tsc 纯编译的 rdk-docs-mcp 用:tsc 不把 .json 拷进 dist,别名以 .ts 模块进包)。
// 与 JSON 的 aliases 同源同值,便于 diff 核对。vendor 时把本文件同步到 rdk-docs-mcp 的 mcp/src/。
const tsTarget = path.join(__dirname, 'glossary-aliases.ts');
const tsSource = [
  '// ⚠️ 本文件由 doc-skills/scripts/glossary-aliases.js 从 glossary.json 派生(单一事实来源见 glossary.json)。',
  '// 勿手动编辑;改术语后回 doc-skills 重跑脚本,把本文件同步到 rdk-docs-mcp 的 mcp/src/。',
  '// 形状与 search.ts 的 SYNONYMS 一致:Record<错误写法变体, 匹配目标数组>。',
  `export const GLOSSARY_ALIASES: Record<string, string[]> = ${JSON.stringify(sortedAliases, null, 2)};\n`,
].join('\n');
fs.writeFileSync(tsTarget, tsSource, 'utf8');

const aliasCount = Object.keys(sortedAliases).length;
const skippedCount = skipped.length;
console.log(`✓ 派生 ${aliasCount} 条别名 [${glossary.length} 条术语] → ${target}`);
console.log(`  (.ts 模块 → ${tsTarget})`);
console.log(`  跳过 ${skippedCount} 条变体:`);
for (const reason of Object.keys(reasonCounts).sort((a, b) => reasonCounts[b] - reasonCounts[a])) {
  console.log(`    · ${reason}: ${reasonCounts[reason]}`);
}