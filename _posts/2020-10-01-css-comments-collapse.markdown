---
layout:     post
title:      "CSS: 在.css文件中对样式进行分组"
subtitle:   "将分组后的样式折叠起来"
date:       2020-10-01 00:50:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - vscode
---

## vscode 将分组后的样式折叠起来

I had the same issue, and fixed it by doing this:

Go to `Code` -> `Preferences` -> `Settings` and change the following entry from auto to indentation

```json
"editor.foldingStrategy": "indentation"
```

Now JSDoc comments are folding as expected, hope this works for you as well!

<https://stackoverflow.com/questions/51413448/jsdoc-comment-folding-in-vscode>

## 效果图

![折叠前](https://tva1.sinaimg.cn/large/007S8ZIlly1gj96y7aqduj314q0rwq7s.jpg)
![折叠后](https://tva1.sinaimg.cn/large/007S8ZIlly1gj96ypmns4j31180hqgnv.jpg)

## 参考

* https://stackoverflow.com/questions/51413448/jsdoc-comment-folding-in-vscode
