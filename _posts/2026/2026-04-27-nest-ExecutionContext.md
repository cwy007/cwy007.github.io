---
layout: post
title: nestjs 切换不同上下文
subtitle: 为了让 Filter、Guard、Interceptor 支持 http、ws、rpc 等场景下复用，Nest 设计了 ArgumentsHost 和 ExecutionContext 两个类。
date: 2026-04-27 18:01:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## ArgumentsHost：抹平多协议参数差异

`ArgumentsHost` 是一个"参数容器"，它把不同协议下传给 handler 的参数统一封装起来，再提供方法让你按需切换到具体协议拿对应的对象。

核心 API：

| 方法               | 作用                                                   |
| ------------------ | ------------------------------------------------------ |
| `getType()`        | 返回当前上下文类型：`'http'` / `'ws'` / `'rpc'`        |
| `getArgs()`        | 返回原始参数数组                                       |
| `getArgByIndex(i)` | 按下标取参数                                           |
| `switchToHttp()`   | 切到 HTTP 上下文，可拿 `request` / `response` / `next` |
| `switchToWs()`     | 切到 WebSocket 上下文，可拿 `client` / `data`          |
| `switchToRpc()`    | 切到微服务上下文，可拿 `data` / `context`              |

最小示例：

```typescript
import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common";

@Catch()
export class AnyExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === "http") {
      const res = host.switchToHttp().getResponse();
      res.status(500).json({ message: "http error" });
    } else if (host.getType() === "ws") {
      const client = host.switchToWs().getClient();
      client.emit("error", { message: "ws error" });
    } else if (host.getType() === "rpc") {
      // 微服务下通常通过 RxJS 的 throwError 抛出
    }
  }
}
```

## ExecutionContext：在 ArgumentsHost 之上多了"类/方法元信息"

`ExecutionContext` 直接继承自 `ArgumentsHost`，额外提供两个方法：

```typescript
interface ExecutionContext extends ArgumentsHost {
  getClass<T = any>(): Type<T>; // 当前 controller / gateway 类
  getHandler(): Function; // 当前正在执行的方法
}
```

为什么需要这两个方法？因为 Guard 和 Interceptor 经常要配合 `Reflector` 读取**装饰器元数据**（例如 `@Roles('admin')`、`@Public()`），而读元数据必须先拿到目标类或方法。

所以 Nest 的设计是：

- **Exception Filter** 的 `catch(exception, host)` 拿到的是 `ArgumentsHost` —— 异常发生时不一定有完整的 handler 上下文，只需要"切换协议返回响应"即可
- **Guard / Interceptor** 的 `canActivate(context)` / `intercept(context, next)` 拿到的是 `ExecutionContext` —— 它们需要按方法/类粒度读元数据来判断行为

## ExecutionContext 与 ArgumentsHost 的关系

一句话：**`ArgumentsHost` 是协议适配器，`ExecutionContext` = 协议适配器 + 反射入口**。

```text
       ┌──────────────────────────┐
       │      ArgumentsHost       │   getType / switchToHttp / switchToWs / switchToRpc
       └────────────▲─────────────┘
                    │ extends
       ┌────────────┴─────────────┐
       │     ExecutionContext     │   + getClass / getHandler
       └──────────────────────────┘
```

三种协议下 `switchToXxx()` 拿到的对象对比：

| 上下文       | 切换方法         | 可拿到的对象                                             |
| ------------ | ---------------- | -------------------------------------------------------- |
| HTTP         | `switchToHttp()` | `getRequest()` / `getResponse()` / `getNext()`           |
| WebSocket    | `switchToWs()`   | `getClient()`（Socket 实例） / `getData()`（消息体）     |
| Microservice | `switchToRpc()`  | `getData()`（消息体） / `getContext()`（如 NatsContext） |

正是这套抽象，让 AOP 三件套（Guard / Interceptor / Exception Filter）能做到**一次编写、HTTP/WS/RPC 通吃**。

## 业务场景：电商订单系统统一异常过滤器

假设我们的订单服务同时通过三种通道暴露能力：

- **HTTP**：给 C 端用户下单
- **WebSocket**：给商家端实时推送订单事件，同时也接收"接单"消息
- **TCP 微服务**：给内部库存、支付、物流系统调用

这三种通道在执行下单时都可能抛出业务异常（例如"库存不足""余额不足""商品已下架"）。我们希望：

1. 业务代码只关心"扔异常"，不关心当前是 http、ws 还是 rpc
2. 异常的日志格式统一
3. 不同通道按自己的协议返回合适的响应

