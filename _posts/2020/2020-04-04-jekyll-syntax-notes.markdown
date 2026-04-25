---
layout:       post
title:        "Jekyll 语法使用说明"
subtitle:     "收集和记录一些不熟悉的 Jekyll 语法"
date:         2020-04-04 11:41:00
author:       "chanweiyan"
header-img:   "img/in-post/post-eleme-pwa/eleme-at-io.jpg"
header-mask:  0.3
catalog:      true
multilingual: false # 文章有多个语言版本
tags:
    - Jekyll
---

## 文章翻译：中英切换的实现

```html
{% raw %}
<!-- Chinese Version -->
<div class="zh post-container">
    {% capture about_zh %}
    {% include posts/2017-07-12-upgrading-eleme-to-pwa/zh.md %}
    {% endcapture %}
    {{ about_zh | markdownify }}
</div>

<!-- English Version -->
<div class="en post-container">
    {% capture about_en %}
    {% include posts/2017-07-12-upgrading-eleme-to-pwa/en.md %}
    {% endcapture %}
    {{ about_en | markdownify }}
</div>
{% endraw %}
```

## 参考文章

1. [Jekyll使用教程笔记 六](https://juejin.im/post/5b399ee2f265da595a5e5106)
