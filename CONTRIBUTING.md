# 贡献指南

本仓库改动统一走 **GitHub PR**，main 分支受保护：需 PR + 至少 1 个 approval + CI 通过，禁止直接 push main。

## 提交流程

1. 从 main 切分支：`docs/<主题>` 或 `fix/<主题>`。
2. 只 `git add <具体文件>`，不用 `git add .`；永远不在 main 上直接改。
3. push 远端后 `gh pr create`（target main）。
4. **squash 合入**（多 commit 压成一个），合入后删本地 + 远端分支。

## 术语表（glossary.json）治理：查 / 提案 / 定稿 三档

glossary.json 是术语 SSOT，喂 term-check / CAT 翻译记忆 / MCP 检索 / Vale 四条链路——写错一条全链路一起错，所以分三档：

| 动作 | 谁 | 通道 |
| --- | --- | --- |
| 查 | 任何人 | 直接查 |
| 提案（新增术语 / 改英文名称 / 补错误写法） | 任何人都可，TW 尤其积极（翻译一线天天撞新词） | 开 PR；`研发确认` 未定的填「待确认」或「❌」 |
| 定稿（标准写法 / 释义 / 研发确认落定） | IA | PR review；CODEOWNERS 强制 IA 审 glossary.json |

**规则**：

- `研发确认` 是必填字段。事实口径（版本号 / 波特率 / 型号等）必须研发点头，否则填「待确认」或「❌」，不臆造。
- 标准写法是主键，必须唯一。
- 改 glossary.json 前本地跑 `node scripts/check-glossary.js`，过不了 CI 不会放行。
- 改完 glossary.json 需重跑派生脚本，保持 CSV / 检索别名同步：

  ```bash
  node scripts/glossary-to-csv.js -o scripts/glossary.csv
  node scripts/glossary-aliases.js
  ```
