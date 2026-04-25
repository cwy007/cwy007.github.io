---
layout:     post
title:      "Node.js: 50行代码学会koa2中间件原理"
subtitle:   "koa: Next generation web framework for Node.js"
date:       2020-10-26 21:05:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
  - Node.js
---


Koa 是 nodejs 开发的下一代 web 开发框架，可参考 [Koa 官网](https://koa.bootcss.com/) 。说是“下一代”，其实在实际开发中早就用在项目中了。特别是 nodejs 新版本开始正式支持 async/await 语法之后，Koa2 正在被大量使用。

### 实现官网中的一段中间件示例，如下：

```js
const Koa = require('koa');
const app = new Koa();

// logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

// response
app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000);
```

这段代码的意图是：第一，记录服务开始的时间戳；第二，返回 hello word ；第三，记录返回之后的时间戳，然后算出时间间隔并打印。接下来我们就通过这段代码，分析一下 Koa2 的中间件实现原理。

### 实现 app.use

上述示例代码中，有三个 app.use ，从使用角度分析它的用意，其实就是注册中间件函数。因此，首先可以这样定义我们自己的 Koa 代码，新建一个 like-koa2.js ，开始编写：

```js
class LikeKoa2 {
    constructor() {
        this.middlewareList = []
    }

    // 核心方法
    use(fn) {
        this.middlewareList.push(fn)
        return this
    }
}
```

首先定一个类，然后构造函数中初始化 middelwareList 数组，用以存储所有的中间件函数。use 中接收中间件函数，然后放到 middelwareList 数组中，就算是注册完成。最后 `return this` 是为了能实现链式操作，例如 `app.use(fn1).use(fn2).use(fn3)` ，实际是否这样用看自己的需求。

### 实现 app.listen

示例代码的最后使用 `app.listen(3000)` 启动服务监听，可以转化为 nodejs 原生的 http 处理方式。代码如下：

```js
const http = require('http');

class LikeKoa2 {
    constructor() {
        this.middlewareList = []
    }

    // 核心方法
    use(fn) {
        this.middlewareList.push(fn)
        return this
    }

    // 将 req res 组合成为 ctx
    createContext(req, res) {
        // 简单模拟 koa 的 ctx ，不管细节了
        const ctx = {
            req,
            res
        }
        return ctx
    }

    // 生成 http.createServer 需要的回调函数
    callback() {
        return (req, res) => {
            const ctx = this.createContext(req, res)
        }
    }

    listen(...args) {
        const server = http.createServer(this.callback())
        return server.listen(...args);
    }
}
```

需要简单解释两点。第一，nodejs 原生的 `http.createServer` 需要传入一个回调函数，在 `callback()` 中返回。第二，示例代码中中间件函数的第一个参数都是 ctx ，其实可以简答理解为 res 和 req 的集合，通过 createContext 合并一下即可。

上述代码，获取到 ctx 之后，并没有做下一步处理，下文会继续解释。

## compose 组合中间件

上文一开始使用 use 来注册中间件，再就是用 listen 去启动并监听服务，即刚开始就直接结束了。其实中间漏下很重要的一个步骤 —— 中间件组合，即如何让中间有 next 机制，将中间件一个一个的串起来。

Koa2 中通过一个 compose 函数来组合中间件，以及实现了 next 机制。具体代码有点绕，不太好解释，我尽量用通俗的语言、结合代码注释，解释清楚。先看代码：

```js
// 传入中间件列表
function compose(middlewareList) {
  // 返回一个函数，接收 ctx （即 res 和 req 的组合）—— 记住了，下文要用
    return function (ctx) {
      // 定义一个派发器，这里面就实现了 next 机制
        function dispatch(i) {
          // 获取当前中间件
            const fn = middlewareList[i]
            try {
                return Promise.resolve(
                  // 通过 i + 1 获取下一个中间件，传递给 next 参数
                    fn(ctx, dispatch.bind(null, i + 1))
                )
            } catch (err) {
                return Promise.reject(err)
            }
        }
        // 开始派发第一个中间件
        return dispatch(0)
    }
}
```

我们按步骤解释一下上述代码。

+ 第一，定义 compose 函数，并接收中间件列表。
+ 第二，compose 函数中返回一个函数，该函数接收 ctx ，下文会用这个返回的函数。
+ 第三，再往内部，定义了一个 dispatch 函数，就是一个`中间件的派发器`，参数 i 就代表派发第几个中间件。执行 dispatch(0) 就是开发派发第一个中间件。
+ 第四，派发器内部，通过 i 获取当前的中间件，然后执行。执行时传入的第一个参数是 ctx ，第二个参数是 `dispatch.bind(null, i + 1)` 即下一个中间件函数 —— 也正好对应到示例代码中中间件的 next 参数。
用 Promise.resolve 封装起来，是为了保证函数执行的结果必须是 Promise 类型。

### 完善 callback

有了 compose 之后，callback 即可被完善起来，相关代码（并不是全部的代码）如下，其中新增的 handleRequest 看看注释应该也能明白了。

```js
    // 处理中间件的 http 请求
    handleRequest(ctx, middleWare) {
        // 这个 middleWare 就是 compose 函数返回的 fn
        // 执行 middleWare(ctx) 其实就是执行中间件函数，然后再用 Promise.resolve 封装并返回
        return middleWare(ctx)
    }

    callback() {
        const fn = compose(this.middlewareList)

        return (req, res) => {
            const ctx = this.createContext(req, res)
            return this.handleRequest(ctx, fn)
        }
    }

```

### 完整代码

以上就是分析的全部内容，下面列出完整的代码，但希望大家不要直接拷贝，而是自己亲手写出来。

```js
const http = require('http');

// 组合中间件
function compose(middlewareList) {
    return function (ctx) {
        function dispatch(i) {
            const fn = middlewareList[i]
            try {
                return Promise.resolve(
                    fn(ctx, dispatch.bind(null, i + 1))
                )
            } catch (err) {
                return Promise.reject(err)
            }
        }
        return dispatch(0)
    }
}

class LikeKoa2 {
    constructor() {
        this.middlewareList = []
    }

    // 核心方法
    use(fn) {
        this.middlewareList.push(fn)
        return this
    }

    // 处理中间件的 http 请求
    handleRequest(ctx, middleWare) {
        // 这个 middleWare 就是 compose 函数返回的 fn
        // 执行 middleWare(ctx) 其实就是执行中间件函数，然后再用 Promise.resolve 封装并返回
        return middleWare(ctx)
    }

    // 将 req res 组合成为 ctx
    createContext(req, res) {
        // 简单模拟 koa 的 ctx ，不管细节了
        const ctx = {
            req,
            res
        }
        return ctx
    }

    callback() {
        const fn = compose(this.middlewareList)

        return (req, res) => {
            const ctx = this.createContext(req, res)
            return this.handleRequest(ctx, fn)
        }
    }

    listen(...args) {
        const server = http.createServer(this.callback())
        return server.listen(...args);
    }
}

module.exports = LikeKoa2
```

### 测试

新建一个 test.js 然后开始编写：

```js
const Koa = require('./like-koa2');
const app = new Koa();

// logger
app.use(async (ctx, next) => { // next 为中间件的派发器
  await next();
  const rt = ctx['X-Response-Time'];
  console.log(`${ctx.req.method} ${ctx.req.url} - ${rt}`);
});

// x-response-time
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx['X-Response-Time'] = `${ms}ms`;
});

// response
app.use(async ctx => {
  ctx.res.end('hello world')
});

app.listen(8000);
```

请大家注意，我们这里的代码示例和一开始官网的示例是有一些区别的，例如这里的 `ctx['X-Response-Time']` 和官网示例的 `ctx.set('X-Response-Time', ...)` 。这是因为我们的 ctx 是简单的将 res 和 req 拼接而成，而 Koa2 中的 ctx 还做了一些 API 的扩展和处理，但是这并不是我们理解中间件原理的障碍，因此可以忽略。

最后，node test.js 运行起来，然后浏览器访问 `http://localhost:3000` ，看控制台能否打印出日志记录。提示，nodejs 版本必须 >= 8.0 。

### 参考

1. <https://www.imooc.com/article/280772>
2. <https://zhuanlan.zhihu.com/p/82340026>
