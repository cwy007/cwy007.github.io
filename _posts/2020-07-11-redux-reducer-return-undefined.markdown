---
layout:     post
title:      "React: reducer visibilityFilter returned undefined"
subtitle:   "Error: Given action SET_VISIBILITY_FILTER, reducer visibilityFilter returned undefined."
date:       2020-07-11 12:00:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
  - Redux
---

## 报错信息

Error: Given action "SET_VISIBILITY_FILTER", reducer "visibilityFilter" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.

```jsx

onClick
src/containers/FilterLink.js:12
   9 |
  10 | // mapDispatchToProps
  11 | const mapDispatchToProps = (dispatch, ownProps) => ({
> 12 |   onClick: () => dispatch(setVisibilityFilter(ownProps.filter))
  13 | });
  14 |
  15 | // export
```

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggmwxlme6mj31ak0o813z.jpg)

## 错误原因

输入错误 SHO_COMPLETED
VisibilityFilters.SHO_COMPLETED

```jsx
<FilterLink filter={VisibilityFilters.SHO_COMPLETED}>
  禁用
</FilterLink>
```

## 解决方法

将 SHO_COMPLETED 改为 SHOW_COMPLETED

```jsx
<FilterLink filter={VisibilityFilters.SHOW_COMPLETED}>
  禁用
</FilterLink>
```

## 项目地址

https://github.com/cwy007/todos_app
