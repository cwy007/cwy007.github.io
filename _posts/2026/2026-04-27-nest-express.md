---
layout: post
title: nestjs express fastify
subtitle: Nest 不是 Express 的替代品，而是它的"工程化包装"。
date: 2026-04-27 20:28:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

![Nest 内部并没有直接依赖任何一个 http 处理的库，只是依赖了抽象的接口，想用什么库需要实现这些接口的适配器](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/0785a342c5be4bb281be14a2392748b1~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

>Nest 内部并没有直接依赖任何一个 http 处理的库，只是依赖了抽象的接口，想用什么库需要实现这些接口的适配器

### express 是什么

Express 是 Node.js 生态里**最早也是最广为人知的 Web 框架**，2010 年发布，作者 TJ Holowaychuk。它做的事情很简单：

- 包了一层 Node 自带的 `http` 模块
- 提供**路由**（`app.get('/users', handler)`）
- 提供**中间件机制**（`app.use(middleware)`）
- 提供 `req` / `res` 上的常用扩展方法（`res.json()`、`res.status()` 等）

一个最小的 Express 应用：

```javascript
const express = require("express");
const app = express();

app.get("/hello", (req, res) => {
  res.json({ message: "hello" });
});

app.listen(3000);
```

特点：

- **极简、非常自由**：没有约定目录结构，没有依赖注入，怎么组织代码都行
- **生态庞大**：几乎所有 Node Web 中间件（`body-parser`、`cors`、`helmet`、`morgan`…）都是为它写的
- **缺点**：没有规范，团队规模一大就容易写成"面条代码"；TypeScript 支持也不是原生的

可以把 Express 理解成 **"乐高底座"**——给你最基础的拼接能力，但盖什么样的房子全靠自己。

### nestjs 和 express 之间的关系

很多人第一次看到 NestJS 会以为它是 Express 的"竞品"，其实**两者不是同一层的东西**：

> NestJS 默认就是**跑在 Express 之上**的。

Nest 自己不实现 HTTP 服务器，它做的是在 Express（或 Fastify）之上**再封装一层"框架级"的东西**：模块化（Module）、依赖注入（DI）、装饰器路由（`@Controller` / `@Get`）、AOP（Guard / Interceptor / Filter）等等。

可以画个分层图：

```text
┌─────────────────────────────────────────┐
│  你的业务代码 (Controller / Service)    │
├─────────────────────────────────────────┤
│  NestJS 框架层                          │
│  - DI 容器、装饰器、模块系统            │
│  - Guard / Interceptor / Filter / Pipe  │
├─────────────────────────────────────────┤
│  HTTP 适配层 (Adapter)                  │
│  ├── @nestjs/platform-express  ← 默认   │
│  └── @nestjs/platform-fastify           │
├─────────────────────────────────────────┤
│  Express  /  Fastify                    │
├─────────────────────────────────────────┤
│  Node.js http 模块                      │
└─────────────────────────────────────────┘
```

关键事实：

1. **Nest 默认底层就是 Express**：你 `npm i @nestjs/core` 时会自动带上 `@nestjs/platform-express`
2. **可以拿到原生 Express 实例**：通过 `app.getHttpAdapter().getInstance()` 能拿到 Express app，挂任意 Express 中间件都没问题
3. **`req` / `res` 就是 Express 的对象**：在 `@Req()` / `@Res()` 拿到的就是 Express 的 `Request` / `Response`
4. **Express 中间件直接复用**：`cors`、`helmet`、`morgan` 等用 `app.use(...)` 直接挂

举个例子，挂一个 Express 中间件：

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cors from "cors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cors()); // ← 这里的 use 就是 Express 的 use
  await app.listen(3000);
}
bootstrap();
```

类比一下：

| 角色 | Express           | NestJS                   |
| ---- | ----------------- | ------------------------ |
| 定位 | HTTP 框架（底层） | 应用框架（上层）         |
| 风格 | 函数式、自由      | OOP + 装饰器、规范       |
| 关系 | —                 | 默认跑在 Express 上      |
| 类比 | 乐高底座          | 用乐高搭好的"半成品别墅" |

一句话总结：**Nest 不是替代 Express，而是把 Express "包装"成一个更适合中大型项目的工程化框架。**

### 如何切到 fastify

为什么要切到 Fastify？因为它**比 Express 快**（官方 benchmark 大约快 2 倍）、原生支持 schema validation、对 TypeScript 更友好。

切换非常简单，3 步搞定：

#### 1. 安装 Fastify 适配包

```bash
pnpm add @nestjs/platform-fastify
# 或
npm i @nestjs/platform-fastify
```

#### 2. 在 `main.ts` 里换适配器

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(), // ← 关键：传入 Fastify 适配器
  );
  await app.listen(3000, "0.0.0.0");
}
bootstrap();
```

