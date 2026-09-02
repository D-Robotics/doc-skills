# doc-skills

D-Robotics 文档团队共享的**写作工具链与规范**，面向团队所有手册作者 + 计算机辅助翻译（CAT）。

## 内容

| 路径 | 说明 |
| --- | --- |
| `.claude/skills/` | 7 个文档质量检查 skill（format / step / structure / term / en / zh-en-parity / ai-review），Claude Code 原生 `/skill` 调用，Copilot / Cursor 用规则文件复用 |
| `glossary.json` | 术语表单一事实来源（SSOT），喂 term-check / CAT 翻译记忆 / MCP 检索 / Vale |
| `glossary.schema.json` | 术语表 schema（字段与枚举定义） |
| `doc-templates/` | 5 份 Diátaxis 文档模板（feature-overview / how-to / quick-start / release-notes / troubleshooting） |
| `writing-style-guide.md` / `-en.md` | 中英文写作规范 |

## 协作

改动统一走 **GitHub PR**，main 分支受保护：需 PR + 至少 1 个 approval + CI 通过，禁止直接 push main。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 术语表（glossary.json）治理

`查 / 提案 / 定稿` 三档：TW 提案、IA 定稿、研发确认事实。详见 [CONTRIBUTING.md](CONTRIBUTING.md) §术语表。
