---
layout:     post
title:      "React: 生命周期方法"
subtitle:   "React中渲染过程的概览"
date:       2020-07-13 18:54:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
---

* 生命周期方法

附属于React类组件的特殊方法，其在组件生命周期的特定时间点被执行。

```jsx
componentWillMount()
componentDidMount()
componentWillReceiveProps()
shouldComponentUpdate()
componentWillUpdate()
componentDidUpdate()
componentWillUnmount()
```

* 什么是渲染

一个定义是“使成为或变为；创建。”

可以将渲染看作React创建和管理用户界面所做的工作，就是让应用程序展现到屏幕上的工作。

* Will

将执行
在一些事情发生前被调用；

* Did

已完成
在一些事情发生后被调用。

* 渲染过程和组件生命周期的概览

```js
初始化——组件类被实例化的时候；
挂载中——组件被插入DOM的时候；
更新中——通过状态或属性用新数据更新组件的时候；
卸载中——组件从DOM中移除的时候
```

![渲染过程和组件生命周期的概览](https://tva1.sinaimg.cn/large/007S8ZIlly1ggpfx67dw0j30hs084dhr.jpg)

* React中渲染过程的概览

![渲染过程的概览](https://tva1.sinaimg.cn/large/007S8ZIlly1ggpgbf5m06j30ia0m8q5e.jpg)

* 父组件和子组件的渲染过程

![父组件和子组件的渲染过程](https://tva1.sinaimg.cn/large/007S8ZIlly1ggpgv1c54dj30hs0f6jta.jpg)

* React组件生命周期方法小结

![React组件生命周期方法小结](https://tva1.sinaimg.cn/large/007S8ZIlly1ggpi2oosxmj310u0u0aiy.jpg)
