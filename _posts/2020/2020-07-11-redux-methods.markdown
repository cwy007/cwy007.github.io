---
layout:     post
title:      "Redux 中几个常用方法"
subtitle:   "react + redux"
date:       2020-07-11 15:12:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
  - Redux
---

## Provider

容器组件

```jsx
import { Provider } from 'react-redux';

// render
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
```

## mapStateToProps

```jsx
// mapStateToProps
// 页面上的数据通过这个函数获取
const mapStateToProps = state => ({
  // 这是两个 reducers
  // state.todos, state.visibilityFilter
  todos: getVisibleTodos(state.todos, state.visibilityFilter)
});
```

## mapDispatchToProps

```jsx
// mapDispatchToProps
const mapDispatchToProps = dispatch => ({
  toggleTodo: id => dispatch(toggleTodo(id))
});

```

## connect

```jsx
import { connect } from 'react-redux';

// export
// 与 TodoList 组件进行关联
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TodoList);
```

## combineReducers

```jsx
import { combineReducers } from 'redux';
import todos from './todos';
import visibilityFilter from './visibilityFilter';

// export
export default combineReducers({
  todos,
  visibilityFilter
});
```

## 源码

https://github.com/cwy007/todos_app
