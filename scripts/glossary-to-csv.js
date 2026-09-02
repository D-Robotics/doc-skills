#!/usr/bin/env node
/**
 * glossary.json → CSV 转换脚本(两种导出模式,同一数据源)
 *
 * 单一事实来源是 glossary.json,本脚本是它的下游派生态(见
 * doc-standards-standard-instance-consistency):改术语只改 JSON,重跑本脚本
 * 即可重生成 CSV,不手动维护第二份。
 *
 * 模式:
 *  (默认)CAT 模式 —— 6 列精简版,供 CAT 工具(Crowdin/memoQ/Trados)导入术语库。
 *      字段映射 ISO 12620 兼容方向:
 *        标准写法 → Source / 英文名称 → Target / 释义 → Definition
 *        上下文例句 → Context / 适用范围 → Subject Field
 *        全称+简称+错误写法+备注 → 合并进 Notes 一列供译员参考
 *      注意:CAT 模式整列丢掉 分类/来源/研发确认/状态,只服务翻译,不作团队浏览。
 *
 *  --feishu 飞书模式 —— 8 列精简版,供飞书多维表格导入,团队按分类筛选用。
 *      列:分类/标准写法/错误写法/英文名称/全称/释义/上下文例句/备注。
 *      去掉适用范围(与分类重复)、研发确认+状态(飞书展的都是已确认的)、简称(全 31 条已清空,信息归英文名称+全称)。
 *      `错误写法`(JSON 数组)导出为逗号分隔的正文文本(不按换行做多选,
 *      团队看得到"别这么写"的提醒即可,不占多选字段)。分类列在飞书端
 *      设为单选/多选字段即可按分类筛。
 *      单向派生:飞书表是只读视图,改术语只改 JSON 再重推,不在飞书端反向编辑。
 *
 * 用法:
 *   node scripts/glossary-to-csv.js                          # CAT 6 列 → stdout
 *   node scripts/glossary-to-csv.js -o cat.csv               # CAT 6 列 → 文件
 *   node scripts/glossary-to-csv.js --feishu                 # 飞书 8 列 → stdout
 *   node scripts/glossary-to-csv.js --feishu -o feishu.csv   # 飞书 8 列 → 文件
 *
 * 无外部依赖,纯 Node 标准库。
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- 参数 ----------
const args = process.argv.slice(2);
let outPath = null;
let feishu = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') {
    outPath = args[i + 1];
    i++;
  } else if (args[i] === '--feishu') {
    feishu = true;
  }
}

// ---------- 路径 ----------
const ROOT = path.resolve(__dirname, '..');
const GLOSSARY_JSON = path.join(ROOT, 'glossary.json');

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

// ---------- CSV 转义 ----------
// RFC 4180:含逗号/双引号/换行的字段用双引号包裹,字段内双引号转义为两个双引号
function csvField(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// 合并附注字段(全称/简称/错误写法)成一列,译员参考
function buildNotes(term) {
  const parts = [];
  if (term['全称']) parts.push(`全称: ${term['全称']}`);
  if (term['简称']) parts.push(`简称: ${term['简称']}`);
  if (Array.isArray(term['错误写法']) && term['错误写法'].length) {
    parts.push(`错误写法(勿用): ${term['错误写法'].join(' / ')}`);
  }
  if (term['备注']) parts.push(term['备注']);
  return parts.join(' | ');
}

// ---------- 飞书模式:8 列精简 ----------
// 列:分类/标准写法/错误写法/英文名称/全称/释义/上下文例句/备注。
// 去掉 适用范围(与分类重复)/研发确认+状态(飞书展的都是已确认的)/简称(全 31 条已清空,信息归英文名称+全称)。
// `错误写法` 数组按逗号连成正文文本(不做多选),分类列在飞书端设单选/多选筛。
const FEISHU_HEADER = [
  '分类',
  '标准写法',
  '错误写法',
  '英文名称',
  '全称',
  '释义',
  '上下文例句',
  '备注',
];

const FEISHU_FIELDS = [
  '分类',
  '标准写法',
  '英文名称',
  '全称',
  '释义',
  '上下文例句',
  '备注',
];

function feishuRow(term) {
  const cells = FEISHU_FIELDS.map((k) => term[k] || '');
  // `错误写法` 是数组,插在「标准写法」之后(第 3 列),按逗号连成正文文本
  const wrongForms = Array.isArray(term['错误写法']) ? term['错误写法'].join(', ') : '';
  cells.splice(2, 0, wrongForms);
  return cells;
}

// ---------- 表头 ----------
// CAT 模式:列名用英文(部分 CAT 工具按列名识别),括号注中文便于人工核对
const CAT_HEADER = [
  'Source (标准写法)',
  'Target (英文名称)',
  'Definition (释义)',
  'Context (上下文例句)',
  'Subject Field (适用范围)',
  'Notes (附注)',
];

const header = feishu ? FEISHU_HEADER : CAT_HEADER;
const rows = [header.map(csvField).join(',')];

// ---------- 数据行 ----------
let skipped = 0;
glossary.forEach((term) => {
  const source = term['标准写法'];
  if (!source) {
    skipped++;
    return;
  }
  if (feishu) {
    rows.push(feishuRow(term).map(csvField).join(','));
  } else {
    const row = [
      source,
      term['英文名称'] || '',
      term['释义'] || '',
      term['上下文例句'] || '',
      term['适用范围'] || '',
      buildNotes(term),
    ];
    rows.push(row.map(csvField).join(','));
  }
});

// ---------- BOM + 输出 ----------
// 加 UTF-8 BOM,防 Excel 打开中文乱码(CAT 工具一般不挑 BOM)
const csv = '﻿' + rows.join('\r\n') + '\r\n';

const modeLabel = feishu ? '飞书(8 列精简)' : 'CAT(6 列精简)';

if (outPath) {
  fs.writeFileSync(outPath, csv, 'utf8');
  console.log(`✓ 导出 ${glossary.length - skipped} 条术语 [${modeLabel}] → ${outPath}`);
  if (skipped) console.log(`  (跳过 ${skipped} 条无标准写法的条目)`);
} else {
  process.stdout.write(csv);
  if (skipped) console.error(`\n(跳过 ${skipped} 条无标准写法的条目)`, process.stderr);
}
