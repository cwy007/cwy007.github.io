---
layout:     post
title:      "rails导出Excel数字类型数据出现乱码的问题"
subtitle:   "DONE IS BETTER THAN PERFECT"
date:       2018-12-26 11:33:00
author:     "chanweiyan"
header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - Rails
---

#### 遇到的问题

![x](https://ws2.sinaimg.cn/large/006tNbRwly1fyjzor9tb6j30ak03hdfz.jpg)

#### 解决方法

```ruby
# 修改前
device.code

# 修改后
"#{device.code} \t"
```

效果图

![x](https://ws4.sinaimg.cn/large/006tNbRwly1fyjzoumr9pj30ao02vmx9.jpg)

#### 参考链接

1. [https://blog.csdn.net/qq_31879707/article/details/80499854](https://blog.csdn.net/qq_31879707/article/details/80499854)

最后修改时间：2018-12-26 11:33
