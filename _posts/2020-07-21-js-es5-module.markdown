---
layout:     post
title:      "JavaScript: es5 中的模块介绍"
subtitle:   "为模块定义引入包装函数，并保证它的返回值和模块的API保持一致。"
date:       2020-07-21 24:10:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

为模块定义引入包装函数，并保证它的返回值和模块的API保持一致。

## js 模块介绍

```js
function CoolModule() {
  var something = "cool";
  var another = [1, 2, 3];
  function doSomething() {
    console.log(something);
  }
  function doAnother() {
    console.log(another.join(" ! "));
  }
  return {
    doSomething: doSomething, doAnother: doAnother
  };
}
var foo = CoolModule(); // 创建模块实例
foo.doSomething(); // cool
foo.doAnother(); // 1 ! 2 ! 3

```

```js
// js 模块的单例模式
var foo = (function CoolModule() {
  var something = "cool";
  var another = [1, 2, 3];
  function doSomething() {
    console.log(something);
  }
  function doAnother() {
    console.log(another.join(" ! "));
  }
  return {
    doSomething: doSomething, doAnother: doAnother
  };
})();
foo.doSomething(); // cool foo.doAnother(); // 1 ! 2 ! 3

```

ES6 为模块增加了一级语法支持。

## 参考

《你不知道的 JavaScript 上》卷一，5.5 节
