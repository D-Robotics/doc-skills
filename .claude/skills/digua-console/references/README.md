# digua CLI

地瓜 AI 控制台（https://digua-ai.d-robotics.cc）的命令行客户端 —— 纯 Node、零依赖，走门户 `/api/v1`（PAT Bearer 认证）。数据范围 = 当前登录用户本人的 key 与用量。

## 安装

```bash
# 全局安装后直接用 digua
npm i -g @d-robotics/digua    # 经公司 Gitea npm registry，见下方 .npmrc

# 或免安装直接跑（git clone 后）
node cli/digua.mjs <命令>
```

### 配置 registry（公司内部 Gitea）

```bash
# ~/.npmrc
@d-robotics:registry=https://gitea.d-robotics.cc/api/packages/<owner>/npm/
//gitea.d-robotics.cc/api/packages/<owner>/npm/:_authToken=<你的 Gitea token>
```

## 登录

```bash
digua login                 # 设备码流：开浏览器走地瓜 SSO 授权，CLI 自动拿令牌
digua login --token <PAT>   # 或直接用已有个人令牌
```

令牌存于 `~/.digua/config.json`。环境变量 `DIGUA_URL` / `DIGUA_TOKEN` 可覆盖（CI/脚本用）。

## 常用命令

```bash
digua whoami                 # 当前身份
digua key list               # 我的 key
digua key create <名称>      # 创建 key（明文只显示一次）
digua key revoke <id>        # 吊销 key
digua usage [--days N]       # 我的用量（默认近 30 天）
digua ask "我这个月花了多少钱"  # 大白话问用量
digua page publish <a.html>  # 托管静态页 / artifact
```

## AI-native 用法

给 Claude Code 等 Agent 装上 `digua-console` skill（地瓜 Skill Market 可下载），直接说人话即可：
「我这个月花了多少钱」「帮我建个叫 dev 的 key」。

Node ≥ 18。
