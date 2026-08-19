---
name: structure-check
version: "1.0"
category: 文档质量
description: 结构自检：检查标题层级、H1 唯一性、占位符残留、模板对齐。当研发写完文档、提 Gerrit Change 前使用本 skill 检查文档结构。
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