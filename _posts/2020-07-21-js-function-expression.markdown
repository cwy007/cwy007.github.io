---
layout:     post
title:      "JavaScript: 区分函数声明和表达式最简单的方法"
subtitle:   "function 关键字是否位于声明的开始"
date:       2020-07-21 24:03:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

function 关键字是否位于声明的开始

## 区分函数声明和表达式最简单的方法

区分函数声明和表达式最简单的方法是看 function 关键字出现在声明中的位 (不仅仅是一行代码，而是整个声明中的位置)。

```js
// 表达式
(function(){})()

var foo = function () {}

// 声明
function foo() {}

```

## 参考

《你不知道的 JavaScript 上》
