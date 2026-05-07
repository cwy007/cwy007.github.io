---
layout: post
title: nestjs jwt access_token & refresh_token
subtitle: 双 token 实现登录鉴权
date: 2026-05-07 20:16:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

在现代 Web 应用的鉴权体系中，基于 JWT（JSON Web Token）的**双 Token 机制**（`access_token` 提供端点访问权限，`refresh_token` 负责无感刷新）是最常用的业界标准方案之一。

本文将带你在 NestJS 中，从 DTO 设计到双策略校验，一步步实现这套安全、可靠的双 Token 登录鉴权方案。

## 为什么需要双 Token？

- **Access Token**：访问令牌，通常寿命很短（如 15~30 分钟）。用于请求受保护的 API 接口。因为寿命短，即使泄露造成的安全风险也较小。
- **Refresh Token**：刷新令牌，长生命周期（如 7 天或 30 天）。当 Access Token 过期时，客户端用 Refresh Token 到服务端换取新的 Access Token。服务端可以在此阶段检查用户状态（如是否被拉黑、密码是否已被修改），不通过则拒绝签发新 Token。

## 第一步：安装依赖

NestJS 官方提供了完善的 JWT 和 Passport 集成方案。在编写业务代码前，先安装必备的组件：

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @types/passport-jwt -D
```

## 第二步：DTO 设计与 Payload 接口

规范的数据交互和校验是业界通用做法。我们定义登录请求的 DTO 以及 Token 内包裹的 Payload 接口格式。

```typescript
// src/auth/dto/login.dto.ts
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  readonly username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  readonly password: string;
}

// src/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: number; // 存放用户唯一标识（如 ID）
  username: string; // 基础的用户信息
}
```

## 第三步：AuthService 实现 Token 签发

在 `AuthService` 中实现签发这两个 Token 的逻辑。我们利用 `@nestjs/jwt` 注入的 `JwtService` 来生成签发令牌。

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // 验证用户，实际应用应当查询数据库排查密码等
  async validateUser(loginDto: LoginDto) {
    if (loginDto.username === 'admin' && loginDto.password === '123456') {
      return { id: 1, username: 'admin' };
    }
    throw new UnauthorizedException('用户名或密码错误');
  }

  // 登录并下发双 Token
  async login(user: any) {
    const payload: JwtPayload = { sub: user.id, username: user.username };

    return {
      // access_token 有效期较短，此处演示配置为 15 分钟
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      // refresh_token 有效期较长，此处设置 7 天
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  // 刷新 Token 逻辑
  async refreshToken(user: any) {
    // 实际项目中这里应增加查库逻辑，校验用户当前状态或黑名单
    const payload: JwtPayload = { sub: user.sub, username: user.username };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

## 第四步：实现 Passport 守卫策略 (Strategies)

我们要针对 `access_token` 和 `refresh_token` 分别实现两套 Passport JWT Strategy。

### 1. AccessToken 策略

这是主策略，用于常规接口的守卫鉴权。

```typescript
// src/auth/strategies/jwt-access.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor() {
    super({
      // 从 Header 的 Authorization: Bearer <token> 提取
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 提示：生产环境强依赖于 ConfigService 从环境变量获取 secret
      secretOrKey: 'your_super_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    // 这里的返回值最终会被注入到 request.user 中
    return { userId: payload.sub, username: payload.username };
  }
}
```

### 2. RefreshToken 策略

用于客户端换取新 Token 接口时的鉴权校验。该策略要注册一个不同的名称，并且常常需要解析到原始 Token。

```typescript
// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your_super_secret_key',
      // 需要开启此项以便在回调中拿到关联的 req 实例
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const authorization = req.get('Authorization');
    if (!authorization) throw new UnauthorizedException();

    const refreshToken = authorization.replace('Bearer', '').trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token malformed');
    }

    return { ...payload, refreshToken };
  }
}
```

接着在模块级挂载这些组件配置：

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    // JwtService 实例化注册
    JwtModule.register({
      secret: 'your_super_secret_key', // 请务必配合 ConfigModule 管理
    }),
  ],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

## 第五步：在 Controller 中集成两个校验流程

我们把对应的 Guard 运用到控制器对应的路由上，确保鉴权流转。

```typescript
// src/common/guards/jwt-access.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {}


