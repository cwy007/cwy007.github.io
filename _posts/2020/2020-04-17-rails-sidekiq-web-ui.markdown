---
layout:     post
title:      "Gem: 显示 Sidekiq Web UI"
subtitle:   "显示出sidekiq web ui的相关操作"
date:       2020-04-17 10:04:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Ruby
  - Gem
---

#### Sidekiq

##### Gemfile

```ruby
gem 'sidekiq', '~> 6.0', '>= 6.0.6'
gem 'sinatra', '~> 2.0', '>= 2.0.8.1'
```

##### config/routes.rb

```ruby
require 'sidekiq/web'
mount Sidekiq::Web => '/sidekiq'
```

##### bundle exec rails server

<http://localhost:3000/sidekiq>

![sidekiq-web-ui](/img/cwy/in-post/sidekiq-web-ui.png)

##### 参考链接

1. <https://github.com/mperham/sidekiq/wiki/Monitoring>