---
name: digua-console
version: "1.5"
category: CLI / 工具
description: 地瓜 AI 控制台 CLI（digua）：查询用户本人的 LLM 用量/费用/token、管理本人的 LiteLLM API Key（列出/创建/吊销）、托管页面/artifact、管理 skill（list/install/update/upload）、设备码登录。当用户问"我的用量/我花了多少钱/我用了多少 token/我的 key/帮我建个 key/吊销 key/装个 skill/更新 skill/digua 登录"等围绕**个人**账号的 AI 用量、Key、页面与 skill 管理问题时使用本 skill，即使没明说 digua。
---

# digua-console — 地瓜 AI 控制台 CLI

`digua` 是地瓜 AI 控制台（https://digua-ai.d-robotics.cc）的命令行客户端，纯 Node 零依赖，
走门户 `/api/v1`（PAT Bearer 认证）。数据范围 = **当前登录用户本人**的 key 和用量。

> ⚠️ **两个地址千万别搞混（最常见错误）**：
> - **门户/控制台** = `https://digua-ai.d-robotics.cc` —— 本 CLI 调它（管理 key、查用量），用 **PAT**（`digua_pat_…`）。
> - **模型网关/代理** = `https://ai-api.d-robotics.cc` —— 拿创建出来的 **LiteLLM key**（`sk-…`）去**调模型**的地方，OpenAI 兼容：`/v1/chat/completions`、`/v1/models`。
>
> 即：在门户建 key → **拿这把 key 去网关 `ai-api.d-robotics.cc/v1` 调模型**。别把门户地址当成模型代理地址。

## 安装 digua CLI

需要本机有 Node（≥18）。**最便捷：一键 curl 安装**（无需任何账号/token）：

```bash
curl -fsSL https://digua-ai.d-robotics.cc/cli/install.sh | sh
```

其他等价方式：

```bash
# 用 npm 直接从控制台装 tarball（无需 registry/token）
npm i -g https://digua-ai.d-robotics.cc/cli/digua.tgz

# 或直接下原始脚本当 digua 用
curl -fsSL https://digua-ai.d-robotics.cc/cli/digua.mjs -o digua && chmod +x digua

# 内网 npm 高级用法（需 Gitea token）：npm i -g @d-robotics/digua
```

## 如何更新（CLI 与本 skill）

统一拉取/更新源 = 地瓜「Skill Market」。

- **更新 CLI**：重跑安装命令（`curl … | sh` 或 `npm i -g https://digua-ai.d-robotics.cc/cli/digua.tgz`）覆盖到最新。
- **更新本 skill（推荐用 CLI 一键）**：
  ```bash
  digua skill update digua-console     # 拉取最新覆盖到 ~/.claude/skills/
  digua skill list [关键词]            # 浏览/搜索所有可见 skill
  digua skill install <名称>           # 安装别的 skill
  ```
  也可在网页 Skill Market 手动下载 zip 解压覆盖。**上传同名 skill 即更新**（`digua skill upload <file>`），不产生重复。
  > 注：`digua skill install/update` 装到 `~/.claude/skills/`（Claude Code）；其他 agent 把下载的 zip 解压到各自 skills 目录即可。

## 调用方式

优先用全局命令 `digua`；不存在则回退 `node <仓库>/cli/digua.mjs`：

```bash
digua <命令> || node <llm-portal仓库路径>/cli/digua.mjs <命令>
```

配置存于 `~/.digua/config.json`（url + token）。环境变量 `DIGUA_URL` / `DIGUA_TOKEN` 可覆盖（CI/脚本用）。
默认服务端：`https://digua-ai.d-robotics.cc`；本地开发联调时用 `digua login --url http://localhost:3000`。

## 第一步永远是确认登录态

```bash
digua whoami
```

- 输出身份信息 → 已登录，继续执行用户要的命令
- 输出 `✗ 未登录或令牌失效` → 走下面的设备码登录流程，**不要**直接报错了事

## 设备码登录（split-flow）

`digua login` 会打印验证链接和设备码，然后**阻塞轮询**直到用户在浏览器里批准。
作为 agent 必须后台运行再提取信息给用户：

1. `digua login` 用后台方式启动
2. 读取输出，提取**验证链接**（形如 `{服务端}/device?code=XXXXXXXX`）和**设备码**
3. 把链接原样发给用户："请打开链接（会先走公司 SSO 登录），批准后回来告诉我"
4. 用户确认后读取后台任务输出——CLI 轮询成功会自动把 PAT 存进 `~/.digua/config.json`
5. 再跑 `digua whoami` 验证

用户如果直接给了 PAT（在网页「设置」里生成），用 `digua login --token <PAT>` 一步完成。

## 命令速查

| 命令 | 作用 | 备注 |
|---|---|---|
| `digua whoami` | 当前身份 | 每轮对话先跑一次确认登录态 |
| `digua usage [--days N]` | 个人用量汇总（请求/token/费用/活跃天） | 默认 30 天 |
| `digua ask "<问题>"` | 大白话问用量 | 服务端解析意图，适合直接透传用户原话 |
| `digua key list` | 我的 key 列表 | |
| `digua key create <名称> [--budget N] [--models a,b]` | 创建 key | 见下方安全注意 |
| `digua key revoke <id>` | 吊销 key | **破坏性操作，先向用户确认** |
| `digua skill upload <file> [--visibility self\|dept\|all]` | 上传/更新自己的 skill | **默认 `self`（仅本人）**，见下方可见性 |
| `digua page publish <file.html> [--name <名称>] [--visibility …]` | 发布/更新托管静态页 | **默认 `private`（仅本人）**，见下方可见性 |

## 上传 skill / 发布页面：默认「仅本人」，共享要显式说

上传 skill 或发布托管页面，**默认只有本人可见**（skill=`self`，page=`private`）——用户没提共享就别改。
用户话里出现共享意图时，映射成对应 `--visibility`：

| 用户怎么说 | skill | page |
|---|---|---|
| 没提 / 「先传上去」「自己用」 | `self`（默认） | `private`（默认） |
| 「本部门 / 组里能看」 | `dept` | `dept` |
| 「全公司 / 所有人 / 大家都能装」 | `all` | `company` |
| 「知道链接就能看」 | —（无此档） | `link` |
| 「公开 / 放画廊」 | —（无此档） | `public` |

拿不准就按默认（仅本人）传，再补一句「已按仅本人可见发布，要共享给部门/全公司再说一声」。

## 安全红线

- **key 明文只在创建时显示一次**（服务端不存明文）。`key create` 的输出要**立即原样转给用户**并提醒"只显示这一次，请立刻保存"；不要把明文写进任何文件或记忆。
- `key revoke` 不可逆：执行前把要吊销的 key 名称/id 复述给用户，得到明确同意再执行。
- PAT（`~/.digua/config.json` 或 DIGUA_TOKEN）不要在回复中输出明文。

## 回答风格

CLI 输出已是人类可读中文。把数字提炼成一句话结论（必要时用表格），不要原样倾倒长输出。
用户问的是趋势/分布等 CLI 没有的维度时，说明 CLI 只有汇总数据，
细分维度请打开网页 `https://digua-ai.d-robotics.cc/usage`。
