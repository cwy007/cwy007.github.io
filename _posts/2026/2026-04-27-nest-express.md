---
layout: post
title: nestjs express fastify
subtitle: Nest 不是 Express 的替代品，而是它的"工程化包装"
date: 2026-04-27 20:28:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

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

## 小结

- **Express** 是 Node.js 上的极简 HTTP 框架，提供路由 + 中间件，自由度高但缺乏约束
- **NestJS 默认就是跑在 Express 之上**的应用框架，提供 DI、装饰器、模块化等工程化能力；它不是 Express 的替代品，而是包装
- **切到 Fastify** 只需替换适配器（`new FastifyAdapter()`）+ 把用到的 Express 中间件换成 `@fastify/*` 系列，业务代码基本不用动
- **是否切换**取决于性能需求和生态依赖，不要为了切而切
