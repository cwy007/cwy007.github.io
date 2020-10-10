---
layout:     post
title:      "CSS: 单行和多行文字溢出"
subtitle:   "ellipsis"
date:       2020-10-11 00:54:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - CSS
---

```css
    .text-ellipsis {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* 多行时不要配合 height 使用 */
    .multiline-ellipsis {
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal !important;
        word-wrap: break-word;
    }
```
