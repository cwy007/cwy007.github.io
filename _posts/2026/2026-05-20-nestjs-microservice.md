---
layout: post
title: NestJS 微服务 (Microservices)
subtitle: NestJS 提供了内置的微服务架构支持，抽象了不同的传输层（TCP、Redis、Kafka、gRPC等），让构建分布式系统变得非常优雅。
date: 2026-05-20 18:18:00
author: "chanweiyan"
# header-img: "img/cwy/nestjs-microservice.png"
catalog: true
tags:
  - NestJS
  - 微服务
---

## 什么是微服务架构？

在单体架构（Monolithic）中，所有的业务逻辑都打包在一个应用中。而微服务架构（Microservices）将一个庞大的应用拆分为多个独立的服务，这些服务可以独立开发、测试、部署和扩展。

NestJS 提供了开箱即用的微服务支持，它抽象了底层网络通信细节，无论使用 TCP、Redis 还是 Kafka，开发者的上层业务代码几乎是一致的。

## 支持的传输层 (Transporters)

NestJS 支持多种传输协议（Transporters），可以根据业务特点进行选择：

1. **TCP**: 默认内置，适合简单的点对点通信。
2. **Redis**: 使用发布/订阅（Pub/Sub）机制，适合广播消息。
3. **NATS**: 极轻量级的高性能消息系统。
4. **MQTT**: 常用于物联网（IoT）场景。
5. **RabbitMQ / AMQP**: 适合高级的路由和消息队列持久化场景。
6. **Kafka**: 分布式流处理平台，适合处理大数据量的流计算。
7. **gRPC**: 基于 HTTP/2 协议，使用 Protocol Buffers 进行高效序列化，跨语言支持极好。

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 通信方式分类</h4>💬点击展开/收起</summary>

Nest 微服务通信主要有两种模式：

- **请求-响应模式 (Request-Response)**：客户端发送消息后，会等待服务端的响应，类似于 HTTP 请求。使用的是 `@MessagePattern`。
- **基于事件模式 (Event-based)**：客户端发送消息（触发事件）后，不需要等待服务端的响应（Fire and Forget）。使用的是 `@EventPattern`。

</details>

<!-- #endregion -->

## 创建一个 NestJS 微服务

首先需要安装微服务核心包：

```bash
npm i --save @nestjs/microservices
```

### 1. 修改启动文件 (main.ts)

通过 `NestFactory.createMicroservice` 方法初始化微服务，并在 `options` 中指定传输层和配置。

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 8877, // 微服务监听的端口
      },
    },
  );
  await app.listen();
  console.log('Microservice is listening on port 8877');
}
bootstrap();
```

### 2. 编写微服务控制器

在控制器中，我们使用 `@MessagePattern` 来监听请求-响应模式的消息，使用 `@EventPattern` 监听事件。

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern } from '@nestjs/microservices';

@Controller()
export class MathController {
  
  // 监听 'sum' 消息
  @MessagePattern({ cmd: 'sum' })
  accumulate(data: number[]): number {
    return (data || []).reduce((a, b) => a + b, 0);
  }

  // 监听 'user_created' 事件
  @EventPattern('user_created')
  async handleUserCreated(data: Record<string, unknown>) {
    // 处理独立事件，比如发送邮件等
    console.log('User created:', data);
  }
}
```

## 客户端调用微服务

要与微服务通信，Nest 提供了一个依赖注入的客户端类：`ClientProxy`。

### 1. 注册客户端

在需要调用微服务的模块（比如 API 网关所在的 Module）中，使用 `ClientsModule` 注册微服务客户端。

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE', // 注入令牌
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1', // 对应微服务的地址
          port: 8877,
        },
      },
    ]),
  ],
  controllers: [AppController]
})
export class AppModule {}
```

### 2. 发起调用

在 Controller 或 Service 中注入 `ClientProxy`。调用 `.send` 方法执行请求-响应模式，调用 `.emit` 发送事件。

```typescript
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Controller()
export class AppController {
  constructor(
    @Inject('MATH_SERVICE') private client: ClientProxy,
  ) {}

  @Get('sum')
  sum(): Observable<number> {
    // 这里的请求模式需要匹配微服务端的 { cmd: 'sum' }
    const pattern = { cmd: 'sum' };
    const payload = [1, 2, 3, 4, 5];
    
    // send() 返回的是一个 RxJS Observable
    return this.client.send<number>(pattern, payload);
  }

  @Get('notify')
  notifyUser(): string {
    // 触发事件模式，无需关心返回结果
    this.client.emit('user_created', { email: 'test@example.com' });
    return 'Event emitted';
  }
}
```

## 总结

NestJS 的微服务模块极大地降低了搭建分布式系统的门槛。它的优势不仅在于开箱即用的模块化设计，还在于它巧妙地通过统一的 API 掩盖了各种底层传输层实现的差异，使得开发者能够在无需更改业务逻辑代码的情况下，随意切换各种底层通信协议（比如从 TCP 切换到 Redis，然后再升级到 Kafka）。

同时需要注意的是，因为涉及到网络请求的异步通信，微服务之间返回的数据大多数情况封装在 RxJS 的 `Observable` 对象中。对于开发人员来讲，想要深度掌握 Nest 微服务，也要具备一定的 RxJS 知识基础。
