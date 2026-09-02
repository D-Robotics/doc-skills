#!/usr/bin/env node
// 校验 glossary.json 结构：必填字段、枚举值、主键唯一性。
// 无第三方依赖，仅用 Node 内置。CI 与本地均可 `node scripts/check-glossary.js` 跑。
// 权威 schema 见 glossary.schema.json；本脚本是它的轻量落地（免 ajv 依赖）。

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'glossary.json');

const REQUIRED = ['分类', '标准写法', '英文名称', '释义', '来源', '研发确认'];
const ENUM_分类 = ['行业通用', '产品命名'];
const ENUM_研发确认 = ['✅', '❌', '待确认', '行业'];
const ENUM_状态 = ['现行', '草案', '待确认'];

const errors = [];

let data;
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error(`✗ glossary.json 不是合法 JSON：${e.message}`);
  process.exit(1);
}

if (!data || typeof data !== 'object' || !Array.isArray(data.glossary)) {
  console.error('✗ 顶层必须是 { "glossary": [...] }');
  process.exit(1);
}

const entries = data.glossary;
const seen = new Set();

entries.forEach((e, i) => {
  const key = e && e['标准写法'];
  const loc = `#${i + 1}「${key || '(缺标准写法)'}」`;

  for (const k of REQUIRED) {
    if (e[k] === undefined || e[k] === null || String(e[k]).trim() === '') {
      errors.push(`${loc}：缺必填字段「${k}」`);
    }
  }

  if (e['分类'] !== undefined && !ENUM_分类.includes(e['分类'])) {
    errors.push(`${loc}：「分类」=${JSON.stringify(e['分类'])} 非法，须为 ${ENUM_分类.join(' / ')}`);
  }
  if (e['研发确认'] !== undefined && !ENUM_研发确认.includes(e['研发确认'])) {
    errors.push(`${loc}：「研发确认」=${JSON.stringify(e['研发确认'])} 非法，须为 ${ENUM_研发确认.join(' / ')}`);
  }
  if (e['状态'] !== undefined && e['状态'] !== '' && !ENUM_状态.includes(e['状态'])) {
    errors.push(`${loc}：「状态」=${JSON.stringify(e['状态'])} 非法，须为 ${ENUM_状态.join(' / ')}`);
  }

  if (key) {
    if (seen.has(key)) {
      errors.push(`${loc}：标准写法「${key}」重复（主键必须唯一）`);
    }
    seen.add(key);
  }

  if (e['错误写法'] !== undefined && (!Array.isArray(e['错误写法']) || e['错误写法'].some(x => typeof x !== 'string'))) {
    errors.push(`${loc}：「错误写法」须为字符串数组`);
  }
});

if (errors.length) {
  console.error(`✗ glossary.json 校验未通过，${errors.length} 个问题：`);
  for (const m of errors) console.error('  - ' + m);
  process.exit(1);
}

console.log(`✓ glossary.json 校验通过（${entries.length} 条术语，主键唯一、必填字段与枚举齐全）`);
