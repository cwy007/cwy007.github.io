---
layout:     post
title:      "Gem: sidekiq清空队列的两种方式"
subtitle:   "一是使用sidekiq的api，二是直接操作redis"
date:       2020-04-29 17:04:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Ruby
  - Gem
---

##### 使用sidekiq的api清空队列的任务

sidekiq里有提供操作队列的api，首先引入 `require 'sidekiq/api'`
获取所有队列：`Sidekiq::Queue.all`
获取默认队列：`Sidekiq::Queue.new# the "default" queue`
按名称获取队列：`Sidekiq::Queue.new("mailer")`
清空队列的所有任务：`Sidekiq::Queue.new.clear`

按条件来删除队列的任务：

```ruby
queue=Sidekiq::Queue.new("mailer")
queue.each do |job|
  job.klass# => 'MyWorker'  job.args# => [1, 2, 3]
  job.delete if    job.jid=='abcdef1234567890'
end
```

##### 直接操作redis来删除队列里的任务

首先获取配置文件config，再连接redis，这里使用了redis的Gem包

```ruby
redis= Redis.new(:host => config['host'], :port => config['port'],
  :db=> config['db'],:password => config['password'])
```

由于queues用的是set类型的数据，所以要用srem来删除相应的数据
redis.srem(‘queues’, ‘队列的名称’)  # 这种情况会直接删除该名称的队列

##### job lifecycle

![sidekiq_job_lifecycle](/img/cwy/in-post/sidekiq_job_lifecycle.png)

##### 参考链接

1. <https://www.jianshu.com/p/a18b6e941516>
2. <https://www.dazhuanlan.com/2019/12/10/5dee8dc62bafd/>