---
layout:     post
title:      "Ruby: 类查找中 :: 的作用"
subtitle:   ":: 表示从顶层开始搜索"
date:       2020-04-17 10:54:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Ruby
---

#### :: 表示从顶层开始搜索

```ruby
class Violin
  class String
    attr_accessor :s, :vs

    def initialize
      @vs = self
      # 确保引用的是内置的原始 String 类，使用 `::` 双冒号
      # :: 表示从顶层开始搜索
      #
      @s = ::String.new("adsks") # 在自定义的 String 类中引用Ruby内置的类 String
    end

    def report
      puts "@vs: #{@vs.class}"
      puts "@v: #{@s.class}"
    end
  end
end

```