注意 `NestFactory.create` 的泛型参数也要换成 `NestFastifyApplication`，这样 `app` 上的 `getHttpAdapter()` 等方法的类型才正确。

#### 3. 替换 Express-only 的中间件 / 写法

大部分代码不用动，但有几个地方要小心：

| Express 写法                           | Fastify 替代                                     |
| -------------------------------------- | ------------------------------------------------ |
| `app.use(cors())`                      | `pnpm add @fastify/cors` + `app.register(...)`   |
| `app.use(helmet())`                    | `pnpm add @fastify/helmet` + `app.register(...)` |
| `@Res() res: Response`（Express 类型） | `@Res() res: FastifyReply`（Fastify 类型）       |
| `req.cookies`                          | `pnpm add @fastify/cookie` + `app.register(...)` |
| 静态资源 `app.useStaticAssets`         | `pnpm add @fastify/static`                       |

举例：

```typescript
import fastifyCors from "@fastify/cors";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
await app.register(fastifyCors, { origin: "*" });
```

#### 切换前的检查清单

切到 Fastify 之前，过一下这几条：

1. **是否依赖了 Express-only 的中间件**：`express-session`、`passport` 的某些 strategy、`multer` 等。Fastify 都有对应替代（`@fastify/session`、`fastify-passport`、`@fastify/multipart`），但要逐个替换
2. **代码里有没有直接用 Express 类型**：`Request` / `Response` 来自 `express`，要换成 `FastifyRequest` / `FastifyReply`
3. **`@Res()` 的使用**：尽量避免直接操作 `res`，用 Nest 的返回值机制（`return data`）就跨平台无感
4. **第三方库兼容性**：比如 Swagger 模块两端都支持；但少数老库可能只兼容 Express

<details markdown="1">

<summary><h4>QA: 一定要切 Fastify 吗？</h4>💬点击展开/收起</summary>

不一定。考虑这几点再决定：

- **性能瓶颈在哪**：大多数业务系统的瓶颈是数据库 / 网络 IO，HTTP 框架带来的差异微乎其微。切 Fastify 不会让"慢接口"变快
- **生态成本**：Express 中间件生态比 Fastify 大一截，迁移要逐个替换
- **团队熟悉度**：调试问题、看错误栈，Express 资料更多

**建议**：

- 新项目、追求极致性能 / 想用 schema validation → 直接上 Fastify
- 老项目、依赖一堆 Express 中间件、性能不是瓶颈 → 留在 Express，不折腾

</details>

<details markdown="1">

<summary><h4>QA: 为什么 Nest 要做能够轻松切换 http 处理库呢？</h4>💬点击展开/收起</summary>

这其实是 NestJS 设计哲学里很关键的一点——**面向接口编程，而不是面向具体实现**。具体有这几个动机：

**1. 避免被单一框架绑死（防供应商锁定）**

Express 已经多年没有大版本更新，社区一度担心它停滞；Fastify、Hyper-Express、uWebSockets 等新库在性能、特性上不断迭代。如果 Nest 把 Express 写死在内核里，一旦底层换代，整个 Nest 生态都得跟着大改。

