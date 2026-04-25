---
layout:     post
title:      "Ruby 语法：File.expand_path"
subtitle:   "项目中看到的 ruby 语法备注"
date:       2020-04-16 10:16:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Ruby
---

#### File.expand_path

```ruby
# config/application.rb

# 加载 config/ 文件夹中的 property.rb 文件
require File.expand_path("../property", __FILE__)

# __FILE__ 指当前文件
# ../ 表示 __FILE__ 的父目录
# 路径解析过程：先解析 __FILE__ 的父目录，然后，将 property 追加到父目录上
# /Users/chanweiyan/beijing/udesk_qilin_app/config/property

```
