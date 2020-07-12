---
layout:     post
title:      "React: 认识React"
subtitle:   "关于React的基本概念"
date:       2020-07-11 22:24:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
---

## React 是什么？

* React是一个用来构建用户界面的库，它最初是由Facebook的工程师创建的。
* React提供了一套基于组件的简单、灵活的API。
* 组件是React的基本单元，在React应用中被广泛使用。
* React在程序和浏览器DOM之间实现了一个虚拟DOM层。
* 虚拟DOM使用快速比对算法对DOM进行高效更新。
* 虚拟DOM具有优秀的性能，但最大的好处是它提供的思维模型。

## React应用的主要“成分”的概览

![React应用的主要“成分”的概览](https://tva1.sinaimg.cn/large/007S8ZIlly1ggnemjywnlj30by0hsdiq.jpg)

## ReactDOM.render 的函数签名

```jsx
ReactDOM.render(
  ReactElement element,
  DOMElement container,
  [function callback] // 中括号 [] 表示参数可选，非必填
) -> ReactComponent
```

## React.createElement 的函数签名

```jsx
// 中括号 [] 表示参数可选，非必填

React.createElement(
  String/ReactClass type, // 我在创建什么？
  [object props],         // 我怎么配置它？
  [children...]           // 它包含什么？
) -> React Element
```

## 概念

一种可用的熟悉的思维结构：一种与常规DOM元素相似的元素的树形结构。
React 元素是DOM 元素的虚拟表示。

* React元素与DOM元素之间的一些相似之处

![React元素与DOM元素之间的一些相似之处](https://tva1.sinaimg.cn/large/007S8ZIlly1ggo2ihgipoj30hs05mq3x.jpg)

* React元素在React应用的整个过程中被使用的情况

![React创建和管理元素的简单蓝图](https://tva1.sinaimg.cn/large/007S8ZIlly1ggo2j99r0vj30m8043wfo.jpg)

React使用React元素来创建虚拟DOM，React DOM管理和使用虚拟DOM来协调和更新实际DOM。

* React会递归地对一系列React元素进行求值来确定它应该如何为组件形成虚拟DOM树

```jsx
const root = React.createElement('div', {},
  React.createElement('div', {}, 'Hello, world!',
    React.createElement('a', {href: 'mailto:mark@ifelse.io'},
      React.createElement('h1', {}, 'React In Action'),
      React.createElement('em', {}, '...and now it really is!')
    )
  )
);
```

![为组件形成虚拟DOM树](https://tva1.sinaimg.cn/large/007S8ZIlly1ggo3jcoqm4j30m80b6q6u.jpg)

可以沿箭头向下而后向右来了解React对嵌套React元素求值的方式以及每个参数在问什么

DOMElement

![DOMElement](https://tva1.sinaimg.cn/large/007S8ZIlly1ggo3r4uebfj30hs06xjsn.jpg)

* React 元素

```html
React元素接收一个字符串来创建一种DOM元素（div、a、p等）。
可以通过props对象为React元素提供配置。这类似于DOM元素的属性（如<img src="aUrl"/>）。
React元素是可嵌套的，可以将其他React元素作为某个元素的子元素。
React使用React元素创建虚拟DOM。当React更新浏览器DOM时，React DOM会使用虚拟DOM。
React元素是React中构成组件的东西。
```

* React类有支撑实例而React元素没有

![React类有支撑实例而React元素没有](https://tva1.sinaimg.cn/large/007S8ZIlly1ggo96c7iacj30hs0ab40w.jpg)

React会为React类的实例（不是蓝图本身）创建并追踪一个特殊的数据对象

React元素是DOM的镜像而组件是将它们组织在一起的方法

支撑实例是一种为特定组件提供数据存储和访问的方法

* React的工作方式的整体情况

![React的工作方式的整体情况](https://tva1.sinaimg.cn/large/007S8ZIlly1ggoa43irykj30m808777a.jpg)

React使用React类和React元素创建内存中控制实际DOM的虚拟DOM。

它还创建了一个“综合”事件系统，以便仍可以对来自浏览器的事件做出反应（如点击、滚动和其他用户引起的事件）

* 状态是什么？

从另一个方面来看，状态是某个特定时间事物的信息。例如，通过询问“你今天怎么样？”来了解朋友的“状态”。

```jsx
this.state // 可变状态
this.props // 不可变状态
```

* 应该在什么时候使用状态？

在想要改变存储在组件中的数据时使用。

在React中，需要变化的数据常常来自于用户输入（通常是文本、文件、切换选项等）或者是用户输入的结果，但也可能是许多其他东西。

* this.setState

```jsx
// this.setState接收一个用来更新状态的更新器函数，而且this.setState不返回任何东西
setState(
  function(prevState, props) -> nextState,
  callback
) -> void
```

不能像在非React情况下那样直接覆盖this.state，因为React需要追踪状态并确保虚拟DOM和实际DOM保持同步。

* 什么会引起React进行更新？

React实现了一个合成事件系统作为虚拟DOM的一部分，它会将浏览器中的事件转换为React应用的事件。

React要确保DOM与虚拟DOM保持一致，如果虚拟DOM没有更新，就不会让DOM发生变化。

* 用单向数据流创建新组件

![用单向数据流创建新组件](https://tva1.sinaimg.cn/large/007S8ZIlly1ggobw0feylj30hs09amyb.jpg)

要添加帖子，需要从输入字段获取数据并以某种方式传给父组件，然后更新后的数据将被用来渲染帖子

* JSX是什么？

它是对ECMAScript的一种类XML的语法扩展，但它没有定义任何语义，其专门提供给预处理器使用。

JSX是JavaScript的扩展，其类似XML并且仅用于代码转换工具。

* 声明周期方法

React会在渲染和更新过程中按一定顺序调用它们。

* 组件间通信

```html
React组件通过属性进行通信并具有父子关系。
父组件能够传递数据给子组件，但子组件不能修改父组件。
它们可以通过回调函数将数据传递给父组件，但不能直接访问父组件。
```

## 参考

* 《React实战》
* 《React In Action》
