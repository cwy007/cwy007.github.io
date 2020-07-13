---
layout:     post
title:      "React: 前端报错 node-pre-gyp WARN Using request for node-pre-gyp https download解决方法"
subtitle:   "这是权限不够的问题，下载的时候加上 --unsafe-perm"
date:       2020-07-13 18:54:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
---

前端报错 node-pre-gyp WARN Using request for node-pre-gyp https download解决方法


## 报错信息

执行 npm install 时报错

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggpjxdciepj327o0n67aw.jpg)

```js
node-pre-gyp WARN Using request for node-pre-gyp https download
node-pre-gyp WARN Pre-built binaries not installable for grpc@1.13.1 and node@8.9.3 (node-v57 ABI, unknown) (falling back to source compile with node-gyp)
node-pre-gyp WARN Hit error read ETIMEDOUT
  CXX(target) Release/obj.target/grpc/deps/grpc/src/core/lib/surface/init.o

```

## 解决方法

npm install -g request

>权限不够，命令前加sudo

sudo npm install

这是权限不够的问题，下载的时候加上 --unsafe-perm

例如：

sudo npm install --unsafe-perm


## 参考

* https://www.jianshu.com/p/4b595466cc45
* React In Action ch04
* https://stackoverflow.com/questions/47966432/npm-install-grpc-failed
