---
layout:     post
title:      "Redux: store.dispatch(getAllProducts());"
subtitle:   "问什么 getAllProducts() 返回一个函数而不是一个action？"
date:       2020-07-15 20:43:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Redux
---

## 问题

`store.dispatch(getAllProducts());`

问什么 getAllProducts() 返回一个函数而不是一个action？

## 什么是 thunk?!

thunk 是一个包含表达式的函数，用于延缓表达式的执行。

```js
// calculation of 1 + 2 is immediate
// x === 3
let x = 1 + 2;

// calculation of 1 + 2 is delayed
// foo can be called later to perform the calculation
// foo is a thunk!
let foo = () => 1 + 2;
```

## redux-thunk

Redux Thunk 中间件允许你写一个返回函数而不是返回一个action的action creator 函数。
thunk可以延缓一个action的分发或者只有在满足特定条件时才分发。返回的内部函数会接收store的 dispatch 和
getState 方法作为参数

action creator

```js
/**
 * Action 创建函数
 * 创建一个被绑定的 action 创建函数来自动 dispatch
 * Redux Thunk middleware allows you to write action creators that return a function instead of an action.
 * thunk 形（式）实（在）转换程序
 */
export const getAllProducts = () => dispatch => {
  shop.getProducts(products => {
    dispatch(getProductsAction(products))
  })
}

```

redux store

```js
const middleware = [thunk];
if (process.env.NODE_ENV !== "production") {  // 如果是开发环境，就添加中间件
  middleware.push(createLogger());
}

// 创建 Store，整个应用中有且仅有一个 Store，用于存放整个应用中所有的 state
const store = createStore(reducer, composeWithDevTools(
  applyMiddleware(...middleware),
));

// 请求接口获取数据
store.dispatch(getAllProducts());
```

## 参考

* https://developer.aliyun.com/mirror/npm/package/redux-thunk
* https://github.com/cwy007/shopping-cart
