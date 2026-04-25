---
layout:     post
title:      "Node.js: nvm 和 npm 使用淘宝镜像"
subtitle:   "设置环境变量 NVM_NODEJS_ORG_MIRROR"
date:       2020-07-18 19:08:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Node.js
---

nodejs和npm的仓库托管在S3上，在国内访问十分困难，这里可以用淘宝的镜像站npm.taobao.org代替。

## nvm使用淘宝镜像

很多人会使用nvm管理本地nodejs版本。而nvm支持通过环境变量指向nodejs和iojs的下载地址。

```bash
# vim ~/.zshrc
export NVM_NODEJS_ORG_MIRROR=https://npm.taobao.org/mirrors/node
export NVM_IOJS_ORG_MIRROR=https://npm.taobao.org/mirrors/iojs
```

之后nvm ls-remote和nvm install命令将会使用淘宝的镜像了。

## npm使用淘宝镜像安装包

npm使用registry这个属性指定仓库，因此配置这个属性即可。修改npm配置属性的几种方法详见官方文档。

修改~/.npmrc文件(没有就自行新建一个)，写入registry = https://registry.npm.taobao.org
使用命令npm config set registry https://registry.npm.taobao.org(效果和上面等效)
添加环境变量NPＭ_CONFIG_REGISTRY=https://registry.npm.taobao.org

## 参考链接

* https://www.jianshu.com/p/253cb9003411
