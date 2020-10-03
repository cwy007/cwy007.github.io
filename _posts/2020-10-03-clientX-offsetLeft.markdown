---
layout:     post
title:      "JavaScript: event.clientX and offsetLeft"
subtitle:   "clientX, offsetLeft, offsetWidth"
date:       2020-10-03 17:05:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

## clientX, offsetLeft, offsetWidth

offsetLeft计算当前元素距离有定位属性（static除外）的先辈元素的距离，如果所有的先辈元素都没有设置定位属性，那么计算的就是当前元素距离窗口左侧的距离。

* clientX：当事件被触发时鼠标指针相对于窗口左边界的水平坐标。
* offsetLeft：该元素左外边框至窗口左边界的距离。
* offsetWidth：该元素左外边框至右外边框的距离。

![1](https://tva1.sinaimg.cn/large/007S8ZIlly1gjc9ej7zdtj30j20cvweo.jpg)

![2](https://tva1.sinaimg.cn/large/007S8ZIlly1gjc9ewk1orj30j20cvmxc.jpg)

![3](https://tva1.sinaimg.cn/large/007S8ZIlly1gjc9iskgxmj30hn0gqaam.jpg)

## 参考

1. <https://blog.csdn.net/zeping891103/article/details/72627855>
2. <https://www.pianshen.com/article/11701283246/>
