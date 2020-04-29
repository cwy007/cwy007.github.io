---
layout:     post
title:      "Linux 线程的概念和使用"
subtitle:   ""
date:       2020-04-29 17:24:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Linux
---


##### 线程的概念

##### 线程的用法

##### 死锁

两个以上的运算单元，双方都在等待对方停止运行，以获取系统资源，但是没有一方提前退出时，这种状况，就称为死锁。

例如，一个进程 p1占用了显示器，同时又必须使用打印机，而打印机被进程p2占用，p2又必须使用显示器，这样就形成了死锁。

##### 参考链接

1. <https://www.runoob.com/ruby/ruby-multithreading.html>
2. <https://baijiahao.baidu.com/s?id=1645900492241810279&wfr=spider&for=pc>
