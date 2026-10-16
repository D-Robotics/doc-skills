---
name: term-check
version: "1.1"
category: 文档质量
description: 用词规范自检：对照 glossary.json 检查术语标准写法，并扫描口语化表达（动词缩略、口语副词等），提示替换为书面语。当研发写完文档、提 PR 前使用本 skill。
---

# term-check — 术语与书面语自检

对照 `glossary.json`（术语 SSOT，本仓库 doc-skills 根目录；在线副本 <https://raw.githubusercontent.com/D-Robotics/doc-skills/main/glossary.json>）检查术语标准写法；同时对照 [writing-style-guide §7.12](../../../writing-style-guide.md) 的「口语 → 书面语」表检查口语化表达。

## 检查规则

1. 读取 glossary.json，提取所有术语的「标准写法」和「错误写法」
2. 逐行扫描文档，找出所有不匹配标准写法的术语；并对照 writing-style-guide §7.12 的「口语 → 书面语」表找出口语化表达
3. 输出格式：`行号: 错误写法 → 标准写法`

## 忽略

- 代码块内的内容（```` ``` ```` 包裹的部分）
- URL 和文件路径
- 行内代码内的内容（反引号包裹）
- UI 枚举值保留原样：`secure` / `secure_ohp` / `xmodem_fastboot` / `xmodem` / `miniboot_flash` / `miniboot_emmc` / `miniboot_ufs` / `miniboot_nvme` / `nvme` / `usb` / `emmc` / `ufs` / `DFU+Fastboot`（这些是工具定义的字段值，不按术语表修正）
- UI 界面文案与按钮文字保留原样（如「确定」「取消」）；正文里描述用户动作的口语（如「不勾」）仍要改书面语（「取消勾选」）

## 常见错误速查

以下为高频错误，检查时优先关注：

| 类别 | 常见错误 | 应为 |
|------|---------|------|
| 产品名 | RDKS100 / RDK-S100 / S100 | RDK S100 |
| 产品名 | RDKS600 / RDK-S600 / S600 | RDK S600 |
| 产品名 | RDKX5 / RDK-X5 / X5 | RDK X5 |
| 工具名 | Xburn / xburn | XBurn |
| 存储 | EMMC / Emmc / emmc | eMMC |
| 存储 | ufs | UFS |
| 存储 | Nandflash / nand flash | NAND Flash |
| 存储 | NVME / Nvme / nvme | NVMe |
| 固件 | uboot / Uboot / UBoot | U-Boot |
| 固件 | Miniboot / MiniBoot | miniboot |
| 固件 | bootloader / BootLoader | Bootloader |
| 协议 | fastboot | Fastboot |
| 协议 | dfu | DFU |
| 协议 | Xmodem_fastboot / xmodem+fastboot | xmodem_fastboot |
| 接口 | usb / Usb | USB |
| 接口 | Type-c / type-c / Type C | Type-C |
| 网络 | WiFi / Wifi / wifi | Wi-Fi |
| 公司 | Digua / digua / 地瓜 | D-Robotics |
| 中文 | 登陆 | 登录 |
| 中文 | 刷机 / 烧写 / 烧入 | 烧录 |

## 书面语检查（口语 → 书面语）

术语级口语（板子 → 开发板、刷机 → 烧录等）已作为「错误写法」收进 glossary.json，走上方术语检查；**表达级口语**（动词缩略、口语副词/代词、程度词等）的对照表见 [writing-style-guide §7.12](../../../writing-style-guide.md)（本仓库根目录；在线副本 <https://raw.githubusercontent.com/D-Robotics/doc-skills/main/writing-style-guide.md>），按该表逐行扫描并提示替换为书面语。

## 输出示例

```text
✅ term-check 通过，未发现术语或口语问题。
```

```text
❌ term-check 发现 3 处用词问题：

  12: Xburn → XBurn
  45: 不勾 → 取消勾选
  78: 登陆 → 登录
```
