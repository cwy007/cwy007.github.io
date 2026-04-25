---
layout:     post
title:      "Linux: tree 命令"
subtitle:   "tree命令以树状图列出文件目录结构"
date:       2020-07-14 23:21:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Linux
---

`tree`命令显示当前文件夹的目录结构，这是一个非常有用的命令，可以帮我们迅速了解当前目录的结构。

## 安装方法

`brew install tree`

## 常用参数

```bash
tree -aI "node_modules|.git" # -a 显示出隐藏文件 .gitignore
tree -I "node_modules" # -I命令允许你使用正则匹配来排除掉你不想看到的文件夹
tree -I "node_modules|cache|test_*" # 也可以使用|同时排除掉多个文件夹

tree -d   # 只显示目录
tree -L 1 # 只显示第一层目录
```

## 示例

```bash
 cwy@Mpro ⮀ ~/jd/react-redux/react-hello-world ⮀ ⭠ master ⮀ tree -aI "node_modules|.git"
.
├── .babelrc
├── .gitignore
├── README.md
├── dist
│   ├── bundle.js
│   └── index.html
├── index.html
├── package-lock.json
├── package.json
├── src
│   └── index.jsx
└── webpack.config.js

```

## 参考链接

* https://www.cnblogs.com/iadanac/p/3859481.html?utm_source=tuicool&utm_medium=referral
* https://blog.csdn.net/pyufftj/article/details/83102530
