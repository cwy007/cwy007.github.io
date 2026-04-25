---
layout:     post
title:      "css: 要求超过两行的文本显示为两行文字"
subtitle:   "最多显示两行文字的css样式设置"
date:       2020-10-19 01:51:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - css
---

## ellipsis

```scss
@mixin line2 {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    display: box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
```