### 1. 自定义业务异常

```typescript
// business.exception.ts
export class BusinessException extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
```

### 2. 跨上下文复用的 Exception Filter

这是本文的核心代码——**同一个 Filter 同时支持 http / ws / rpc**：

```typescript
// business-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Response } from "express";
import { Socket } from "socket.io";
import { throwError } from "rxjs";
import { BusinessException } from "./business.exception";

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BusinessExceptionFilter.name);

  catch(exception: BusinessException, host: ArgumentsHost) {
    const payload = { code: exception.code, message: exception.message };

    // 公共逻辑：统一日志（含上下文类型）
    this.logger.warn(
      `[${host.getType()}] business error: ${exception.code} - ${exception.message}`,
    );

    switch (host.getType()) {
      case "http": {
        const res = host.switchToHttp().getResponse<Response>();
        return res.status(400).json(payload);
      }
      case "ws": {
        const client = host.switchToWs().getClient<Socket>();
        // 注意：客户端可能已断开，emit 会静默失败
        return client.emit("order:error", payload);
      }
      case "rpc": {
        // 微服务通道下用 RxJS 的 throwError，让上游能拿到错误
        return throwError(() => payload);
      }
    }
  }
}
```

### 3. 三个入口共用同一个 Filter 与同一个 Service

业务层只抛异常，完全不感知协议：

```typescript
// orders.service.ts
import { Injectable } from "@nestjs/common";
import { BusinessException } from "./business.exception";

@Injectable()
export class OrdersService {
  async create(dto: { skuId: string; count: number }) {
    const stock = await this.queryStock(dto.skuId);
    if (stock < dto.count) {
      throw new BusinessException("STOCK_NOT_ENOUGH", "库存不足");
    }
    // ... 正常下单逻辑
    return { orderId: "ORD_" + Date.now() };
  }

  private async queryStock(_skuId: string) {
    return 0;
  }
}
```

HTTP 入口：

```typescript
// orders.controller.ts
import { Body, Controller, Post, UseFilters } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { BusinessExceptionFilter } from "./business-exception.filter";

@Controller("orders")
@UseFilters(BusinessExceptionFilter)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: { skuId: string; count: number }) {
    return this.ordersService.create(dto);
  }
}
```

WebSocket 入口：

```typescript
// orders.gateway.ts
import { UseFilters } from "@nestjs/common";
import { MessageBody, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { OrdersService } from "./orders.service";
import { BusinessExceptionFilter } from "./business-exception.filter";

@WebSocketGateway()
@UseFilters(BusinessExceptionFilter)
export class OrdersGateway {
  constructor(private readonly ordersService: OrdersService) {}

  @SubscribeMessage("order:create")
  create(@MessageBody() dto: { skuId: string; count: number }) {
    return this.ordersService.create(dto);
  }
}
```

TCP 微服务入口：

```typescript
// orders.microservice.controller.ts
import { Controller, UseFilters } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { OrdersService } from "./orders.service";
import { BusinessExceptionFilter } from "./business-exception.filter";

@Controller()
@UseFilters(BusinessExceptionFilter)
export class OrdersMicroserviceController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern("orders.create")
  create(@Payload() dto: { skuId: string; count: number }) {
    return this.ordersService.create(dto);
  }
}
```

效果：`OrdersService` 抛出的同一个 `BusinessException('STOCK_NOT_ENOUGH', '库存不足')`，

- HTTP 客户端拿到 `400 { code: 'STOCK_NOT_ENOUGH', message: '库存不足' }`
- WebSocket 客户端会收到 `order:error` 事件，payload 同上
- 微服务调用方在 RxJS 流上能 `catchError` 到 `{ code, message }`

一份 Filter，三个通道复用，这就是 `ArgumentsHost` 的价值。

### 4. 顺带：用 ExecutionContext 写跨协议 RolesGuard

Guard 同样可以跨协议复用，但因为要读 `@Roles()` 装饰器元数据，它拿到的是 `ExecutionContext`：

```typescript
// roles.guard.ts
import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1) 用 ExecutionContext 独有的 getHandler() 读元数据
    const required = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!required?.length) return true;

    // 2) 再用从 ArgumentsHost 继承来的 switchToXxx() 拿当前用户
    let user: { roles?: string[] } | undefined;
    switch (context.getType()) {
      case "http":
        user = context.switchToHttp().getRequest().user;
        break;
      case "ws":
        user = context.switchToWs().getClient().data?.user;
        break;
      case "rpc":
        user = context.switchToRpc().getContext()?.user;
        break;
    }

    return !!user?.roles?.some((r) => required.includes(r));
  }
}
```

