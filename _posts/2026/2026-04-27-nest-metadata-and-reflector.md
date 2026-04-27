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
- 创建的时候，通过 design:paramtypes 拿到构造器参数的类型，这样就知道怎么注入依赖了

nest 核心实现原理：通过装饰器给 class 或者对象添加 metadata，并且开启 ts 的 emitDecoratorMetadata
来自动添加类型相关的 metadata，运行的时候通过这些元数据来实现依赖的扫描，对象的创建等功能。

疑问：nest 为什么暴露 SetMetadata 这样一个底层的 metadata api 出来呢？

- 这部分 metadata 是可以在代码中取出来的
- @UseGuards
- @UseInterceptors
- 拿到 metadata 有什么用？

---

## 通过代码片段揭开 Nest 实现原理的面纱

### 1. 一切的基础：`Reflect.metadata` API

Nest 的所有装饰器（`@Controller`、`@Injectable`、`@Module` 等等），其本质都是给目标 class 或方法上挂了一些**元数据（metadata）**。这套 API 主要是 `Reflect.defineMetadata`（写入）和 `Reflect.getMetadata`（读取）。

> 注意：`Reflect.metadata` 目前还处于 TC39 提案阶段，并未原生支持。在 Nest 中需要通过引入 `reflect-metadata` 这个 polyfill 包才能使用：

```typescript
// main.ts 入口处通常会引入
import 'reflect-metadata';
```

最简单的体会一下它的用法：

```typescript
// 写入元数据
Reflect.defineMetadata('role', 'admin', SomeClass);

// 取出元数据
const role = Reflect.getMetadata('role', SomeClass);
console.log(role); // 'admin'
```

Nest 内置的 `@Controller('users')` 这类装饰器，本质上就是对 `Reflect.defineMetadata` 的二次封装——把路径 `'users'` 写到了 class 的 `path` 这个 metadata key 下而已。

### 2. 解答疑问一：依赖是如何被自动注入的？

这就涉及到 TypeScript 的一个关键编译选项 `emitDecoratorMetadata`。

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true   // 关键开关
  }
}
```

开启它之后，**只要 class（或方法）上有任意一个装饰器**，TS 编译器就会自动给这个 class 写入 3 类元数据：
* **`design:type`**：被装饰目标的类型
* **`design:paramtypes`**：构造函数（或方法）的参数类型数组
* **`design:returntype`**：方法的返回值类型

我们写一段 Service 注入示例感受一下：

```typescript
@Injectable()
export class UsersService {
  findAll() { return ['Tom', 'Jerry']; }
}

@Controller('users')
export class UsersController {
  // 此时只声明了类型 UsersService，没人显式告诉 Nest 要注入它
  constructor(private readonly usersService: UsersService) {}
}
```

Nest 启动时是这样工作的：

```typescript
// 这是 Nest IoC 内部实现的简化版伪代码
const paramTypes = Reflect.getMetadata('design:paramtypes', UsersController);
// paramTypes => [UsersService]   👈 这就是 TS 编译时自动注入的类型信息

// 然后从 IOC 容器中找到 UsersService 实例，作为参数实例化 Controller
const dependencies = paramTypes.map(type => container.get(type));
const controllerInstance = new UsersController(...dependencies);
```

**所以"依赖怎么注入"的本质就是：TS 编译器把构造器的参数类型自动写到了元数据里，Nest 扫描时取出来再去 IoC 容器中匹配实例**。

### 3. 解答疑问二：`@SetMetadata` 暴露给开发者用，能干嘛？

虽然 Nest 内置了一系列装饰器，但有时候我们需要在路由上**附加自定义业务标签**——比如某个接口需要哪种角色才能访问，让 Guard 里面去消费这种标签。这时候就需要 `@SetMetadata`。

**业务场景：基于角色的权限控制（RBAC）**

#### 步骤 1：用 `@SetMetadata` 给路由打标签
```typescript
import { SetMetadata } from '@nestjs/common';

// 自定义一个语义化装饰器：声明哪些角色才能访问
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('articles')
export class ArticleController {
  @Post()
  @Roles('admin', 'editor') // 只有 admin 或 editor 才能访问
  create() { return '创建成功'; }
}
```

#### 步骤 2：在 Guard 中通过 `Reflector` 把 metadata 取出来
Nest 提供了一个 `Reflector` 工具类，专门用来读取这些自定义元数据：

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 从被请求的方法上取出 'roles' 这个 metadata
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true; // 接口没声明角色，放行

    const { user } = context.switchToHttp().getRequest();
    // 判断当前登录用户的角色，是否在允许的列表中
    return requiredRoles.some(role => user?.roles?.includes(role));
  }
}
```

#### 步骤 3：通过 `@UseGuards` 应用 Guard

```typescript
@Controller('articles')
@UseGuards(RolesGuard)   // 启用 Guard，让它去读 metadata 完成拦截
export class ArticleController {
  @Post()
  @Roles('admin', 'editor')
  create() { return '创建成功'; }
}
```

`@UseInterceptors` 的应用模式也几乎完全一样——只是把守卫换成了拦截器去消费这些 metadata。

### 总结

理解 Nest 的整套实现原理可以串成一条主线：

1. **装饰器** ≈ `Reflect.defineMetadata` 的语法糖；
2. **TS 编译器** 在开启 `emitDecoratorMetadata` 后自动注入类型相关的元数据（`design:paramtypes` 等）；
3. Nest 启动时**扫描这些元数据** 完成依赖分析、实例化对象，并放进 IoC 容器；
4. 业务侧通过 `@SetMetadata` + `Reflector` 在 **Guard / Interceptor** 中读取自定义标签，实现 AOP 风格的权限校验、日志、缓存等横切能力。

**理解了 metadata，Nest 的实现原理就一通百通了。**
