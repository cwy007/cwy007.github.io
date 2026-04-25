---
layout:     post
title:      "Gem: Sidekiq 如何处理异步任务"
subtitle:   ""
date:       2020-04-29 17:17:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Ruby
  - Gem
---


##### 整体的架构

介绍任务的入队过程、Sidekiq 任务在 Redis 中的存储方式和消费者对任务的处理过程，除此之外，文章将介绍 Sidekiq 中间件的实现以及任务重试的原理。

![sidekiq_job_lifecycle](/img/cwy/in-post/2017-08-28-Middlewares-Client-Redis-Sidekiq-Worker-1.jpg)

##### 参考链接

1. <https://draveness.me/sidekiq/>
