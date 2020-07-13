---
layout:     post
title:      "Node.js: npm -D -S -g -i 以及安装技巧"
subtitle:   "npm i webpack webpack-cli -D"
date:       2020-07-14 00:04:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Node.js
---

## npm -D -S -g -i 以及安装技巧

```js
-S：安装到上线环境
-D：安装到开发环境
-g：安装到全局
-i：install（等同）
```

繁杂：npm install webpack
简洁：npm i webpack

重复性操作：
npm i webpack
npm i babel-core

简洁性操作：
npm i webpack babel-core

&&命令（常用于-D和-g混合）
npm i webpack -D && npm i webpack-cli -g

无差别操作：npm i -g webpack 或 npm i webpack -g

-D：devDependencies （开发环境）
-S：dependencies（上线环境）

示例-D：npm i webpack -D
示例-S：npm i webpack -S

可以打开package.json查看，一旦安装完成即可自动添加.

如果一开始，我们没有创建package.json？
npm init -y（会自动检索安装的-S或—D并且重新生成目录）

* https://www.cnblogs.com/cisum/p/9395594.html
