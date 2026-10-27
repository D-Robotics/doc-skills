#!/usr/bin/env node
/**
 * 术语候选扫描：从文档里找出「可能该收进 glossary.json」的词。
 * 纯 Node 标准库，无第三方依赖。
 *
 * 定位：term-check 查「已收录词写错」，本脚本查「还没收录、但反复出现的词」。
 * 输出只是候选，不自动改词库——按 CONTRIBUTING「提案」档，由 TW 提 PR、IA 定稿。
 *
 * 提取规则：
 *   1. 去掉代码块、行内代码、URL、文件路径后再扫，避免把命令/标识符当术语。
 *   2. 只收「中文语境里夹带的英文词」（sensor / callback / diag …）：
 *      英文 token 必须与中文相邻（左右 4 字符内有汉字），纯英文行/表格一律跳过。
 *      这条规则把 buffer / status 这类英文表格头挡在外面，留下真正的中英混排术语。
 *   3. 英文文档只提「首字母大写的多词短语」（Camera Sensor / Tx Serializer）。
 *   4. 同一词不同大小写（Sensor / sensor）单独成节，这类最值得收编成「错误写法」。
 *   5. 已在 glossary 的标准写法 / 英文名称 / 错误写法，一律不再当候选；
 *      错误写法在文档里出现则单列到「词库错误写法命中」。
 *
 * 用法：
 *   node scripts/scan-term-candidates.js <文件或目录> [更多路径...]
 *   node scripts/scan-term-candidates.js docs --min-count 3 --min-files 2 -o report.md
 *   node scripts/scan-term-candidates.js docs --json out.json
 *
 * 参数：
 *   --min-count N     出现次数下限（默认 3）
 *   --min-files N     覆盖文件数下限（默认 2）
 *   --include-en      英文文档也扫单词（默认只扫大写多词短语）
 *   --top N           每节最多列 N 行（默认 50，完整结果看 --json）
 *   -o, --output FILE Markdown 报告输出路径（默认 stdout）
 *   --json FILE       JSON 结果输出路径（可选）
 *   --glossary FILE   指定 glossary.json（默认仓库根目录）
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- 参数 ----------
const args = process.argv.slice(2);
const paths = [];
let minCount = 3;
let minFiles = 2;
let includeEn = false;
let topN = 50;
let mdOut = null;
let jsonOut = null;
let glossaryPath = path.join(__dirname, '..', 'glossary.json');

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--min-count') minCount = parseInt(args[++i], 10);
  else if (a === '--min-files') minFiles = parseInt(args[++i], 10);
  else if (a === '--include-en') includeEn = true;
  else if (a === '--top') topN = parseInt(args[++i], 10);
  else if (a === '-o' || a === '--output') mdOut = args[++i];
  else if (a === '--json') jsonOut = args[++i];
  else if (a === '--glossary') glossaryPath = args[++i];
  else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
    process.exit(0);
  } else paths.push(a);
}

if (paths.length === 0) paths.push(process.cwd());

// ---------- 词库 ----------
const glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf8')).glossary || [];

// 已收录：标准写法 / 英文名称（小写归一）
const known = new Set();
// 错误写法：小写 → 标准写法
const wrongForms = new Map();

for (const t of glossary) {
  const canon = t['标准写法'] || '';
  if (canon) known.add(canon.toLowerCase());
  for (const en of String(t['英文名称'] || '').split(/[,/]/)) {
    const e = en.trim().toLowerCase();
    if (e) known.add(e);
  }
  for (const w of Array.isArray(t['错误写法']) ? t['错误写法'] : []) {
    if (w) wrongForms.set(w.toLowerCase(), canon);
  }
}

// ---------- 噪声词 ----------
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'when', 'then',
  'than', 'there', 'these', 'those', 'you', 'your', 'can', 'will', 'may', 'must',
  'should', 'have', 'has', 'are', 'was', 'were', 'not', 'but', 'all', 'any',
  'use', 'used', 'using', 'see', 'also', 'only', 'more', 'most', 'other', 'such',
  'each', 'some', 'same', 'about', 'after', 'before', 'below', 'above', 'between',
  'example', 'examples', 'note', 'notes', 'tip', 'tips', 'caution', 'warning',
  'info', 'option', 'options', 'value', 'values', 'file', 'files', 'path', 'paths',
  'line', 'lines', 'type', 'types', 'mode', 'modes', 'default', 'support',
  'supported', 'version', 'versions', 'name', 'names', 'number', 'numbers',
  'first', 'second', 'third', 'next', 'last', 'total', 'count', 'time', 'times',
  'step', 'steps', 'run', 'make', 'see', 'show', 'shows', 'output', 'input',
  // 单位
  'ms', 'ns', 'us', 's', 'fps', 'hz', 'khz', 'mhz', 'ghz', 'px', 'bit', 'bits',
  'byte', 'bytes', 'kb', 'mb', 'gb', 'tb', 'mbps', 'gbps',
  // 文件后缀 / 常见代码词
  'md', 'sh', 'py', 'js', 'ts', 'json', 'yaml', 'yml', 'c', 'h', 'cpp', 'hpp',
  'deb', 'bin', 'raw', 'yuv', 'h264', 'h265', 'jpeg', 'mjpeg', 'nv12', 'yuyv',
  'makefile', 'true', 'false', 'null', 'none', 'auto', 'ok', 'fail', 'failed'
]);

// 已是行业通用接口词且词库已收的，不重复提（known 已覆盖，这里只是标明意图）
const NOISE_RE = [
  /^\d+$/, // 纯数字
  /^0x[0-9a-f]+$/i, // 十六进制
  /^\d+(?:\.\d+)?[a-z]+$/i, // 12fps 之类
];

function isNoise(tok) {
  if (tok.length < 3) return true;
  if (STOPWORDS.has(tok.toLowerCase())) return true;
  if (NOISE_RE.some((r) => r.test(tok))) return true;
  return false;
}

// ---------- 文件遍历 ----------
function walk(p, out) {
  let st;
  try { st = fs.statSync(p); } catch { return; }
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) {
      if (name === 'node_modules' || name === '.git' || name === '.docusaurus') continue;
      walk(path.join(p, name), out);
    }
  } else if (/\.mdx?$/i.test(p)) {
    out.push(p);
  }
}

const files = [];
for (const p of paths) walk(p, files);

// ---------- 解析 ----------
function toProse(text) {
  // 去 fenced code
  text = text.replace(/```[\s\S]*?```/g, ' ');
  // 去行内代码
  text = text.replace(/`[^`\n]*`/g, ' ');
  // 去 URL
  text = text.replace(/https?:\/\/\S+/g, ' ');
  // 去文件路径式 token
  text = text.replace(/(?:\.{0,2}\/)[\w./-]+/g, ' ');
  // 去 HTML 标签，及跨行标签残留的属性片段（className="..." / style={{...}}）
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\b[\w-]+="[^"]*"/g, ' ');
  text = text.replace(/\b[\w-]+=\{[^}]*\}/g, ' ');
  return text;
}

// 汉字 + 中文标点（（）、，。：等）：中英混排时贴着它才算「中文语境」
const CJK_ANY = /[　-〿一-鿿＀-￯]/;
const hasCJK = (s) => CJK_ANY.test(s);

// token 左右 4 字符内是否有中文，用来挡掉纯英文表格头与英文行
function inChineseContext(prose, index, len) {
  return hasCJK(prose.slice(Math.max(0, index - 4), index)) ||
    hasCJK(prose.slice(index + len, index + len + 4));
}

// 聚合：小写 word → { variants: Map(原形→次数), count, files:Set, sample }
const stats = new Map();
const wrongHits = new Map(); // 标准写法 → { count, files:Set, sample }

function add(key, surface, file, lineNo, line) {
  let s = stats.get(key);
  if (!s) {
    s = { variants: new Map(), count: 0, files: new Set(), sample: `${path.basename(file)}:${lineNo}  ${line.trim().slice(0, 120)}` };
    stats.set(key, s);
  }
  s.variants.set(surface, (s.variants.get(surface) || 0) + 1);
  s.count += 1;
  s.files.add(file);
}

let scannedZh = 0;
let scannedEn = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const isZh = hasCJK(raw);
  if (isZh) scannedZh++; else scannedEn++;
  if (!isZh && !includeEn) continue;

  const lines = raw.split('\n');
  let inFence = false;
  lines.forEach((line, idx) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const prose = toProse(line);

    // 英文文档默认只提大写多词短语
    if (!isZh) {
      const phrases = prose.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
      for (const ph of phrases) {
        if (isNoise(ph)) continue;
        const key = ph.toLowerCase();
        if (wrongForms.has(key)) {
          const canon = wrongForms.get(key);
          if (!wrongHits.has(canon)) wrongHits.set(canon, { count: 0, files: new Set(), sample: `${path.basename(file)}:${idx + 1}  ${line.trim().slice(0, 120)}` });
          const w = wrongHits.get(canon); w.count++; w.files.add(file);
          continue;
        }
        if (!known.has(key)) add(key, ph, file, idx + 1, line);
      }
      return;
    }

    // 中文文档：只提「夹在中文里」的英文 token
    const re = /[A-Za-z][A-Za-z0-9]*/g;
    let m;
    while ((m = re.exec(prose)) !== null) {
      const tok = m[0];
      if (isNoise(tok)) continue;
      if (!inChineseContext(prose, m.index, tok.length)) continue;
      const key = tok.toLowerCase();
      if (wrongForms.has(key)) {
        const canon = wrongForms.get(key);
        if (!wrongHits.has(canon)) wrongHits.set(canon, { count: 0, files: new Set(), sample: `${path.basename(file)}:${idx + 1}  ${line.trim().slice(0, 120)}` });
        const w = wrongHits.get(canon); w.count++; w.files.add(file);
        continue;
      }
      if (known.has(key)) continue;
      add(key, tok, file, idx + 1, line);
    }
  });
}

