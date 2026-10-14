---
name: draft-doc
version: "1.0"
category: 文档生产
description: 初稿生成：给背景/参考信息，按模板+写作规范+术语表写一份标准初稿，写完自动跑 4 个自检 skill 修到全绿。面向写初稿方（研发/AE/产品/TW）。
---

# draft-doc — 初稿生成

给背景/参考信息，产出符合团队规范的标准初稿。你是「写初稿方」的加速器：读模板、写作规范、术语表三份 SSOT 写初稿，写完调 4 个自检 skill 修，交一份规则上干净的初稿 + 待补清单。

## 触发方式

一句话，自由格式，不用填表。例如：

- 「写一篇 XBurn 烧录 RDK S100 的快速入门，走 USB 线烧。」
- 「把这份背景写成 how-to：给 S600 配 TROS 语音管线，材料见下面的链接。」

缺的信息你问，别卡着等；定不了的事实写 `TODO:`，不编。

## 工作流程

1. **定类型**：按 Diátaxis 五选一（见下表），定不了就问一句。
2. **问最小必要信息**：只问「定骨架所必需」的（产品/设备、文档类型、目标读者、关键前提）。能推断的推断，其余缺的写 `TODO:`。
3. **读三份 SSOT**：对应模板（骨架）+ `writing-style-guide.md` 相关章节 + `glossary.json` 涉及术语的标准写法。
4. **写初稿**：按模板骨架填。给的事实写实；没给的写 `TODO: 缺什么`；截图用 OSS 占位路径。
5. **调自检 skill 修**：按文档类型跑 `format-check` / `step-check` / `structure-check` / `term-check`（见下表），把可修的 ❌ 修掉——术语、空格、标题、列表、图片缩进、frontmatter。`structure-check` 报的 `TODO` 是故意留下的待补项，**不修**，汇总进待补清单。
6. **出稿**：交「除 TODO 外全绿」的初稿 + 文末待补清单。

## 选模板

| 文档类型 | 模板文件 | 何时用 |
|---|---|---|
| 快速入门 | `doc-templates/quick-start.md` | 从零到跑通的最短路径 |
| 操作指南 | `doc-templates/how-to-guide.md` | 已会基础，完成一个具体任务 |
| 功能概述 | `doc-templates/feature-overview.md` | 介绍功能/概念全貌，无操作步骤 |
| 故障排查 | `doc-templates/troubleshooting.md` | 按现象排查、根因分析 |
| 发布说明 | `doc-templates/release-notes.md` | 版本变更、新特性、已知问题 |

## 读三份 SSOT（读，不抄进本 skill）

- `doc-templates/<对应模板>.md` —— 骨架和章节顺序
- `writing-style-guide.md` —— 操作类重点 §7 步骤写法 / §7.3 列表，其余按文档类型读相关章节
- `glossary.json` —— 涉及术语一律查「标准写法」，别凭记忆写

## 调 4 个自检 skill（调，不抄规则）

| Skill | 什么时候跑 |
|---|---|
| `format-check` | 通用（中英文间距、代码块、链接、图片） |
| `term-check` | 通用（对照 glossary） |
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
- `structure-check` 已在拦 `TODO`——这是**故意留下、显式记账**的待补项，不算「要修掉的 ❌」；由文末待补清单兜住，发布前研发补完、清掉 TODO 才算真全绿。

## 待补清单（初稿文末临时附录，发布前删）

把正文所有 `TODO` 汇总，按三类分组：

```markdown
## 待补清单

### 事实待补
- [ ] TODO: XBurn 版本号 ≥ ?
- [ ] TODO: 烧录镜像下载地址

### 术语待入库
- [ ] 「安全启动」未在 glossary，需走术语治理入库

### 需研发确认
- [ ] TODO: 步骤二支持哪些产品类型
```

## 输出

交两样东西：

1. **初稿**：除 `TODO` 外，4 个自检 skill 全绿。
2. **待补清单**：文末附录，列全所有 `TODO` 及其分组，让研发一眼看清还缺什么。

> 你交的是「初稿」，不是「可发布稿」——技术准确性由研发兜底，TODO 由研发填，QA 实测、人审一个不少。
