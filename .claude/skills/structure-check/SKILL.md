---
name: structure-check
version: "1.0"
category: 文档质量
description: 结构自检：检查标题层级、H1 唯一性、占位符残留、模板对齐。当研发写完文档、提 PR 前使用本 skill 检查文档结构。
---

# structure-check — 结构自检

检查文档的结构完整性，确保符合模板规范。

## 检查规则

以下规则与 GitHub CI 的 custom-checks 保持一致——本地跑过，CI 不会在这里挂。CI 不覆盖的项（标题层级/模板对齐）是 skill 独有的增值检查。

### 文件名/目录名（与 CI `check-filenames.sh` 一致）

- 文件名和目录名必须 lower-kebab-case：`quick-start.md` ✅，`Quick_Start.md` ❌
- 数字前缀允许：`01_quick_start.md` ✅（Docusaurus 自动剥离数字前缀生成 URL）

### frontmatter 完整性（与 CI `check-frontmatter.js` 一致）

- 必须有 `title`
- 建议有 `description`
- 不要有 `slug`（Docusaurus 用文件名自动生成 URL）

### 占位符（与 CI `check-placeholder.sh` 一致）

- 不允许残留占位符：`TODO` / `FIXME` / `XXX` / `待补充` / `待确认` / `TBD` / `📷`
- 如果有，输出行号和占位符内容

### 标题层级（CI 不覆盖，skill 独有）

- H1 只能有一个（文档标题）
- 标题层级不能跳——H2 下面不能直接 H4
- 标题不要用 emoji（如 `🚀` `✅`）

### 模板对齐（CI 不覆盖，skill 独有）

- 检查文档是否按模板组织（对比 `doc-templates/` 下对应模板的章节结构）
- 如果缺少模板要求的必填章节，标记出来

### 列表类型（CI 不覆盖，skill 独有）

- 有先后顺序（先做 A 再做 B）的正文步骤用有序列表 `1.` `2.` `3.`，不用无序列表；分阶段子标题用「步骤一/二/三」显先后（见 writing-style-guide §7.3）
- 「步骤一/二/三」作标题须一页内全局唯一，不重复出现同一个「步骤一」（重复会撞 github-slugger 锚点、页内跳转失准；MD024 不在 CI，靠 skill 兜）
- 并列、无先后、多选一的内容用无序列表 `-`，不用有序列表
- 不要把「先 A 后 B」写成并列无序项（读者会以为二选一），也不要把「二选一」写成编号步骤
- `- [ ]` 复选框只用于「待办/前置检查」这类要读者逐项确认的清单；陈述性内容（如「操作结果」的终态）用普通 `-`，不用复选框

## 忽略

- 代码块内的内容

## 输出示例

```text
✅ structure-check 通过，未发现结构问题。
```

```text
❌ structure-check 发现 3 处结构问题：

  1: 缺少 frontmatter title
  25: 标题层级跳跃 H2 → H4（缺少 H3）
  42: 残留占位符 "待补充"
```