**抽象出 `HttpAdapter` 接口**之后，Nest 自己只依赖"一个能注册路由、能写响应"的契约，谁实现这个契约都行。Express 老了换 Fastify、Fastify 老了换下一个，都不影响业务代码。

**2. 让用户按场景选最合适的引擎**

不同场景需求不同：

- **CRUD 后台**：Express 生态完整、调试方便 → 用 Express
- **高并发网关 / BFF**：QPS 敏感 → 用 Fastify（快约 2 倍）
- **极致低延迟**：考虑 uWebSockets 适配器
- **Serverless**：用专门优化冷启动的适配器

如果框架强绑定一个 HTTP 库，开发者要么忍受不合适的性能，要么放弃整个框架。

**3. 真正的"协议无关"AOP**

这是和 NestJS 自身定位连在一起的：Nest 不只是"HTTP 框架"，它还要支持 **WebSocket、TCP/Redis/NATS/Kafka 微服务、GraphQL** 等多种协议。HTTP 只是其中一种。既然要做"协议无关"的 Guard / Interceptor / Filter（通过 [`ArgumentsHost` / `ExecutionContext`](/2026/04/27/nest-ExecutionContext/) 抽象），那 HTTP 这一层自然也要可替换，不能耦合到 Express。

**4. 便于测试**

抽象出 Adapter 之后，单元测试可以传一个 Mock Adapter 进去，不必真的起一个 HTTP 服务器，启动速度和稳定性都好很多。

**5. 一句话总结**

> Nest 不想做 Express 的"上层语法糖"，它想做一个**协议无关的应用框架**。HTTP 库可换、传输协议可换，业务代码（Controller / Service）保持不变——这才是它和"裸 Express + 一堆约定"的本质区别。

</details>

<details markdown="1">

<summary><h4>QA: Nest 的中间件和 Express 中间件有什么区别？</h4>💬点击展开/收起</summary>

**结论先行**：Nest 中间件**底层就是 Express 中间件**（在 Express 适配器下），但被 Nest 包装了一层，让它能享受 DI、装饰器、模块系统。

**1. 函数式中间件——和 Express 完全一样**

最简单的写法和 Express 没区别：

```typescript
// logger.middleware.ts
import { Request, Response, NextFunction } from "express";

export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`[${req.method}] ${req.url}`);
  next();
}
```

**2. 类式中间件——Nest 才有的写法**

类式中间件可以注入其他 service，享受完整的 DI 能力：

```typescript
// logger.middleware.ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logService: LogService) {} // ✅ 可以注入 service

  use(req: Request, res: Response, next: NextFunction) {
    this.logService.write(`${req.method} ${req.url}`);
    next();
  }
}
```

**3. 注册方式不同**

| 维度       | Express                      | Nest                                                    |
| ---------- | ---------------------------- | ------------------------------------------------------- |
| 注册位置   | `app.use(mw)`                | `Module` 里 `configure(consumer)` 中 `consumer.apply()` |
| 路由匹配   | 全局或 `app.use('/api', mw)` | `.forRoutes('users')` 或 `.forRoutes(UsersController)`  |
| 排除路由   | 自己写判断                   | `.exclude({ path: 'auth/login', method: ... })`         |
| DI 支持    | 没有                         | 类式中间件可注入                                        |
| 多个中间件 | `app.use(a, b, c)`           | `consumer.apply(a, b, c)`                               |

```typescript
// app.module.ts
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .exclude({ path: "health", method: RequestMethod.GET })
      .forRoutes(UsersController); // 只对 UsersController 生效
  }
}
```

**4. 执行时机：中间件 → Guard → Interceptor → Pipe → Handler**

中间件是**最早**执行的层（紧贴 HTTP 库），所以拿到的还是裸的 `req` / `res`，没有 Nest 的请求上下文。需要读 `@Roles()` 之类的元数据，**用 Guard 不要用中间件**。

