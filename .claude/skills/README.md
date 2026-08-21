# Skills — 文档质量检查工具

每个 skill 是独立的质量检查维度（检查规则 + 输出模板）。以下工具均可用，首选 Claude Code（原生支持 `/skill-name` 调用），其他工具用规则文件方式复用。

## 各工具使用方式

### Claude Code

```bash
# 拷到 Claude 配置目录
cp -r .claude/skills/* ~/.claude/skills/

# 在文档仓库目录下调用
/en-check
/zh-en-parity
```

### GitHub Copilot Chat

将 SKILL.md 重命名为 `.github/prompts/<name>.prompt.md`：

```bash
# 在文档仓库根目录
mkdir -p .github/prompts
cp .claude/skills/en-check/SKILL.md .github/prompts/en-check.prompt.md
cp .claude/skills/zh-en-parity/SKILL.md .github/prompts/zh-en-parity.prompt.md
# ...
```

然后在 Copilot Chat 中输入 `@prompt en-check` 触发。

### Cursor

Cursor 不支持自定义 skill 调用，但可把检查规则写入 `.cursor/rules/` 作为目录级规则，在编辑相关文件时自动生效：

```bash
# 在文档仓库根目录
mkdir -p .cursor/rules
cp .claude/skills/en-check/SKILL.md .cursor/rules/en-check.md
```

> Cursor 规则是自动匹配的，不能像 Claude Code 那样主动调用。效果不如 `/skill-name` 直接，但规则内容可复用。

### 其他 AI 工具

把 SKILL.md 的正文（去掉 frontmatter `---` 块）粘到对话开头当 system prompt，同样生效。

## 保持更新

```bash
git pull   # 拉最新规则
cp -r .claude/skills/* ~/.claude/skills/   # Claude Code 用户更新
```

## Skill 清单

按谁跑来分：

| Skill | 用途 | 谁跑 | 使用时机 |
|:---|:---|:---|:---|
| `format-check` | 格式检查（中英文间距、代码块语言、图片 https、链接后缀） | 写初稿方 | 提 PR 前 |
| `step-check` | 操作步骤检查（标题动词开头、步骤编号、异常分支 admonition） | 写初稿方 | 写操作类文档后 |
| `structure-check` | 文档结构检查（标题层级、H1 唯一、占位符、模板对齐） | 写初稿方 | 新建文档或调整目录结构后 |
| `term-check` | 术语一致性检查（对照 glossary） | 写初稿方 | 全文写完或修改术语相关后 |
| `en-check` | 英文写作规范检查（术语、标题、sentence case、语态） | TW | 写完英文文档后 |
| `zh-en-parity` | 中英文结构对等检查（图片、链接、DocScope、步骤数） | TW | 翻译完成后 |
| `ai-review` | AI 辅助 Review（行文逻辑、信息架构、内容质量） | TW | 人审前 |

> 写初稿方 = 研发 / AE / 产品（TW 写初稿时也是这一档）。跑 format-check / step-check / structure-check / term-check 这 4 个就够，en-check / zh-en-parity / ai-review 是翻译线和人审的工具，研发不用管。

## 依赖

- `en-check` 依赖 `glossary.json` 和 `writing-style-guide-en.md`
- `zh-en-parity` 依赖 `glossary.json`
- 建议 clone 整个仓，skills 内的相对路径按此结构解析