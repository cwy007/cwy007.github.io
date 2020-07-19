---
layout:     post
title:      "JavaScript: 事件传递的3个阶段"
subtitle:   "addEventListener、捕获、冒泡"
date:       2020-07-19 11:55:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

事件传递的3个阶段

## addEventListener

```js
obj.addEventListener('click', func, true);  // 捕获方式
obj.addEventListener('click', func, false); // 冒泡方式
```

## 示意图

![eventflow](https://tva1.sinaimg.cn/large/007S8ZIlly1ggw58fjipsj30m80gan1a.jpg)

捕获阶段 和 冒泡阶段

![捕获阶段 和 冒泡阶段](https://tva1.sinaimg.cn/large/007S8ZIlly1ggw59jd579j30m80d8dju.jpg)

## 执行栈和异步队列

执行栈：先执行同步代码，再执行异步代码
异步队列：异步代码（回调）会在这里排队，同步代码执行完毕后，会依次执行异步队列中的代码

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggw59wpojfj314z0u0qf1.jpg)
