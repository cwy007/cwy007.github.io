---
layout:     post
title:      一张后端架构图
subtitle:   学习各种后端中间件
date:       2026-04-25 17:59:00
author:     "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NodeJS
  - NestJS
---

![一张后端架构](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425180339027.png)

## 后端中间件

- mysql
- redis
- RabbitMQ
- Nacos
- ElasticSearch
- ...

## 设计模式

nestjs 中用到的适配器设计模式

![适配器设计模式](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425183829906.png)

Nest 内构建复杂对象很多地方都用到了 builder 的设计模式

![builder 的设计模式](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425184709448.png)

[设计模式之美 113 - todo](https://time.geekbang.org/column/article/171767)

## nestjs 概念图解

请求一般会传递json数据，通过 dto - data transfer object 来接收

![请求json-dto](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425185604886.png)

- controller 是处理路由和解析请求参数的

业务逻辑处理不在controller中，是在 service 中

![service处理业务逻辑](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425185913795.png)

- service 是业务逻辑的具体实现，eg：操作数据库

NestJS 有模块划分，每个模块里都包含controller 和 service

![模块里都包含controller 和 service](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425190400847.png)

## 为什么是 providers 不是 services 呢？

应为 Nest 实现了一套依赖注入机制，叫做 IoC（Inverse of Control）反转控制。你只需要声明依赖了
什么就行，不需要手动去 new 依赖，NestJS的IoC 容器会自动给你创建并注入依赖。
在 @Module 里的 providers 数据里，是声明要往 IoC 容器里提供的对象，所以叫做 providers。

IoC会自动从容器中查找实例来注入，注入的方式有2种：

- 属性注入 - @Inject 写在属性上的依赖
- 构造器注入 - 写在构造器里的依赖

效果一样，只是注入的时机不一样。

![注入的方式有2种](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425191330317.png)

- any module - 没有模块都会包含下面这些内容：
-- dto        - 封装请求参数
-- entities   - 封装对应数据库表的实体
-- controller - 处理路由和解析参数
-- module
-- service    - 处理业务逻辑，如：操作数据库

nestjs MVC

![nestjs MVC](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425192408471.png)

controller 接收请求参数，交给model处理 - service 业务逻辑，repository数据库访问，然后，返回View，也就是响应。

## AOP机制（Aspect Oriented Programming 面向切面编程） - 在多个请求响应流程中可以复用的逻辑

![AOP机制](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425192901962.png)

- Middleware
- Guard
- Interceptor       - 记录请求响应时间
- Pipe
- Exception Filter

![5中AOP](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/AOP%E6%89%A7%E8%A1%8C%E9%A1%BA%E5%BA%8F.jpg)

在目标 controller 的 handler 前后，额外加一段逻辑

**学习顺序：**

- @nestjs/cli 的使用
- nestjs 核心概念
- 数据库
- orm 框架
- 项目实战
