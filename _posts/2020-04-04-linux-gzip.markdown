---
layout:     post
title:      "Linux 操作系统：gzip && gunzip"
subtitle:   "《Linux 操作系统》文件压缩 gzip"
date:       2020-04-04 10:54:00
author:     "chanweiyan"
header-img: "img/cwy/post-bg/unix-linux.jpg"
catalog: true
tags:
  - Linux
  - Shell
---

#### 查看使用说明

```bash
gzip -h
gunzip -h
zcat -h
```

#### gzip 压缩

> 这里的中括号 `[]` 通常表示参数可选

```bash
gzip [-acdfhlKnNqrtvV] [-level] [-S suffix] [file]

gzip hello.rb # hello.rb.gz

gzip hello.rb.gz
gzip: Input file hello.rb.gz already has .gz suffix

# -c --stdout          write to stdout, keep original files
gzip -c hello.rb
```

#### gunzip 解压

```bash
gunzip [-acdfhlKnNqrtvV] [-level] [-S suffix] [file]

# 解压 hello.rb.gz 到标准输出 std，删除原始文件
gunzip hello.rb.gz # hello.rb

#  -c --stdout          write to stdout, keep original files
gunzip -c hello.rb.gz > hello.rb
```
