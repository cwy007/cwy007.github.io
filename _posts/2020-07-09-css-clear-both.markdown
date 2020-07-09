---
layout:     post
title:      "手动清除浮动 float"
subtitle:   "clear: both"
date:       2020-07-09 16:10:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - CSS
---

手动清除浮动

```css
.clear:after {
  content: '',
  display: block,
  clear: both
}
```

* [CSS 浮动](https://www.w3school.com.cn/css/css_positioning_floating.asp)
