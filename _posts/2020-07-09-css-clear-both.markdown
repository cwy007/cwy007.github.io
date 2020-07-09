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

#### css 中的浮动现象

![](https://tva1.sinaimg.cn/large/007S8ZIlgy1ggkslli66rj310m0ju776.jpg)

#### 手动清除浮动

```css
.clear:after {
  content: '',
  display: block,
  clear: both
}
```

#### 参考链接

* [CSS 浮动](https://www.w3school.com.cn/css/css_positioning_floating.asp)
