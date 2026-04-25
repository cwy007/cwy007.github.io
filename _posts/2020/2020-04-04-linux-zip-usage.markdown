---
layout:     post
title:      "Linux 操作系统：zip压缩"
subtitle:   "《Linux 操作系统》zip 用法介绍"
date:       2020-04-04 15:36:00
author:     "chanweiyan"
header-img: "img/cwy/post-bg/unix-linux.jpg"
catalog: true
tags:
  - Linux
  - Shell
---

#### 获取帮助信息

```bash
zip -h
unzip -h
man zip
man unzip
```

#### zip 压缩

```bash
# 压缩当前目录下的 etc.tar 包和 hello.bak 目录及其下的所有文件
zip -r compress.zip etc.tar hello.bak/

# 压缩文件 production.sql
zip production.sql.zip production.sql
```

#### unzip 解压缩

```bash
# 解压文件
unzip production.sql.zip

# 将 compress.zip 中除 etc.tar 之外的内容解压缩到 `/tmp` 目录
unzip compress.zip -d /tmp -x etc.tar
```

#### 查看压缩包的内容

通过 -Z 参数

```bash
unzip -Z compress.zip
```

通过 zipinfo

```bash
zipinfo compress.zip
```
