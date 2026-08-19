---
name: term-check
version: "1.0"
category: 文档质量
description: 术语自检：对照 glossary.json 检查文档中的术语是否使用标准写法。当研发写完文档、提 Gerrit Change 前使用本 skill 检查术语。
---

# term-check — 术语自检

对照 `C:\Users\ling.li\doc-standards\glossary.json` 检查文档中的术语是否使用标准写法。

## 检查规则

1. 读取 glossary.json，提取所有术语的「标准写法」和「错误写法」
2. 逐行扫描文档，找出所有不匹配标准写法的术语
3. 输出格式：`行号: 错误写法 → 标准写法`

## 忽略

- 代码块内的内容（```` ``` ```` 包裹的部分）
- URL 和文件路径
- 行内代码内的内容（反引号包裹）
- UI 枚举值保留原样：`secure` / `secure_ohp` / `xmodem_fastboot` / `xmodem` / `miniboot_flash` / `miniboot_emmc` / `miniboot_ufs` / `miniboot_nvme` / `nvme` / `usb` / `emmc` / `ufs` / `DFU+Fastboot`（这些是工具定义的字段值，不按术语表修正）

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

## 输出示例

```text
✅ term-check 通过，未发现术语问题。
```

```text
❌ term-check 发现 3 处术语问题：

  12: Xburn → XBurn
  45: uboot → U-Boot
  78: 登陆 → 登录
```