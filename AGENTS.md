# AGENTS.md

本仓库是基于 **Jekyll + Hux Blog 主题**的个人博客（[cwy007.github.io](https://cwy007.github.io)），托管在 GitHub Pages。

完整本地启动 / 部署步骤见：[docs/2026/usage.md](docs/2026/usage.md)。本文件只列出 AI Agent 高频要用的约定与陷阱。

## 项目类型

- **静态站点**：Jekyll 3.x + Markdown(GFM) 解析；前端样式用 Less + Grunt 编译
- **没有应用代码**：仓库主要内容是 markdown 文章；JS/CSS 是主题资产
- **不要修改**：`_site/`（构建产物）、`*.min.{js,css}`、`vendor/`、`node_modules/`

## 文章写作规范（最重要）

### 1. 文件位置与命名

- 已发布：`_posts/YYYY/YYYY-MM-DD-title.md`（按年份分目录，文件名日期格式必须严格）
- 草稿：`_drafts/`（不会被 build）
- 内部文档：`docs/`（已在 `_config.yml` 的 `exclude` 中，**不发布**）

### 2. YAML Frontmatter 模板

```yaml
---
layout: post
title: 文章标题
subtitle: 副标题（可省略，留空字段或注释掉 header-img）
date: 2026-04-27 18:01:00
author: "chanweiyan"
# header-img: "img/cwy/xxx.png"
catalog: true
tags:
  - NestJS
---
```

参考最近的样例：[_posts/2026/2026-04-26-nest-aop.md](_posts/2026/2026-04-26-nest-aop.md)。

### 3. Markdown 折叠块（**易错点**）

VS Code 原生不识别 `<details>` 标签折叠，且 Markdown 默认不解析 HTML 内的 markdown。统一写法：

```html
<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 问题标题</h4>💬点击展开/收起</summary>

这里可以正常用 **markdown**、列表、代码块。

</details>

<!-- #endregion -->
```

要点：
- `<details markdown="1">` 必须加 `markdown="1"`，否则内部 markdown 不渲染
- `<summary>` 之后**必须空一行**
- `<!-- #region -->` / `<!-- #endregion -->` 仅供 VS Code 折叠，不影响渲染

详见 [docs/2026/markdown/实现展开和折叠效果.md](docs/2026/markdown/实现展开和折叠效果.md)。

### 4. 图片资源

外链优先使用 jsdelivr 加速的 GitHub 图床仓库 `cwy007/pic_bed`：

```markdown
![alt](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/xxx.jpg)
```

本地图片放 `img/cwy/<分类>/`，引用用绝对路径 `/img/cwy/xxx.png`。

### 5. 代码块语言标签

- TypeScript / NestJS 代码用 ` ```typescript `（不是 `ts`）
- Shell 用 ` ```bash `
- JSON / YAML / text 各自标明
- 文章中的 `import '@nestjs/common'` 等会被某些 VS Code 扩展报 `ts(2307)`——**忽略**，不影响 Jekyll 渲染

### 6. 中文写作风格

- 中英文之间强制空格
- Prettier 的 `proseWrap: preserve`（如启用）会保留原换行；不要重排段落
- 使用全角标点：`，。：；""''（）`

## 本地构建命令

```bash
bundle install                  # 装 Jekyll/Markdown 等 Ruby 依赖
npm install                     # 装 Grunt（仅改 less/js 时需要）
bundle exec jekyll serve -w     # 仅写文章时用这个，端口 4000
npm run watch                   # 同时跑 Grunt watch + Jekyll serve（改样式时用）
```

> Agent **不需要**主动跑 `jekyll serve`；除非用户明确要预览。

## 部署

`git push origin master` → GitHub Pages 自动构建。**不要 force push**。

## 目录速查

| 路径                      | 作用                                 |
| ------------------------- | ------------------------------------ |
| `_posts/`                 | 已发布文章（按年份分子目录）         |
| `_drafts/`                | 未发布草稿                           |
| `_includes/`, `_layouts/` | 主题模板（Liquid）。改这里会影响全站 |
| `_config.yml`             | Jekyll 全局配置                      |
| `less/` → `css/`          | Less 源码，Grunt 编译输出            |
| `js/`                     | 主题脚本，含 `*.min.js`              |
| `img/`, `pwa/`, `fonts/`  | 静态资源                             |
| `docs/`                   | 内部文档（**不参与 build**）         |
| `bugfix/`                 | 历史问题排查记录                     |
| `_site/`                  | 构建产物，**不要提交编辑**           |

## 常见陷阱

1. **Markdown ≠ CommonMark**：行内 HTML、表格语法、`{:...}` 块属性等差异，遇到渲染异常优先查 [Markdown 文档](https://Markdown.gettalong.org/syntax.html)
2. **`_config.yml` 的 `exclude`**：新增不想发布的目录要加进去（`docs/`、`README.md` 等已加）
3. **未来日期文章**：`future: true` 已开启，日期写未来也能渲染
4. **永久链接**：`permalink: pretty`，文件名直接决定 URL，**已发布文章不要改名**
5. **TODO.md / helps_for_myself.md**：根目录的私人笔记，会被 Jekyll 当成普通页面发布；新增类似文件请放 `docs/`

## 修改前的小检查

- 改文章 → 只改 `_posts/` / `_drafts/`，frontmatter 必填字段齐全
- 改主题样式 → 改 `less/`，**不要直接改 `css/*.min.css`**（会被 Grunt 覆盖）
- 改主题结构 → 改 `_includes/` / `_layouts/`，注意 Liquid 语法
- 新建辅助文档 → 放 `docs/`，避免被发布
