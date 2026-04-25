---
layout:     post
title:      "JavaScript: false value"
subtitle:   "js中布尔值为false的6种情况和js数据类型"
date:       2020-07-11 15:22:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

## 布尔值为false的6种情况

下面6种值转化为布尔值时为false，其他转化都为true

```js
0         //（数字0，字符串"0"布尔值为true）
NaN       //（无法计算结果时出现，表示"非数值"；但是typeof NaN==="number"）
""        //（双引号）或''（单引号） （空字符串，中间有空格时也是true）
false     //（布尔值的false，字符串"false"布尔值为true）
null      //（代表空值）
undefined //（未定义，找不到值时出现）
```

## 数据类型

基本数据类型

```js
// 可以直接操作保存在变量中的实际值
Number
String
Boolean
Null
Undefined
Symbol    // ES6
```

引用数据类型

```js
// 在JS中除了基本数据类型以外的都是对象，数据是对象，函数是对象，正则表达式是对象
Object
```

## 参考链接

* https://www.cnblogs.com/zjx304/p/9782942.html
* https://www.cnblogs.com/c2016c/articles/9328725.html