这里能清晰看到 `ExecutionContext` 的两层能力：

- `getHandler()` —— 来自 `ExecutionContext` 自身，用于配合 `Reflector` 读元数据
- `switchToHttp/Ws/Rpc()` —— 来自父类 `ArgumentsHost`，用于按协议取参数

<details markdown="1">

<summary><h4>QA: 为什么 ExceptionFilter 拿到的是 ArgumentsHost 而不是 ExecutionContext？</h4>💬点击展开/收起</summary>

异常可能在 pipe、guard 之外的任意阶段抛出，此时 Nest 不一定能稳定地提供"目标方法/类"信息；并且过滤器的核心职责是"切换协议返回响应"，不需要读方法级元数据。所以 Nest 只给它较窄的 `ArgumentsHost`。

如果确实需要读元数据，可以在 Filter 里手动拿到 `host` 后通过 `(host as ExecutionContext).getHandler?.()` 兜底，但官方不建议依赖这种行为。

</details>

## 踩坑提示

1. **WebSocket 下不要在 Filter 里 `throw`**：抛出的异常不会自动转成 socket 消息，必须通过 `client.emit()` 主动发送
2. **微服务下要返回 `throwError(...)`**：否则上游 RxJS 流不会进入 `catchError`，调用方会一直挂起
3. **`@UseFilters` 的位置**：可以挂在方法、类、或全局（`app.useGlobalFilters`）。跨协议复用最常见的做法是**全局注册**，避免每个 Controller / Gateway 都手动加

<details markdown="1">

<summary><h4>QA: "微服务下要返回 throwError(...)，否则调用方会一直挂起" 怎么理解？</h4>💬点击展开/收起</summary>

这句话讲的是 NestJS 微服务通道里"异常"的传递方式和 HTTP 完全不同。

**背景：微服务的返回值是 Observable**

Nest 的微服务（TCP / NATS / Redis / Kafka 等）底层是基于 **RxJS Observable** 在通信的。一个 `@MessagePattern` handler 的返回值，会被 Nest 包成一个 Observable 流，序列化后发回调用方；调用方拿到的也是一个 Observable：

```typescript
// 调用方
this.client.send("orders.create", dto).subscribe({
  next: (data) => console.log("成功", data),
  error: (err) => console.log("失败", err), // ← 关键：错误必须走这里
});
```

**关键点：错误必须走 Observable 的 error 通道**

RxJS 流有三种结束方式：`next` → `complete`，或 `error`。调用方的 `catchError` / `subscribe({ error })` 只会被 error 通道触发。

所以在 Filter 里必须返回一个"会发出 error 的 Observable"——也就是 `throwError(() => payload)`：

```typescript
case "rpc": {
  return throwError(() => payload); // ✅ 产生一个立即 error 的 Observable
}
```

**反面：不返回 throwError 会怎样？**

假设你写成这样：

```typescript
case "rpc": {
  // ❌ 什么都不返回，或者返回普通对象
  return payload;
}
```

或者直接 `throw payload`，会发生什么？

- 普通 `throw`：异常已经被 `@Catch` 捕获了，再 throw 一次只是冒泡到 Nest 内部，**不会变成"流上的 error 信号"**，也就发不到调用方
- 返回普通对象：Nest 会当成"业务正常返回"序列化发回去，调用方走 `next`，根本意识不到出错了
- 不返回任何东西：Nest 没有 Observable 可以订阅，**这条消息既没有 success 也没有 error**

结果就是调用方的 Observable 既不 emit `next`，也不 emit `error`，更不 `complete`——`subscribe` 一直挂着，业务逻辑就卡死了，这就是"调用方一直挂起"的含义。

**一句话总结**

HTTP 用 `res.status().json()` 直接写响应；WebSocket 用 `client.emit()` 主动推；而微服务的"返回"和"报错"都必须通过 Observable 表达，所以错误一定要 `return throwError(() => ...)`，否则错误信号根本传不出去。

</details>

## 小结

- `ArgumentsHost` 屏蔽了 http / ws / rpc 三种协议参数的差异，让你能在一处代码里通过 `getType()` 分支处理
- `ExecutionContext extends ArgumentsHost`，多出 `getClass()` / `getHandler()`，专为需要读取装饰器元数据的 Guard / Interceptor 服务
- 二者一起，构成了 Nest AOP 体系跨协议复用的基石——Filter / Guard / Interceptor **一次编写，HTTP / WebSocket / 微服务通吃**
