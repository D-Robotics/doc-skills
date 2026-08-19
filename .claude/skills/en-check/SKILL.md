---
name: en-check
version: "1.0"
category: 文档质量
description: 英文自检：对照 glossary 和 writing-style-guide-en 检查英文文档的术语一致性、标题类型、sentence case、语态。当写完英文文档、提 PR 前使用本 skill 检查英文写作规范。
---

# en-check — 英文自检

检查英文文档的写作规范，确保术语、标题、大小写、语态一致。

## 检查规则

### 术语一致性

- 所有专有名词和术语必须与 [glossary.json](../../glossary.json) 的 `英文名称` 字段一致
- 常见错误：`microSD` 写成 `Micro SD`、`eMMC` 写成 `EMMC`、`Xburn` 写成 `XBurn`
- 工具名：`XBurn`（非 `xburn`）、`Rufus`（首字母大写）、`RDK Studio`（带空格）、`MobaXterm`（M+X 大写）
- 产品名：`RDK X5`、`RDK X5 Module`（带空格）
- 命令：`rdk-miniboot-update`（全小写+连字符）

### 标题类型

对照 [writing-style-guide-en.md](../../writing-style-guide-en.md) §1，按页面类型检查标题风格：

| 页面类型 | 标题风格 | 示例 |
|:---|:---|:---|
| How-to / Quick start | 祈使句（bare imperative） | `Flash the system image` ✅  `Flashing system image` ❌ |
| Overview / Explanation | 名词短语 | `Flashing overview` ✅  `Understanding flashing` ❌ |
| Troubleshooting | 问题陈述或疑问 | `Flashing fails: device not found` ✅  `Flashing issues` ❌ |
| Reference | 名词短语 | `Configuration options` ✅ |

- 不要用 `How to` 前缀：`How to flash` ❌ → `Flash the system image` ✅
- 不要用 `-ing` 做 how-to 标题：`Flashing the system image` ❌
- 不要在标题里加 emoji

### Sentence case

对照 [writing-style-guide-en.md](../../writing-style-guide-en.md) §2：

- 所有标题和 UI 文本用 sentence case：首词 + 专有名词大写，其余小写
- 不要用 title case：`Specifications, Schematics, and Design Resources` ❌
- 专有名词保持 glossary 标准写法：`XBurn`、`eMMC`、`NVMe`、`RDK S100`
- 不要手动编号：`# 1.2.1 Full image flashing` ❌ → `# Flash the full system image` ✅

### 语态

对照 [writing-style-guide-en.md](../../writing-style-guide-en.md) §3：

- 主动语态优先：`XBurn flashes the board` ✅  `The board is flashed by XBurn` ❌
- 第二人称：`Connect the board via Type-C` ✅  `Users can connect the board` ❌
- 现在时：`The tool detects the device` ✅  `The tool will detect the device` ❌
- 被动语态只在执行者无关紧要时使用（如硬件描述）

## 忽略

- 代码块内的内容
- 行内代码内的内容
- URL
- UI 标签的直接引用（保持原样）

## 输出示例

```text
✅ en-check 通过，未发现英文写作问题。
```

```text
❌ en-check 发现 4 处英文写作问题：

  8: 术语不一致 "Micro SD" → "microSD card"（glossary）
  15: 标题类型错误 "Flashing system image" → "Flash the system image"（how-to 用祈使句）
  23: title case "Specifications, Schematics, and Design" → "Specifications, schematics, and design"（sentence case）
  31: 被动语态 "The board is flashed by XBurn" → "XBurn flashes the board"（主动语态）
```