**5. 一句话总结**

- 函数式中间件 = Express 中间件（兼容性写法）
- 类式中间件 = Express 中间件 + DI + 装饰器友好的注册方式
- 切到 Fastify 后，类式中间件依然能用，只是 `req` / `res` 类型要换成 Fastify 的

</details>

<details markdown="1">

<summary><h4>QA: Nest 的 @Module 和 Express 的 Router 是同一个东西吗？</h4>💬点击展开/收起</summary>

**不是。** 两者解决的问题不同，只是表面上"都能拆分代码"，但定位完全不同。

**Express 的 `Router`**：纯路由组合工具

```javascript
// users.routes.js
const router = express.Router();
router.get("/", listUsers);
router.post("/", createUser);
module.exports = router;

// app.js
app.use("/users", require("./users.routes"));
```

它做的事就一件——**把一组路由打包成可挂载的子树**。仅此而已。

**Nest 的 `@Module`**：DI 容器的边界 + 路由 + 生命周期

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])], // 引入其他模块的能力
  controllers: [UsersController],               // 路由（≈ Router 的部分）
  providers: [UsersService, UserRepository],    // 本模块的可注入服务
  exports: [UsersService],                      // 哪些 provider 给别的模块用
})
export class UsersModule {}
```

它至少承担四种职责：

1. **DI 作用域边界**：`UsersService` 默认只在 `UsersModule` 内可见，要给别的模块用必须显式 `exports`
2. **依赖关系图节点**：`imports` 形成模块依赖图，Nest 据此决定**实例化顺序**和**单例共享范围**
3. **路由组合**（这部分才和 Express Router 重合）：`controllers` 里的 `@Controller('users')` 等价于 `app.use('/users', router)`
4. **生命周期钩子**：模块可实现 `OnModuleInit` / `OnApplicationBootstrap` 等，启动时按依赖顺序触发

**对比表**

| 维度         | Express Router        | Nest @Module                                |
| ------------ | --------------------- | ------------------------------------------- |
| 主要职责     | 路由组合              | DI 边界 + 路由 + 生命周期                   |
| 依赖管理     | 无                    | `imports` / `exports` 显式声明              |
| 实例隔离     | 无（全局共享）        | 每个 module 是独立的 DI scope               |
| 子级能用什么 | 父级 `app` 的所有东西 | 只能用本模块定义 + import 进来 + 全局模块的 |
| 生命周期     | 无                    | `OnModuleInit` / `OnDestroy` 等             |
| 类比         | 文件夹                | 一个微型"应用单元"                          |

**举个例子说明差异**

```typescript
// OrderService 只在 OrderModule 里被声明
@Module({ providers: [OrderService] })
export class OrderModule {}

// UserModule 没 import OrderModule 就用不了 OrderService
@Module({
  // imports: [OrderModule], ← 没写就报错
  providers: [UserService], // UserService 里 inject OrderService 会失败
})
export class UserModule {}
```

Express 不会有这种"看不见"的限制——任何文件 require 一下就用了。Nest 用 `@Module` 强制你**显式声明依赖**，换来的是清晰的边界、可测试性、和大型项目的可维护性。

**一句话总结**：Express Router 是"路由的子文件夹"；Nest `@Module` 是"一个迷你应用 + 它管的路由"，更接近 Java Spring 的 `@Configuration` / Angular 的 `NgModule`。

</details>

## 小结

- **Express** 是 Node.js 上的极简 HTTP 框架，提供路由 + 中间件，自由度高但缺乏约束
- **NestJS 默认就是跑在 Express 之上**的应用框架，提供 DI、装饰器、模块化等工程化能力；它不是 Express 的替代品，而是包装
- **切到 Fastify** 只需替换适配器（`new FastifyAdapter()`）+ 把用到的 Express 中间件换成 `@fastify/*` 系列，业务代码基本不用动
- **是否切换**取决于性能需求和生态依赖，不要为了切而切
