---
layout:     post
title:      "halo主题开发流程"
subtitle:   "仅三行halo主题开发流程命令即可完成"
date:       2024-07-11 11:25:00
author:     "chanweiyan"
catalog: true
tags:
  - Halo
---

## 先阅读下面3个文档

- [准备工作](https://docs.halo.run/developer-guide/core/prepare)
- [开发环境运行](https://docs.halo.run/developer-guide/core/run)
- [主题开发-准备工作](https://docs.halo.run/developer-guide/theme/prepare)

## 运行服务

```bash
# clone halo 项目到本地
mkdir ~/halo2-dev
cd  ~/halo2-dev
git clone git@github.com:halo-dev/halo.git

# 运行 UI 服务
cd ~/halo2-dev/halo/ui
pnpm install
pnpm build:packages
pnpm dev

# 运行 Halo
# https://docs.halo.run/developer-guide/core/run#%E8%BF%90%E8%A1%8C-halo
  # 1.在 IntelliJ IDEA 中打开 Halo 项目，等待 Gradle 初始化和依赖下载完成。
  # https://www.jetbrains.com/idea/

  # 2.下载预设插件（可选）
  # Windows
  # ./gradlew.bat downloadPluginPresets

  # macOS / Linux
  ./gradlew downloadPluginPresets

  # 3.修改 IntelliJ IDEA 的运行配置
  # macOS / Linux
  # 将 Active Profiles 改为 dev
  #
  # http://localhost:8090/console 和 http://localhost:8090/uc
  # http://localhost:8090

```

## 新建一个主题

- [主题在自己电脑上的位置](https://docs.halo.run/developer-guide/theme/prepare)

Halo 的主题存放于工作目录的 themes 目录下，即 `~/halo2-dev/themes`

```bash
mkdir -p ~/halo2-dev/themes

cd ~/halo2-dev/themes # 一定要将主题放在这个目录下，这样修改完主题后，刷新页面，会显示修改后的效果

git clone git@github.com:halo-dev/theme-earth.git

cd ~/halo2-dev/themes/theme-earth

# 用 vscode 打开theme-earth，编辑后，刷新页面 http://localhost:8090
code .

# 安装主题
# https://docs.halo.run/developer-guide/theme/prepare#%E5%AE%89%E8%A3%85%E4%B8%BB%E9%A2%98

```

## 组件库 - Tailwind CSS + Alpine JS

- [Tailwind CSS](https://tailwindcss.com/)

- [Alpine JS](https://alpinejs.dev/)

- [penguinui](https://www.penguinui.com/docs/getting-started)

> - Tailwind CSS: the latest version of Tailwind CSS (Currently V3.4 ) is required for all of the Penguin UI components.
>
> - Alpine JS: Some interactive components require the latest version of Alpine JS (currently V3 ) to function properly.
