---
layout:     post
title:      "JavaScript: async函数"
subtitle:   "async函数是使用async关键字声明的函数。"
date:       2020-10-26 18:04:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

>async函数是AsyncFunction构造函数的实例， 并且其中允许使用await关键字。async和await关键字让我们可以用一种更简洁的方式写出基于Promise的异步行为，而无需刻意地链式调用promise。

### 语法

```js
async function name([param[, param[, ... param]]]) {
    statements
}
```

async函数可能包含0个或者多个await表达式。await表达式会暂停整个async函数的执行进程并出让其控制权，只有当其等待的基于promise的异步操作被兑现或被拒绝之后才会恢复进程。promise的解决值会被当作该await表达式的返回值。使用async / await关键字就可以在异步代码中使用普通的try / catch代码块。

**await关键字只在async函数内有效。如果你在async函数体之外使用它，就会抛出语法错误 SyntaxError 。**

**async/await的目的为了简化使用基于promise的API时所需的语法。async/await的行为就好像搭配使用了生成器和promise。**

async函数一定会返回一个promise对象。如果一个async函数的返回值看起来不是promise，那么它将会被隐式地包装在一个promise中。

例如，如下代码:

```js
async function foo() {
   return 1
}
```

等价于:

```js
function foo() {
   return Promise.resolve(1)
}
```

### await 等到之后，做了一件什么事情？

那么右侧表达式的结果，就是await要等的东西。

等到之后，对于await来说，分2个情况

+ 不是promise对象
+ 是promise对象

>如果不是 promise , await会阻塞后面的代码，先执行async外面的同步代码，同步代码执行完，再回到async内部，把这个非promise的东西，作为 await表达式的结果。
>如果它等到的是一个 promise 对象，await 也会暂停async后面的代码，先执行async外面的同步代码，等着 Promise 对象 fulfilled，然后把 resolve 的参数作为 await 表达式的运算结果。

```js
function fn(){
    return new Promise(resolve=>{
        console.log(1)
    })
}
async function f1(){
    await fn()
    console.log(2)
}
f1()
console.log(3)
//1
//3
```
这个代码因为fn是属于同步的，所以先打印出1，然后是3，但是因为没有resolve结果，所以await拿不到值，因此不会打印2

```js
function fn(){
    return new Promise(resolve=>{
      console.log(1)
      resolve()
    })
}
async function f1(){
    await fn()
    console.log(2)
}
f1()
console.log(3)
//1
//3
//a
//2
```

这个代码与前面相比多了个resolve说明promise成功了，所以await能拿到结果，因此就是1 3 2

>await后面的代码可以看做是.then里面的也就是fn.then(()=> {console.log(2)})
>then里面的是异步的所以是132

### 参考

1. <https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function>
2. <https://www.jianshu.com/p/b4fd76c61dc9>
