---
layout: post
title: nestjs 保存登录状态 JWT
subtitle: 原理解释，问题和解决方案
date: 2026-05-06 18:12:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

在前后端分离和微服务架构盛行的当下，JWT（JSON Web Token）成为了最流行的跨域认证解决方案。相较于传统的 Session + Cookie，JWT 带来了一种**无状态**的登录保持方案。

## JWT 原理简介

与传统 Session 在服务端内存或 Redis 中保存用户状态不同，JWT 把用户基本状态信息（如用户 ID、角色、过期时间等）直接保存在客户端。

一个 JWT 字符串由三部分组成，用 `.` 连接：

1. **Header（头部）**：声明了 Token 的类型（通常是 `JWT`）以及签名算法（如 `HS256`）。
2. **Payload（负载）**：存放业务数据，例如 `sub` (用户 ID)、`exp` (过期时间) 等声明。**注意：这部分是 Base64Url 编码的明文，不能存放敏感信息（如密码）！**
3. **Signature（签名）**：服务端使用一个只有服务端知道的 Secret（密钥）加上 Header 中指定的算法，对 Header 和 Payload 进行哈希处理生成的数字签名。这保证了 Token 的防篡改性。

**认证流程**：
客户端登录成功，服务端生成 JWT 并返回。此后的每次请求，客户端都在 Header 的 `Authorization: Bearer <Token>` 中携带 JWT，服务端只需利用 Secret 校验签名的真实性和时效性即可，**无需查询数据库或缓存**，大大减轻了服务端的压力。

## 在 NestJS 中使用 JWT

NestJS 官方通过 `@nestjs/jwt` 和 `@nestjs/passport` 提供了极其优雅的集成方案。

### 1. 安装依赖

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
```

### 2. 导入与配置 JwtModule

创建 `AuthModule` 并配置 `JwtModule`：

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { AuthController } from "./auth.controller";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: "my-super-secret-key", // 生产环境请务必从环境变量读取
      signOptions: { expiresIn: "60s" }, // Token 过期时间
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

### 3. 生成 JWT (登录逻辑)

在 `AuthService` 中，实现根据用户信息签发 JWT：

```typescript
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

### 4. 编写 JWT 校验策略 (JwtStrategy)

我们需要继承 Passport 的 `PassportStrategy` 来验证客户端传过来的 JWT：

```typescript
import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 从请求头 Authorization: Bearer 中提取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 必须与签发时使用的 secret 一致
      secretOrKey: "my-super-secret-key",
    });
  }

  // 校验通过后会执行 validate，返回值会被挂载到 req.user 上
  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
```

### 5. 保护路由

使用 `@UseGuards(AuthGuard('jwt'))` 来保护需要登录才能访问的接口：

```typescript
import { Controller, Get, Post, Request, UseGuards, Body } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(@Body() body) {
    // 假设进行完账号密码校验...
    const user = { userId: 1, username: body.username };
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("profile")
  getProfile(@Request() req) {
    // req.user 就是我们在 JwtStrategy.validate 中返回的数据
    return req.user;
  }
}
```

## 常见问题与解决方案

JWT 解决了服务端的存储压力和跨域认证问题，但也带来了一些固有的痛点：

### 1. Token 无法主动撤销 (或踢人下线)

**问题**：由于 JWT 是无状态的，只要未过有效期，Token 就会一直被认为是合法的。如果用户修改了密码，或者管理员手动封禁了某个用户，**已经发出去的旧 JWT 是无法直接作废的**。

**解决方案**：

- **黑名单机制 + Redis**：维护一个被撤销 Token 签名的黑名单放入 Redis 且设置 TTL 等于 JWT 的剩余过期时间。每次验证 JWT 后多查询一次 Redis，虽然失去了一些无状态的好处，但最为灵活。
- **Token Version（版本号机制）**：数据库用户表中增加一个 `token_version` 字段，JWT Payload 中也写入 `token_version`；如果用户修改密码，把数据库中 `token_version` 加一，旧 Token 的版本号与数据库不一致，即刻失效。

### 2. Token 过期时间与用户体验的矛盾

**问题**：如果 JWT 过期时间长（例如 30 天），一旦 Token 泄露，黑客就有长达 30 天的访问权限，极其危险。如果在 JWT 中设置较短的时间（例如 15 分钟），用户可能会在操作时突然掉线，需要重新输入密码，体验极差。

**解决方案：双 Token 机制（Access Token + Refresh Token）**

1. **Access Token (访问令牌)**：短时效（如 15 分别到 2 小时）。用于日常接口请求。
2. **Refresh Token (刷新令牌)**：长时效（如 7 到 30 天）。存放在数据库中，当访问令牌过期时，客户端通过专门的接口发送 Refresh Token，服务端校验无误后颁发**全新的 Access Token**。如果 Refresh Token 也被盗用，服务端可以通过删除数据库里的记录将其强制失效。

### 3. JWT 的存储位置（安全问题）

**问题**：前端拿到 JWT 后，放哪里比较好？

1. **LocalStorage / SessionStorage**：最简单，没有跨域限制，但容易受到 **XSS（跨站脚本攻击）** 窃取，只要网站有被注入的恶意 JS，就能轻易把 Token 偷走。
2. **HttpOnly Cookie**：防 XSS。把 JWT 注入到 Cookie 里并设置 `HttpOnly=true`，JS 代码无法读取，能很大程度防 XSS。但又可能带来 **CSRF（跨站请求伪造）** 攻击的风险。

**解决方案**：

- 推荐将短期的 `Access Token` 放在内存中（页面刷新会丢），把长期的 `Refresh Token` 放在 **HttpOnly Cookie** 中并在 Cookie 头加入 `SameSite=Strict` 配置来防范 CSRF。
- 或者直接把 JWT 放入 `HttpOnly Cookie` 中，并配置好 CORS 策略与 CSRF 防御机制。

## 小结

JWT 大大简化了跨端和微服务的鉴权难度。在 NestJS 中配合 `@nestjs/passport` 能体验到极致的开发效率，但在真实的生产环境中，我们不能仅仅依靠单纯的无状态 JWT，往往需要配合 Redis 黑名单或 Refresh Token 架构来兼顾**安全**与**用户体验**。
