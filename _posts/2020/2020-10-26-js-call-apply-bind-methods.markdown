---
layout:     post
title:      "JavaScript: bind，apply，call三者的区别"
subtitle:   "bind，call，apply的作用都是用来改变this指向的"
date:       2020-10-26 15:02:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

### 为什么要改变this指向？

```js
  var name = "lucy";
  let obj = {
    name: "martin",
    say: function () {
        console.log(this.name);
    }
  };

  obj.say(); //martin，this指向obj对象
  setTimeout(obj.say, 0); //lucy，this指向window对象
```

say 方法在定时器中是作为回调函数来执行的，因此回到主栈执行时是在全局执行上下文的环境中执行的，但我们需要的是 say 方法中 this 指向obj对象，因此我们需要修改 this 的指向。

### apply方法

```js
  var name = "martin";
  var obj = {
    name: "lucy",
    say: function(year,place) {
        console.log(this.name + " is " + year + " born from " + place);
    }
  };
  var say = obj.say;

  setTimeout(function() {
      say.apply(obj, ["1996","China"])
  }, 0); //lucy is 1996 born from China,this改变指向了obj
  say("1996"，"China") //martin is 1996 born from China,this指向window，说明apply只是临时改变一次this指向
```

### call方法

```js
var arr=[1, 10, 5, 8, 3];
console.log(Math.max.call(null, arr[0], arr[1], arr[2], arr[3], arr[4])); //10
```

采纳以参数列表的形式传入，而apply以参数数组的形式传入。

### bind方法

```js
var arr=[1,10,5,8,12];
var max=Math.max.bind(null,arr[0],arr[1],arr[2],arr[3])
console.log(max(arr[4])); //12，分两次传参
```

可以看出，bind方法可以分多次传参，最后函数运行时会把所有参数连接起来一起放入函数运行。

### apply，call，bind三者的区别

+ 三者都可以改变函数的this对象指向。
+ 三者第一个参数都是this要指向的对象，如果如果没有这个参数或参数为undefined或null，则默认指向全局window。
+ 三者都可以传参，但是apply是数组，而call是参数列表，且apply和call是一次性传入参数，而bind可以分为多次传入。
+ bind 是返回绑定this之后的函数，便于稍后调用；apply 、call 则是立即执行 。

### 实现bind方法(面试题)：

**简易版**

```js
Function.prototype.bind = function () {
    var _this = this;
    var context = arguments[0];
    var arg = [].slice.call(arguments, 1);

    return function() {
        arg = [].concat.apply(arg, arguments);
        _this.apply(context, arg);
    }
};
```

**完美版**

```js
Function.prototype.bind = function (oThis) {
    if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () { },
        fBound = function () {
            // this instanceof fBound === true时,说明返回的fBound被当做new的构造函数调用
            return fToBind.apply(this instanceof fBound
                ? this
                : oThis,
                // 获取调用时(fBound)的传参.bind 返回的函数入参往往是这么传递的
                aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    // 维护原型关系
    if (this.prototype) {
        // 当执行Function.prototype.bind()时, this为Function.prototype
        // this.prototype(即Function.prototype.prototype)为undefined
        fNOP.prototype = this.prototype;
    }
    // 下行的代码使fBound.prototype是fNOP的实例,因此
    // 返回的fBound若作为new的构造函数,new生成的新对象作为this传入fBound,新对象的__proto__就是fNOP的实例
    fBound.prototype = new fNOP();
    return fBound;
};
var arr = [1, 11, 5, 8, 12];
var max = Math.max.bind(null, arr[0], arr[1], arr[2], arr[3]);
console.log(max(arr[4])); //12
```

### 参考

1. <https://zhuanlan.zhihu.com/p/82340026>
