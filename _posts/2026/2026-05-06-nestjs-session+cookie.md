---
layout: post
title: nestjs 保存登录状态 session + cookie
subtitle: 原理解释，问题和解决方案
date: 2026-05-06 17:44:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## 原理简介

HTTP 协议是**无状态**的，这意味着每次客户端发起的请求，服务端都不知道这个客户端以前发过什么请求。为了能够在多个请求之间保持用户的状态（如登录状态），我们最常用的方案之一就是 **Session + Cookie**。

1. **Cookie**：存在于客户端（浏览器），每次发送请求时会自动携带对应域名下的 Cookie 传递给服务端。
2. **Session**：存在于服务端。服务端生成一个唯一的标识符（Session ID），并把这个 ID 通过 Cookie 设置给客户端；同时，服务端使用这个 ID 将用户状态保存在内存、数据库或 Redis 中。

## 在 NestJS 中使用 Cookie

在 NestJS 中处理 Cookie，通常基于底层的 Express 机制，我们需要借助 `cookie-parser` 中间件。

### 1. 安装依赖

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

### 2. 注册中间件

在 `main.ts` 中引入并全局使用：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 注册 cookie-parser，可以传入一个 secret 用来签名 Cookie
  app.use(cookieParser('my-secret-key'));

  await app.listen(3000);
}
bootstrap();
```

### 3. 读写 Cookie

在 Controller 中，可以通过 `@Req()` / `@Res()` 获取底层的 Request 和 Response 对象，或者使用更优雅的 `@Response({ passthrough: true })`：

```typescript
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request as ExpressReq, Response as ExpressRes } from 'express';

@Controller('auth')
export class AuthController {

  @Get('set-cookie')
  setCookie(@Res({ passthrough: true }) res: ExpressRes) {
    res.cookie('username', 'chanweiyan', {
      maxAge: 1000 * 60 * 60 * 24, // 1天
      httpOnly: true,              // 阻止前端 JS 访问
      // signed: true              // 如果你需要签名
    });
    return { message: 'Cookie 已设置' };
  }

  @Get('get-cookie')
  getCookie(@Req() req: ExpressReq) {
    // 未签名的 cookie 放在 req.cookies
    // 签名的 cookie 放在 req.signedCookies
    return { username: req.cookies['username'] };
  }
}
```

## 在 NestJS 中使用 Session

对于 Session，NestJS 同样依赖于 Express 生态中的 `express-session`。

### 1. 安装依赖

```bash
npm install express-session
npm install -D @types/express-session
```

### 2. 注册和配置 Session

在 `main.ts` 中配置：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: 'my-session-secret',
      resave: false,               // 如果 session 没有被修改，是否强制保存
      saveUninitialized: false,    // 是否保存未初始化的 session
      cookie: {
        maxAge: 3600000,           // 单位为毫秒，此处为 1 小时
        // secure: true            // 仅限 HTTPS 时设为 true
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

### 3. 操作 Session

NestJS 提供了方便的 `@Session()` 装饰器：

```typescript
import { Controller, Get, Post, Session } from '@nestjs/common';

@Controller('auth')
export class AuthController {

  @Post('login')
  login(@Session() session: Record<string, any>) {
    // 模拟登录成功，记录用户信息
    session.userId = 1001;
    session.username = 'chanweiyan';
    return { message: '登录成功' };
  }

  @Get('profile')
  getProfile(@Session() session: Record<string, any>) {
    if (!session.userId) {
      return { message: '未登录' };
    }
    return { userId: session.userId, username: session.username };
  }
}
```

## 常见问题与解决方案

### 1. 分布式环境下的 Session 丢失问题

**问题**：默认的 `express-session` 是将状态保存在 Node.js 的**内存**中的。如果我们的 NestJS 应用开启了多进程部署（如 PM2 Cluster），或者部署在 Kubernetes 多个 Pod 中，用户的请求可能会被打到不同的实例上，导致 Session 丢失。

**解决方案**：使用 Redis 来存储 Session。结合之前介绍过的 Redis 知识，引入 `connect-redis`。

```bash
npm install connect-redis ioredis
```

并在 `main.ts` 中配置：

```typescript
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import * as session from 'express-session';

// ...在 main 中
const redisClient = new Redis({ host: 'localhost', port: 6379 });
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'nest:sess:',
});

app.use(
  session({
    store: redisStore,
    secret: 'my-session-secret',
    resave: false,
    saveUninitialized: false,
  }),
);
```

### 2. 跨域问题 (CORS) 与 Cookie 携带

**问题**：前后端分离时，浏览器在跨域请求中默认不会携带 Cookie，导致每次 Session ID 都不一致。

**解决方案**：
1. **后端设置**：开启 CORS，并允许携带认证信息（`credentials`），且不能只配置宽泛的 `*`。
    ```typescript
    app.enableCors({
      origin: 'http://localhost:8080', // 必须是要请求的具体前台域名
      credentials: true,
    });
    ```
2. **前端设置**：在 axios 或 fetch 中主动带上 `withCredentials: true`。
    ```typescript
    axios.defaults.withCredentials = true;
    ```

### 3. 安全环境问题 (SameSite 与 Secure)

**问题**：现代浏览器对于第三方跨域 Cookie 有严格的限制（默认 `SameSite=Lax`）。如果在存在跨站请求（如前后端不同主域名），可能无法正常写入 Cookie。

**解决方案**：
在生产环境中，需要强制 HTTPS，同时对 session cookie 做安全属性设置：

```typescript
app.use(
  session({
    // ...
    cookie: {
      secure: process.env.NODE_ENV === 'production', // 必须使用 HTTPS
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 处理跨站跨域
      httpOnly: true, // 防止 XSS 窃取 Cookie
      maxAge: 3600000,
    }
  })
);
```

通过透彻理解 Session + Cookie 原理，并合理引入 Redis 进行状态持久化，在 NestJS 架构中应对不同部署和网络环境下的登录状态保存将会变得得心应手。
