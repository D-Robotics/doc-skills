---
name: draft-doc
version: "1.0"
category: 文档质量
description: 初稿生成：给背景/参考信息，按模板+写作规范+术语表写一份标准中文初稿，写完自动跑 4 个自检 skill 修正。面向写初稿方（研发/AE/产品/TW）。
---

# draft-doc — 初稿生成

给背景/参考信息，产出符合团队规范的标准**中文初稿**。你是「写初稿方」的加速器：读模板、写作规范、术语表三份 SSOT 写初稿，写完调 4 个自检 skill 修，交一份规则上干净的草稿 + 待补清单。

> 本 skill 只出中文初稿。英文稿 / 中译英走 TW 线和 `en-check`，不在本 skill 范围。

## 触发方式

一句话，自由格式，不用填表。例如：

- 「写一篇 XBurn 烧录 RDK S100 的快速入门，走 USB 线烧。」
- 「把这份背景写成 how-to：给 S600 配 TROS 语音管线，材料见下面的链接。」

缺的信息你问，别卡着等；定不了的事实写 `TODO:`，不编。

## 工作流程

1. **定类型**：按 Diátaxis 五选一（见下表），定不了就问一句。
2. **问最小必要信息**：只问「定骨架所必需」的（产品/设备、文档类型、目标读者、关键前提）。能推断的推断，其余缺的写 `TODO:`。
3. **读三份 SSOT**：对应模板（骨架）+ `writing-style-guide.md` 相关章节 + `glossary.json` 涉及术语的标准写法。
4. **写初稿**：按模板骨架填。给的事实写实；没给的写 `TODO: 缺什么`；截图用 OSS 占位路径（路径里的 `【product】`/`【大类】`/`【步骤.png】` 是官方占位，保留）；模板里没填的正文 `【】` 占位转成 `TODO:`，不留原样。
5. **调自检 skill 修**：按文档类型跑 `format-check` / `step-check` / `structure-check` / `term-check`（见下表），把可修的 ❌ 修掉——术语、空格、标题、列表、图片缩进、frontmatter。`structure-check` 报的 `TODO` 不修，**记进待补清单**。
6. **出稿**：交「带 TODO 的草稿 + 待补清单」。这是**草稿**，没过门禁，不提交、不进 PR。

## 选模板

| 文档类型 | 模板文件 | 何时用 |
|---|---|---|
| 快速入门 | [`quick-start.md`](../../../doc-templates/quick-start.md) | 从零到跑通的最短路径 |
| 操作指南 | [`how-to-guide.md`](../../../doc-templates/how-to-guide.md) | 已会基础，完成一个具体任务 |
| 功能概述 | [`feature-overview.md`](../../../doc-templates/feature-overview.md) | 介绍功能/概念全貌，无操作步骤 |
| 故障排查 | [`troubleshooting.md`](../../../doc-templates/troubleshooting.md) | 按现象排查、根因分析 |
| 发布说明 | [`release-notes.md`](../../../doc-templates/release-notes.md) | 版本变更、新特性、已知问题 |

## 读三份 SSOT（读，不抄进本 skill）

以下路径都相对 **doc-skills 仓根**（skill 位于 `.claude/skills/draft-doc/`，用 `../../../` 上跳三层到仓根）：

- [`doc-templates/`](../../../doc-templates/) —— 骨架和章节顺序
- [`writing-style-guide.md`](../../../writing-style-guide.md) —— 操作类重点 §7 操作类文档写法 / §7.3 步骤带操作顺序，其余按文档类型读相关章节
- [`glossary.json`](../../../glossary.json) —— 涉及术语一律查「标准写法」，别凭记忆写

## 调 4 个自检 skill（调，不抄规则）

| Skill | 什么时候跑 |
|---|---|
| `format-check` | 通用（中英文间距、代码块、链接、图片） |
| `term-check` | 通用（对照 glossary + writing-style-guide §7.12 口语表） |
| `structure-check` | 通用（标题层级、frontmatter、模板对齐、占位符） |
| `step-check` | 仅操作类（how-to / quick-start）；功能概述 / 发布说明不跑 |

规则只住在这些 skill 里，本 skill 不复制。跑完拿 ❌ 回来修，修完重跑。

## 反幻觉纪律（写的时候每一条都守）

- **没给的写 `TODO: 缺什么`，绝不编。** 版本号、命令、路径、参数、界面文字、性能数据、支持列表——只要背景/参考里没给，就写 `TODO:`，不猜一个填进去。
- **术语查 glossary，不凭记忆。** 标准写法以 `glossary.json` 为准；不在表里的概念，标 `TODO: 「术语」待入库`，不擅自用新叫法。
- **截图不编。** 用模板里的 OSS 占位路径（`https://rdk-doc.oss-cn-beijing.aliyuncs.com/doc/img/【product】/【大类】/【步骤.png】`），图由研发后补。
- **写实不写虚。** 拒绝「适当调整」「建议」「一般」这类模糊表述，写具体数值/范围（见 step-check 模糊表述规则）。

## TODO 约定

- 格式：`TODO: 缺什么`（带提示，不写光秃秃 `TODO`），例如 `TODO: XBurn 版本号 ≥ ?`。
- `TODO` 是**草稿阶段专用标记**。`structure-check` 和文档仓 CI（`check-placeholder.sh`）都会拦 `TODO`——这是**安全网，不是障碍**：带 TODO 的草稿本来就该进不了 PR。草稿阶段随便留，**提交 / 建 PR 前必须清零**。
- 研发补完事实、清掉 TODO，再过 `structure-check` 才是真全绿。draft-doc 交的带 TODO 稿是**草稿**，不是可提交稿。

## 交付前自检（写完后逐条过）

- 正文除图片 OSS 占位路径外 `grep 【` 必须**清零**——模板里没填的 `【】` 要么填实、要么转成 `TODO:`，不能原样残留（`structure-check` / CI 都不拦 `【】`，只能靠这一步清；图片 src 里的 `【product】`/`【大类】`/`【步骤.png】` 是官方占位，不算残留）。
- 正文除 `TODO` 外，4 个自检 skill 全绿。
- 待补清单见下，**不写进正文**。

## 待补清单（对话输出 / 单独文件交付，不进正文）

把正文所有 `TODO` 汇总，按「谁来补」分组，作为对话输出或单独文件交付——**不写进文档正文**，正文严格对齐模板：

```markdown
## 待补清单

### 研发补
- [ ] TODO: XBurn 版本号 ≥ ?
- [ ] TODO: 烧录镜像下载地址
- [ ] TODO: 步骤二支持哪些产品类型

### 术语治理（待入 glossary，走提案 → 定稿 → 入库）
- [ ] TODO: 「安全启动」未在 glossary，需走术语治理入库
```

## 输出

交两样东西：

1. **草稿**：正文除 `TODO` 外 4 个自检 skill 全绿，且除图片 OSS 占位路径外无残留 `【】`。
2. **待补清单**：作为对话输出或单独文件，列全所有 `TODO` 按「谁来补」分组，让研发一眼看清还缺什么。

> 你交的是「初稿」，不是「可发布稿」——技术准确性由研发兜底，TODO 由研发填，QA 实测、人审一个不少。
