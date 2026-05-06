---
layout: post
title: nestjs 快速掌握 Redis
subtitle:
date: 2026-05-06 16:23:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - Redis
---

在本文中，我们将探讨如何在 NestJS 项目中快速集成和使用 Redis。无论是作为缓存、消息代理（Pub/Sub）还是实现分布式锁，Redis 都是现代微服务架构中不可或缺的利器。

## 为什么在 NestJS 中使用 Redis？

1. **高性能缓存**：大幅减少数据库查询负担，提高响应速度。
2. **状态共享**：在分布式系统或集群部署中共享 Session、Token 等状态。
3. **消息队列 / 发布订阅（Pub/Sub）**：支持微服务之间的异步通信。
4. **可靠和丰富的数据结构**：支持哈希、列表、集合等，能适应各种复杂的业务场景。

## 1. 安装依赖

在 NestJS 中，我们通常使用 `ioredis` 作为客户端，因为它对集群、Sentinel 支持得非常好，并且 API 友好。

```bash
npm install ioredis
npm install -D @types/ioredis
```

如果我们需要将 Redis 用作 NestJS 原生的缓存管理器，还可以安装：

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet
```

本篇文章我们将主要展示如何**直接封装和使用 `ioredis`**，因为这种方式在实际的复杂业务中更灵活。

## 2. 封装 Redis 模块

为了在 NestJS 中优雅地使用 Redis，我们将创建一个专用的全局 `RedisModule`。

### 2.1 创建基础模块和 Service

使用 CLI 生成模块：

```bash
nest g module redis
nest g service redis
```

### 2.2 注入 ioredis 客户端

在 `redis.module.ts` 中，我们通过自定义 Provider 将 `ioredis` 初始化，并将其作为全局模块，方便全站注入。

```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        // 在实际应用中，这里应该从 ConfigService 读取环境变量
        return new Redis({
          host: '127.0.0.1',
          port: 6379,
          // password: 'your_password',
          // db: 0,
        });
      },
    },
  ],
  exports: [RedisService, 'REDIS_CLIENT'],
})
export class RedisModule {}
```

> **提示**：加上 `@Global()` 装饰器后，只需要在 `AppModule` 引入一次 `RedisModule`，其他任何模块都可以直接注入 `RedisService` 而无需重复引入。

### 2.3 编写 RedisService 包装操作

在 `redis.service.ts` 中，我们依赖注入刚才初始化的 `REDIS_CLIENT`：

```typescript
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  /**
   * 获取原生的 Redis 客户端实例
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * 写入字符串型缓存
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒），可选
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.set(key, value, 'EX', ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  /**
   * 读取字符串型缓存
   */
  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  /**
   * 模块销毁时断开连接
   */
  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
```

## 3. 在业务模块中使用 Redis

有了全局的 `RedisModule`，我们就可以在任何业务 Service 中使用它了。例如，在一个处理用户查询的服务中实现缓存：

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UserService {
  constructor(private readonly redisService: RedisService) {}

  async getUserById(id: number) {
    const cacheKey = `user:info:${id}`;

    // 1. 尝试从 Redis 缓存中获取
    const cachedUser = await this.redisService.get(cacheKey);
    if (cachedUser) {
      console.log('Hitting cache!');
      return JSON.parse(cachedUser);
    }

    // 2. 如果没有缓存，则从数据库读取（模拟 DB 耗时）
    console.log('Querying Database...');
    const userFromDb = { id, name: 'Alice', age: 25 };

    // 3. 将结果写入 Redis 并设置 1 小时过期
    await this.redisService.set(cacheKey, JSON.stringify(userFromDb), 3600);

    return userFromDb;
  }
}
```

## 4. 进阶处理：使用 NestJS 拦截器做整页缓存

通常，对于高并发且更新不频繁的查询接口，我们需要非常方便无侵入的缓存。我们可以使用原生的 Cache 模块结合拦截器。

如果你在步骤一中安装了 `@nestjs/cache-manager` 和 `cache-manager-redis-yet`，可以直接对路由生效：

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('products')
// 应用拦截器
@UseInterceptors(CacheInterceptor)
export class ProductController {

  @Get('hot')
  // 覆盖默认键名
  @CacheKey('hot_products_cache')
  // 设置过期时间为 600 秒
  @CacheTTL(600)
  async getHotProducts() {
    // 耗时逻辑
    return ['product_A', 'product_B'];
  }
}
```

## 5. 小结

在 NestJS 中集成 Redis 的关键就在于如何把原生的 Redis Client（如 `ioredis`）注册到 IoC 容器中。
- 直接封装 `ioredis` 适合于需要各种数据结构操作、Lua 脚本、事务和分布式锁等**深度定制场景**。
- 使用 `@nestjs/cache-manager` 与 `CacheInterceptor` 适合需要**纯粹 API 响应缓存**的无侵入场景。

根据实际业务情况选择，或者混合使用。希望本文对你有所帮助！