// ---------- 结果 ----------
const rows = [];
for (const [key, s] of stats) {
  if (s.count < minCount || s.files.size < minFiles) continue;
  const variants = [...s.variants.entries()].sort((a, b) => b[1] - a[1]);
  const surfaceForms = new Set(variants.map(([v]) => v));
  // 少数写法占比：RDK 530 / rdk 5 → 1%，多半是代码或路径，不必收编；
  // MIPI 169 / mipi 104 → 38%，是真正的不一致。
  const minority = 1 - variants[0][1] / s.count;
  rows.push({
    key,
    variants,
    variantCount: surfaceForms.size,
    count: s.count,
    files: s.files.size,
    minority,
    sample: s.sample,
  });
}

// A: 大小写不一致；B: 其他候选
// A 按「出现次数 × 少数写法占比」排，把真正混用的词顶上来
const caseRows = rows.filter((r) => r.variantCount > 1)
  .sort((a, b) => b.count * b.minority - a.count * a.minority);
const plainRows = rows.filter((r) => r.variantCount === 1).sort((a, b) => b.files - a.files || b.count - a.count);

function variantText(r) {
  return r.variants.map(([v, c]) => `\`${v}\`×${c}`).join(' / ');
}

const fmt = (n) => String(n);
const lines = [];
lines.push('# 术语候选扫描报告');
lines.push('');
lines.push(`- 扫描文件：${files.length} 个（中文 ${scannedZh} / 英文 ${scannedEn}）`);
lines.push(`- 阈值：出现 ≥ ${minCount} 次且覆盖 ≥ ${minFiles} 个文件`);
lines.push(`- 已收录术语：${glossary.length} 条`);
lines.push('');
lines.push('> 候选仅供「提案」参考：按 CONTRIBUTING §术语表，TW 提 PR、IA 定稿、研发确认事实。');
lines.push('');

