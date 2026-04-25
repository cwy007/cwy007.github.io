# 项目使用手册

本项目是一个基于 [Jekyll](https://jekyllrb.com/) 搭建的静态博客项目，采用了定制过的
Hux Blog 主题，并结合 npm 和 Grunt 进行前端资源的开发与构建。有关站点的配置、本地运行与调试、
内容创作，以及项目部署的完整步骤如下。

## 环境准备

本项目需要配置 Ruby（用于 Jekyll）和 Node.js（用于前端资源构建）环境。

1. **安装 Ruby 依赖**
   进入项目根目录，使用 bundler 安装所需的 Gem 包：

   ```bash
   bundle install
   ```

   > 提示：项目 `Gemfile` 已配置 Ruby China 镜像源 (`https://gems.ruby-china.com`)。

2. **安装 Node.js 依赖**
   项目包含了一个 `package.json`，包含了 Grunt 和用于编译静态文件的相关插件：
   ```bash
   npm install
   ```

## 本地运行

在本地编写文章或修改主题时，可以通过以下方式启动测试服务：

1. **组合启动方法 (推荐)**
   该命令会启动 Jekyll 服务，并同时运行 Grunt 的 `watch` 任务。当你修改 `.less` 样式或
   JavaScript 时，前端资源会被自动编译，并在 `localhost:4000` 实时预览更改。

   ```bash
   npm run watch
   ```

   如果你在 Python 3 环境下遇到环境问题，可以使用对应的别名命令：

   ```bash
   npm run py3wa
   ```

2. **纯 Jekyll 启动**
   如果你只写文章，不涉及样式或系统 JS 改动，可以直接运行：
   ```bash
   bundle exec jekyll serve --watch
   ```

服务启动后，可在浏览器中访问 `http://localhost:4000/`。

## 内容创作与发布

### 文件位置与命名

- **已发布文章**：存放在 `_posts/` 目录下。
- **草稿箱**：未完成的文章可存放在 `_drafts/` 目录下。
- 命名规则必需严格遵循 Jekyll 的日期格式：`YYYY-MM-DD-your-title.md`。

### YAML Frontmatter (文章头部配置)

每篇 Markdown 文章的顶部必须包含一段 YAML 数据信息（用 `---` 包裹），例如：

```yaml
---
layout: post
title: "文章的主标题"
subtitle: "显示在目录和文章页面的副标题"
date: 2026-04-25 12:00:00
author: "cwy007"
header-img: "img/post-bg-xxx.jpg"
tags:
  - 前端开发
  - Jekyll
---
```

## 资源构建

项目的主要前端开发流程基于 **Grunt**，配置写在 `Gruntfile.js` 中。

- **样式开发**：请修改 `less/` 目录中的文件，系统会自动将其编译至 `css/`。
- **脚本处理**：如果需要调整或新增主要 JS 功能，通过 Grunt task 可以把代码合并并使用 Unuglify 压缩至 `js/` 目录。

## 项目部署

本站点已托管在 GitHub Pages 上。所有发布均为全自动。
当你使用 Markdown 写好新文章并在本地预览无误后，只需把改动 push 到远端仓库的主分支 (`master`)。

```bash
git add .
git commit -m "docs: add new post"
git push origin master
```

GitHub 收到推送后，会自动执行相应的 Actions/构建任务并更新站点页面。