// src/common/guards/jwt-refresh.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
```

编写控制器的分发逻辑：

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. 常规的账号密码登录接口，签发双 Token
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto);
    return this.authService.login(user);
  }

  // 2. 刷新 Token 接口。专门使用 RefreshGuard 做前置校验
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req) {
    // 此时的 req.user 已经被 JwtRefreshStrategy 的 validate 钩子组装好了
    return this.authService.refreshToken(req.user);
  }

  // 3. 拦截测试接口：只有合法抛出 AccessToken 才能请求成功
  @UseGuards(JwtAccessGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }
}
```

## 第六步：前端 Axios 拦截器实践

在前端（如 Vue、React 项目），我们需要使用 Axios 拦截器来自动携带 Token，并在 `access_token` 过期返回 `401` 状态码时进行无感刷新。结合多请求并发刷新的场景，我们可以实现带有互斥锁与请求队列的完整逻辑：

```javascript
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000',
});

// 是否正在刷新的标记（互斥锁）
let isRefreshing = false;
// 积压的请求队列（存放 Promise 的 resolve 回调）
let requestsQueue = [];

// 请求拦截器：自动注入 access_token
instance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 响应拦截器：处理 401 无感刷新
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // 如果是 401，且当前接口不是刷新 token 的接口
    if (response && response.status === 401 && config.url !== '/auth/refresh') {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          // 使用原生的 axios 实例（避免进入拦截器死循环）去调用刷新接口
          const res = await axios.post('http://localhost:3000/auth/refresh', {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });

          const { access_token, refresh_token } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          // 刷新成功，用新的 Token 执行队列中积压的请求
          requestsQueue.forEach((cb) => cb(access_token));
          requestsQueue = []; // 清空队列

          // 重试当前触发 401 的请求
          config.headers.Authorization = `Bearer ${access_token}`;
          return instance(config);
        } catch (refreshErr) {
          // 刷新也失败（例如 refresh_token 老化），清理登录状态并重定向
          requestsQueue = [];
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          // 释放刷新锁
          isRefreshing = false;
        }
      } else {
        // 如果正在刷新中，将其余并行的 401 请求挂起（加入队列）
        return new Promise((resolve) => {
          requestsQueue.push((newToken) => {
            config.headers.Authorization = `Bearer ${newToken}`;
            resolve(instance(config)); // 挂起，等待刷新成功回调
          });
        });
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
```

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 刷新 Token 会发生并发拦截重试问题吗？如何解决？</h4>💬点击展开/收起</summary>

在弱网或多请求并发现象下，客户端由于 `access_token` 失效，可能会瞬间发出多个请求。如果此时恰好触发刷新机制，并且系统配置了**Refresh Token 单次使用限制**（例如一刷新老 refresh_token 立刻失效作废）：后面的并发请求会因校验失效直接被迫登出。

常见的业界解法：
1. **客户端解法：互斥锁（Mutex）与请求队列**。基于 `axios` 等响应拦截器内设置标志位（例如 `isRefreshing = true`）。首个过期的请求触发刷新逻辑后，后续检测到需要并行的相同请求全部进入挂起（Promise 队列）；等待刷新拿到新的 Token 后再继续下发。
2. **服务端解法：缓冲宽限期（Grace Period）**。当 `refresh_token` 被第一次使用并替换为新的 Token 组合时，不对旧的 `refresh_token` 立刻强制销毁（或者做黑名单）。系统赋予这段旧 `refresh_token` 极短（譬如 30-60 秒）的缓冲时间。在此时间内被重复校验，都通过合法验证，允许返回相同的凭据集。

</details>

<!-- #endregion -->