lines.push(`## A. 大小写不一致（${caseRows.length} 组，优先收编）`);
lines.push('');
if (caseRows.length === 0) lines.push('无。');
else {
  lines.push('| 归一 | 写法分布 | 合计 | 文件数 | 失衡 | 示例 |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const r of caseRows.slice(0, topN)) lines.push(`| ${r.key} | ${variantText(r)} | ${fmt(r.count)} | ${fmt(r.files)} | ${Math.round(r.minority * 100)}% | ${r.sample} |`);
  if (caseRows.length > topN) lines.push(`| … | | | | | 其余 ${caseRows.length - topN} 组见 JSON |`);
}
lines.push('');

lines.push(`## B. 高频未收录词（${plainRows.length} 个）`);
lines.push('');
if (plainRows.length === 0) lines.push('无。');
else {
  lines.push('| 候选 | 出现 | 文件数 | 示例 |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const r of plainRows.slice(0, topN)) lines.push(`| \`${r.variants[0][0]}\` | ${fmt(r.count)} | ${fmt(r.files)} | ${r.sample} |`);
  if (plainRows.length > topN) lines.push(`| … | | | 其余 ${plainRows.length - topN} 个见 JSON |`);
}
lines.push('');

lines.push(`## C. 词库错误写法命中（${wrongHits.size} 条）`);
lines.push('');
if (wrongHits.size === 0) lines.push('无。');
else {
  lines.push('| 标准写法 | 命中次数 | 文件数 | 示例 |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const [canon, w] of [...wrongHits.entries()].sort((a, b) => b[1].count - a[1].count)) {
    lines.push(`| ${canon} | ${fmt(w.count)} | ${fmt(w.files.size)} | ${w.sample} |`);
  }
}
lines.push('');

const report = lines.join('\n');
if (mdOut) fs.writeFileSync(mdOut, report + '\n', 'utf8');
else process.stdout.write(report + '\n');

if (jsonOut) {
  const payload = {
    $comment: '由 scripts/scan-term-candidates.js 生成。候选仅用于 glossary 提案，不自动入库。',
    scanned: { files: files.length, zh: scannedZh, en: scannedEn, minCount, minFiles },
    caseVariants: caseRows.map((r) => ({ key: r.key, variants: Object.fromEntries(r.variants), count: r.count, files: r.files, minority: Math.round(r.minority * 100) / 100, sample: r.sample })),
    candidates: plainRows.map((r) => ({ term: r.variants[0][0], count: r.count, files: r.files, sample: r.sample })),
    wrongFormHits: [...wrongHits.entries()].map(([canon, w]) => ({ canonical: canon, count: w.count, files: w.files.size, sample: w.sample })),
  };
  fs.writeFileSync(jsonOut, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
