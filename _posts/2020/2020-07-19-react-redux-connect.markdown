---
layout:     post
title:      "React: react UI组件的业务逻辑"
subtitle:   "import connect from 'react-redux';"
date:       2020-07-19 16:39:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
---

当使用 React + Redux 时，组件如何使用 state 和修改 state

## UI组件 vs 容器组件

```jsx
import connect from 'react-redux';
const List = connect(
  mapStateToProps,
  mapDispatchToProps
)(Count);
```

## React UI组件的业务逻辑

* mapStateToProps

**负责输入逻辑**，将state映射到UI组件的参数（props）。

* mapDispatchToProps

**负责输出逻辑**，将用户对UI组件的操作映射成action。

* Redux 应用中的数据遵循如下声明周期

![Redux 应用中的数据](https://tva1.sinaimg.cn/large/007S8ZIlgy1ggwdf6979sj32160kkaj3.jpg)
