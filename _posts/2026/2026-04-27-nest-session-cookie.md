---
layout: post
title: nestjs session & cookie
subtitle: 在 Web 开发中，理解 HTTP 的无状态特性是掌握身份认证的前提。为了让服务器认识“你是谁”，Session 和 Cookie 这对经典的组合应运而生。
date: 2026-04-27 00:57:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

我们可以通过一个完整的业务链路，将**工作原理**、**浏览器行为**、**NestJS 代码实现**以及**服务端存储方案**串联起来，形成一个全局的认知。

---

### 1. 核心模型：银行账户与银行卡

HTTP 协议本身是没有记忆的。为了维持状态：

- **Session（会话）** 就像你在银行开通的**账户**，你的余额、信用等级都安全地保存在银行的内网系统（服务器端）里。
- **Cookie（饼干）** 就像银行发给你的**银行卡**。卡上不记录你的余额，只记录了一串全局唯一的卡号（Session ID）。这也是为什么我们说 **Cookie 存在浏览器端，而 Session 存在服务器端**。

### 2. 身份认证的完整生命周期与浏览器行为

当我们实现一个最常见的**用户登录**场景时，这套机制在浏览器和服务器之间是这样流转的：

1. **纯净期（无状态访问）**：用户首次打开浏览器，此时请求头中不携带任何身份标识。
2. **登录与创建 Session**：用户提交账号密码。NestJS 校验通过后，在**服务器端（内存或 Redis）**开辟一块空间存入用户信息（创建 Session 数据）。
3. **颁发“银行卡”（Set-Cookie）**：服务器生成一个毫无规律的 Session ID（如 `connect.sid=s%3Axyz...`），并通过 HTTP 响应头 `Set-Cookie` 将其发送给前端。
4. **浏览器自动缓存**：浏览器收到响应，看到 `Set-Cookie`，会静默地将这个字符串存入浏览器的本地 Cookie 存储中。
5. **后续自动携带**：此时用户去请求“个人中心”接口。浏览器会**自动**在 HTTP 请求头中附带 `Cookie: connect.sid=s%3Axyz...`。NestJS 拦截到这个 ID，去对应的存储器中将之前的 Session 数据重构出来，完成鉴权。

### 3. Session 到底存在哪里？（内存 vs Redis）

在上面的第 2 步中，我们提到服务器记录 Session 数据，但在实际工程中，存在哪里有非常严格的划分：

- **开发环境（Node.js 内存）**：默认情况下，Session 存在 Node 进程的内存中（`MemoryStore`）。这在本地开发很方便，但**绝对不能用于生产环境**。一旦程序重启，内存清空，所有用户瞬间强制下线；且内存容量有限，容易导致 OOM 崩溃。
- **生产环境（Redis 缓存数据库）**：线上环境几乎 100% 使用 Redis 这类内存数据库来接管 Session。一方面，它是独立的服务，NestJS 重启不受影响，实现持久化操作；另一方面，现代后端都是多进程或 K8s 集群部署，如果用户第一次请求打到 A 机器写了内存 Session，第二次请求打到 B 机器，B 机器并不认识他（Session 漂移）。使用 Redis 可以充当全局的中央状态库，完美解决分布式状态共享问题。

### 4. NestJS 中的全貌代码实现

了解了原理后，我们在 NestJS 中将上述流程代码化：

**第一步：在入口文件中配置 Session**（底层依赖 `express-session`，生产环境会配合 `connect-redis`）

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as session from "express-session";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: "my-super-secret-key", // 用于给 Session ID 加盐的秘钥
      resave: false,
      saveUninitialized: false,
      // store: new RedisStore({ client: redisClient }), // 生产环境中这里会接入 Redis 实例
      cookie: { maxAge: 86400000 }, // cookie 的生命周期
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

**第二步：在控制器中读写 Session 与独立操作 Cookie**
使用 `@Session()` 装饰器来修改和读取服务器端的状态。
但有时候，我们不仅仅要处理 Session，还想给浏览器的 Cookie 中**额外追加一些不涉及安全的明文控制字段**（比如用户选择的语言偏好、系统主题），这就不能用改 Session 的方法了，而是要通过 `@Res()` 操作底层响应对象去种 Cookie。

```typescript
import { Controller, Post, Get, Body, Session, Res, UnauthorizedException } from "@nestjs/common";
import { Response } from "express";

@Controller("users")
export class UsersController {
  // 【场景 1】写入 Session：验证成功，服务器开辟存储空间
  @Post("login")
  login(@Body() body: any, @Session() session: Record<string, any>) {
    if (body.username === "admin" && body.password === "123456") {
      // 这里写入的数据保存在 Node内存 或 Redis 中
      session.user = { username: body.username, role: "admin" };
      return { message: "登录成功" };
    }
    throw new UnauthorizedException("密码错误");
  }

  // 【场景 2】读取 Session：后续请求，通过 Cookie 里的 ID 还原数据
  @Get("profile")
  getProfile(@Session() session: Record<string, any>) {
    if (!session.user) throw new UnauthorizedException("请先登录");
    return { message: "返回私人数据", user: session.user };
  }

  // 【场景 3】直接操作前端 Cookie 追加额外明文字段
  @Get("settings/theme")
  setTheme(@Res({ passthrough: true }) res: Response) {
    // passthrough: true 保证我们修改完 Cookie 后，NestJS 还能正常处理返回逻辑
    // 强制向浏览器的 Cookie 中追加一对 key-value
    res.cookie("theme", "dark-mode", {
      httpOnly: false, // 允许前端 JS 通过 document.cookie 读取这段配置
      maxAge: 86400000,
    });
    return { message: "主题设置已保存至 Cookie" };
  }
}
```

### 总结

通过梳理以上流程可以看出：Session 定义了“数据存在哪”，Cookie 承担了“凭证怎么传”。理解它们在系统边界内外（服务端、网络传输、浏览器）的分工，就能轻松搞定现代 Web 应用中的状态管理。
