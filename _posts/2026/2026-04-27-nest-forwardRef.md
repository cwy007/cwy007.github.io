---
layout: post
title: Module 和 Provider 的循环依赖如何处理？
subtitle: 先各自创建，再用 forwardRef 关联。forwardRef 是”实在拆不开时的兜底方案”，不是首选方案。
date: 2026-04-27 19:39:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## 什么是循环依赖

循环依赖（Circular Dependency）指的是两个或多个模块/服务互相引用对方：

- **Module 层面**：`AModule` 的 `imports` 里有 `BModule`，而 `BModule` 的 `imports` 里又有 `AModule`
- **Provider 层面**：`AService` 的构造函数里注入 `BService`，而 `BService` 的构造函数里又注入 `AService`

JavaScript 模块加载时，一旦遇到循环引用，**后被加载的那一端拿到的会是 `undefined`**。Nest 的 IoC 容器在解析依赖时也会因此报错：

```text
A circular dependency between classes has been detected.
```

## 思路：先各自创建，再用 forwardRef 关联

Nest 给的解决办法是 `forwardRef()`：先让两端都能独立完成 module / class 定义（**延迟解析**对方的引用），等容器构建完成后再把两者真正关联起来。

> 一句话：`forwardRef(() => X)` = "我现在还拿不到 X，等用的时候再去问容器要"。

## 业务场景：用户与订单互相引用

电商场景里这种循环非常常见：

- `UserService` 要查"该用户的订单数"——依赖 `OrderService`
- `OrderService` 要在创建订单时校验"用户是否被冻结"——依赖 `UserService`

### 1. Provider 之间的循环依赖

直接互相注入会启动失败：

```typescript
// ❌ 会抛 circular dependency 错误
@Injectable()
export class UserService {
  constructor(private readonly orderService: OrderService) {}
}

@Injectable()
export class OrderService {
  constructor(private readonly userService: UserService) {}
}
```

用 `forwardRef` + `@Inject` 改造：

```typescript
// user.service.ts
import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { OrderService } from "../order/order.service";

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  async getProfile(userId: string) {
    const orderCount = await this.orderService.countByUser(userId);
    return { userId, orderCount };
  }

  async isFrozen(userId: string) {
    return false;
  }
}
```

```typescript
// order.service.ts
import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { UserService } from "../user/user.service";

@Injectable()
export class OrderService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async create(userId: string, dto: { skuId: string }) {
    if (await this.userService.isFrozen(userId)) {
      throw new Error("账号已冻结");
    }
    // ... 创建订单
  }

  async countByUser(_userId: string) {
    return 0;
  }
}
```

要点：

- **两端都要包**`forwardRef`，缺一不可
- 必须配合 **`@Inject(...)` 显式声明**（光靠类型推断的构造函数注入不够，因为此时类还未完全定义）

### 2. Module 之间的循环依赖

`UserModule` 导出 `UserService` 给 `OrderModule` 用，反过来 `OrderModule` 也要导出 `OrderService` 给 `UserModule` 用：

```typescript
// user.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { UserService } from "./user.service";
import { OrderModule } from "../order/order.module";

@Module({
  imports: [forwardRef(() => OrderModule)],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

```typescript
// order.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { OrderService } from "./order.service";
import { UserModule } from "../user/user.module";

@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

要点：

- `imports` 数组里包 `forwardRef(() => OtherModule)`
- `exports` 不需要 `forwardRef`（它只导出本模块自己的 provider）

### 3. Provider 注入也要 forwardRef

注意 Module 包 `forwardRef` 不会自动让 Provider 注入也生效——**两层都要单独处理**：

```typescript
// 完整的 UserModule
@Module({
  imports: [forwardRef(() => OrderModule)], // 模块层
  providers: [UserService], // UserService 内部还要 @Inject(forwardRef(() => OrderService))
  exports: [UserService],
})
export class UserModule {}
```

## forwardRef 的原理（一句话版）

`forwardRef(fn)` 返回的不是 class 本身，而是一个 `{ forwardRef: fn }` 包装对象。Nest 容器在第一遍扫描依赖图时遇到它就跳过；等所有 module / provider 都注册完后，再调用 `fn()` 拿到真正的引用，完成最终绑定。

```typescript
// 简化的伪代码
function forwardRef(fn: () => Type) {
  return { forwardRef: fn };
}
```

这就是为什么"先单独创建 2 个模块，再将 2 者关联起来"——`forwardRef` 把"关联"这一步从**编译期/加载期**推迟到了**容器构建期**。

<details markdown="1">

<summary><h4>QA: 能不能不用 forwardRef？</h4>💬点击展开/收起</summary>

通常更好的办法是**重构掉循环依赖**，循环依赖往往意味着设计有问题：

1. **抽出第三个共享服务**：把 `UserService` 和 `OrderService` 都依赖的逻辑抽到 `SharedService`（或 `UserOrderFacadeService`），让两者只依赖第三方
2. **用事件解耦**：`OrderService` 创建订单后发 `OrderCreatedEvent`，`UserService` 订阅事件更新用户状态，而不是直接调用
3. **下沉到数据层**：让 `OrderService` 直接通过 `UserRepository` 查冻结状态，而不是经过 `UserService`

`forwardRef` 是"实在拆不开时的兜底方案"，不是首选方案。

</details>

## 踩坑提示

1. **两端必须都用 `forwardRef`**：只在一端写不会生效
2. **Provider 注入循环依赖时必须配合 `@Inject`**：纯靠类型反射的构造函数注入会失败
3. **`exports` 不要包 `forwardRef`**：只在 `imports` 和 `@Inject` 里用
4. **检查是否真的需要循环依赖**：先尝试重构，`forwardRef` 是最后手段
5. **启动报错信息要看清**：`A circular dependency between classes has been detected` 通常会附带具体路径，按链路排查更快

## 小结

- 循环依赖时，JS 模块加载顺序导致一端拿到 `undefined`，IoC 容器无法解析
- `forwardRef(() => X)` 把"获取 X"延迟到容器构建完成后，两端都用即可解开死锁
- **Module 层**：`imports: [forwardRef(() => OtherModule)]`
- **Provider 层**：`@Inject(forwardRef(() => OtherService))`
- 优先重构（共享服务 / 事件 / 下沉数据层），`forwardRef` 作为兜底
