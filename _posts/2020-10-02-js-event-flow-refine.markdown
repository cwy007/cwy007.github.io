---
layout:     post
title:      "JavaScript: 避免事件重复触发"
subtitle:   "js性能优化"
date:       2020-10-02 18:57:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - JavaScript
---

##

```javascript
// 每次事件触发后，先清除之前的事件，再继续执行
floor.$win.on('scroll resize', floor.showFloor = function() {
  clearTimeout(floor.floorTimer);
  floor.floorTimer = setTimeout(floor.timeToShow, 250);
})
```

## 参考

* https://class.imooc.com/lesson/807#mid=20292
