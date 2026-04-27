---
layout: post
title: nestjs Metadata & Reflector
subtitle: Nest 的实现原理是通过装饰器给 class 或对象添加元数据，然后，初始化的时候取出这些元数据，进行依赖分析，创建对应的实例对象
date: 2026-04-27 16:51:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

### nest 实现的核心是 Relfect.metadata 的 api

疑问：只是通过装饰器声明了一下，启动nest应用，这时候对象就给创建好了，依赖也给注入了，这是怎么实现的呢？

- "design:type"
- "design:paramtypes"
- "design:returntype"

- 通过 Refelct.metadata 获取类和对象的元数据

疑问：依赖的扫描可以通过 metadata 数据，但是创建对象需要知道构造器的参数，这部分 metadata 数据是如何添加的？

- typescript 支持编译时自动添加一些 metadata 数据
- ts 编译选项 emitDecoratorMetadata，开启它会自动添加一些元数据
- 创建的时候，通过 design:paramtypes 拿到构造器材书的类型，这样就知道怎么注入依赖了

nest 核心实现原理：通过装饰器给 class 或者对象添加 metadata，并且开启 ts 的 emitDecoratorMetadata
来自动添加类型相关的 metadata，运行的时候通过这些元数据来实现依赖的扫描，对象的创建等功能。

疑问：nest 为什么暴露 SetMetadata 这样一个底层的 metadata api 出来呢？

- 这部分 metadata 是可以在代码中取出来的
- @UseGuards
- @UseInterceptors
- 拿到 metadata 有什么用？
