---
layout: post
title: Nest 全局模块和生命周期
subtitle: 避免重复 imports。支持在创建和销毁时执行一些逻辑。
date: 2026-04-26 16:42:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## 全局模块

module 导出 provider，另一个 module 需要 imports 它才能用这些 provider。

如果这个模块被很多模块依赖，那每次都要 imports 就很麻烦。

**能不能设置成全局的，它导出的 provider 直接可用呢？**

### 1.常用引入模块方式

在 AaaModule 里指定 exports 的 provider

![exports](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/8ff932e0494441da85e47b51cc9fdcaf~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

然后，在 BbbModule 里 imports

![imports](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/1bcac36f1bc04497b4bcf37d493a82f5~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

这样就可以在 BbbService 内注入 AaaService

![注入 AaaService](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/54cf732cedfa4221a857494b26db92b1~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

### 2.@Global() 将模块声明为全局的

在 AaaModule 上加一个 @Global 的装饰器，然后，在 BbbModule 里把 AaaModule 的 imports 去掉。

![在 BbbModule 里把 AaaModule 的 imports 去掉](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/fb83bcc03b6841ce93fd8dff8bb1a39e~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

依然可以注入AaaService

![依然可以注入 AaaService](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/30a1cd371ac54a398bf1d02d61edbbd3~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

全局模块要尽量少用，不然，注入的很多 provider 都不知道来源，会降低代码的可维护性

## 生命周期

**Module, Controller, Provider 是由 nest 创建的，能不能在创建，销毁时执行一些逻辑呢？**

nest 在启动的时候，会递归解析 Module 依赖，扫描其中的 provider，controller，注入它的依赖。
全部解析完后，会监听网络端口，开始处理请求。
这个过程中，nest 暴漏了一些生命周期方法

![lifecycle](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260426170603007.png)

### 1.创建阶段

nest 提供了两个 interface

```ts

export interface OnModuleInit {
  onModuleInit(): any;
}

export interface OnApplicationBootstrap {
  onApplicationBootstrap(): any;
}
```

在 controller，service，module 中分别实现它们：

![controller，service，module](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/2d36dd43bda646c892e6242489d6e43c~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![service](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/96053772a6ae4258aa659a198e4b0dfc~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![module](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/3a1ccd1a8a7f472a9841a170182bd92f~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

然后，重新运行服务，会看到下面的日志信息，显示了生命周期方法的调用顺序

![日志信息](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/b84285b51b5441ef9759438bc302fbf3~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

## 2.销毁阶段

1.先调用 每个模块的 contoller，provider 的 onModuleDestroy 方法，
然后，调用 Module 的 onModuleDestroy。

2.之后，再调用每个模块的 controller，provider 的 beforeApplicationShutdown 方法，
然后，调用 Module 的 beforeApplicationShutdown 方法。

3.然后，停止监听网络端口。

4.之后，调用每个模块 controller，provider 的 onApplicationShutdown 方法，
然后，调用 Module 的 onApplicationShutdown 方法。

5.之后停止进程。

onModuleDestroy 和 beforeApplicationShutdown 的区别

```ts

export interface OnModuleDestroy {
  onModuleDestroy(): any;
}

export interface BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string): any; // 可以拿到 signal 系统信号，比如：SIGTERM
}

```

这些终止信号是别的进程传过来的，让它做一些销毁的事情，比如k8s管理容器的时候，可以通过这个信号来通知它。

![controller](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/238cfbb9006a4a8680c7714e2f6dba15~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![service](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/beba6215f36e43bbb53c8754abfd05ec~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![module](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/4a57ce56d0084e2e871eb30ad387d71e~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

3秒后，调用 app.close() (只是触发销毁逻辑，不会真正退出进程)

![只是触发销毁逻辑，不会真正退出进程)](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/9ceaf10c25b1429aa3e7310d1cdd7cde~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

生命周期方法执行顺序
![生命周期方法执行顺序](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/a7882084092c4259943880eb14c9405d~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

所有的生命周期方法都支持 async

生命周期用法举例：

![@nestjs/typeorm](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/53af54ef4fcc4e5c8314979e3e87d3f4~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![@nestjs/mongoose](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/67a26e1870004d419fdbdd468caa47ec~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

一般都通过 moduleRef 取出一些 provider 来销毁，比如关闭连接。
