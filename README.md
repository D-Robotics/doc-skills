# doc-skills

D-Robotics 文档团队共享的**写作工具链与规范**，面向团队所有手册作者 + 计算机辅助翻译（CAT）。

## 内容

| 路径 | 说明 |
| --- | --- |
| `.claude/skills/` | 1 个初稿生成 skill（draft-doc）+ 7 个文档质量检查 skill（format / step / structure / term / en / zh-en-parity / ai-review），Claude Code 原生 `/skill` 调用，Copilot / Cursor 用规则文件复用 |
| `glossary.json` | 术语表单一事实来源（SSOT），喂 term-check / MCP 检索 / Vale |
| `glossary.schema.json` | 术语表 schema（字段与枚举定义） |
| `scripts/` | glossary 校验（check-glossary.js）+ 检索别名派生（喂 rdk-docs-mcp）+ 候选扫描（scan-term-candidates.js） |
| `doc-templates/` | 5 份 Diátaxis 文档模板（feature-overview / how-to / quick-start / release-notes / troubleshooting） |
| `writing-style-guide.md` / `-en.md` | 中英文写作规范（完整版） |
| `writing-baseline-rd.md` | 研发侧必守基线，从写作规范中挑出的子集，给研发 / AE 写初稿用 |

## 中英文分工

- **`draft-doc` 只出中文初稿**，不生成英文稿，也不做中译英。
- 英文产出走 TW 线：**中文定稿 → 翻译 → `en-check`（英文写作规范）→ `zh-en-parity`（中英结构对等）**。两个 skill 只做检查，不生成初稿。
- 所以写初稿方（研发 / AE / 产品）只需 `draft-doc` + 4 个自检 skill；碰到英文由 TW 接手。

## 协作

改动统一走 **GitHub PR**，main 分支受保护：需 PR + 至少 1 个 approval + CI 通过，禁止直接 push main。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 术语表（glossary.json）治理

`查 / 提案 / 定稿` 三档：TW 提案、IA 定稿、研发确认事实。详见 [CONTRIBUTING.md](CONTRIBUTING.md) §术语表。
