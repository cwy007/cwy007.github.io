---
layout: post
title: nestjs passport-github2 实现Github第三方登录
subtitle:
date: 2026-05-08 14:13:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - OAuth
---

在现代 Web 网站中，提供第三方 OAuth 登录（如 GitHub、Google、微信）可以极大降低用户注册的门槛。本篇文章将带你在 NestJS 中，利用 `passport-github2` 策略，实现标准的 GitHub OAuth2.0 授权登录流程。

## 准备工作：申请 GitHub OAuth App

在开始写代码之前，你需要去 GitHub 申请一个 OAuth Application。

1. 登录 GitHub，前往 **Settings -> Developer settings -> OAuth Apps**。
2. 点击 **New OAuth App** 按钮。
3. 填写应用信息：
   - **Application name**: 你的应用名称。
   - **Homepage URL**: 主页地址（本地测试可填 `http://localhost:3000`）。
   - **Authorization callback URL**: 授权后的回调地址，这里我们准备填 `http://localhost:3000/auth/github/callback`。
4. 注册完成后，生成并保存 **Client ID** 和 **Client Secret**，我们将要在后端环境中使用它们。

## 第一步：安装依赖

既然是基于 Passport 的体系，我们需要安装对应包和类型定义：

```bash
npm install @nestjs/passport passport passport-github2
npm install -D @types/passport-github2
```

## 第二步：编写 Github Strategy

和其它 Passport 策略一样，我们需要继承 `PassportStrategy` 来实现 GitHub 认证策略。在此类中，我们将处理从 GitHub 获取到授权码并兑换出用户信息的逻辑。

```typescript
// src/auth/strategies/github.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-github2";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  constructor() {
    super({
      clientID: "YOUR_GITHUB_CLIENT_ID", // 强烈建议通过 ConfigService 获取环境变量
      clientSecret: "YOUR_GITHUB_CLIENT_SECRET",
      callbackURL: "http://localhost:3000/auth/github/callback",
      scope: ["user:email"], // 申请获取用户的邮箱权限
    });
  }

  // 授权成功后，GitHub 参数会回调到这里
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ): Promise<any> {
    const { id, username, emails, photos } = profile;

    // 你可以在这里查找或注册数据库中的用户
    const user = {
      githubId: id,
      username: username,
      email: emails?.[0]?.value,
      avatar: photos?.[0]?.value,
      accessToken, // 有需要可以存下来请求 Github API
    };

    // done(错误信息, 用户对象)，将该对象透传给 request.user
    done(null, user);
  }
}
```

## 第三步：实现 Github Auth Guard

为了更优雅地在路由上使用，我们封装一个专用的 Guard。

```typescript
// src/common/guards/github-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GithubAuthGuard extends AuthGuard("github") {}
```

## 第四步：Controller 路由整合

准备两个核心接口：一个用于触发跳转拿授权，另一个用于接受回调。

```typescript
// src/auth/auth.controller.ts
import { Controller, Get, UseGuards, Req, Res } from "@nestjs/common";
import { GithubAuthGuard } from "../common/guards/github-auth.guard";
import { Request, Response } from "express";
import { JwtService } from "@nestjs/jwt"; // 假设你已经集成了 JWT

@Controller("auth")
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  // 1. 发起授权登录请求，前端直接将页面重定向到此接口即可
  @Get("github")
  @UseGuards(GithubAuthGuard)
  async githubLogin() {
    // 这个接口不用写具体的逻辑，Passport 会自动把它劫持并重定向到 GitHub 授权页
  }

  // 2. 授权成功后的回调鉴权路由，和 GitHub App 设置的回调地址保持一致
  @Get("github/callback")
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    // 此时 req.user 已经包含由 GithubStrategy validate 传出来的用户信息
    const user = req.user;

    // TODO: 调用 Service 保存/更新用户信息

    // ✅ 通常第三方登录成功后，我们需要签发网站自己的 Token，并发放给客户端
    // 因为不能通过 JSON 返回带走，最常规的做法有：
    // 1. 设置在 Cookie 中，然后 res.redirect 到前端主页
    // 2. 将 token 拼接在前端 URL 参数后重定向，前端解析 URL 存起来再 pushState。

    const payload = { sub: user["githubId"], username: user["username"] };
    const siteToken = this.jwtService.sign(payload); // 这里简写演示

    // 方案 2 演示：将 Token 放入重定向查询参数返回前端
    const frontendRedirectUrl = `http://localhost:8080/login/success?token=${siteToken}`;
    return res.redirect(frontendRedirectUrl);
  }
}
```

## 第五步：别忘了注册 Provider

在你的 AuthModule 里提供并导入：

```typescript
// src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { GithubStrategy } from "./strategies/github.strategy";
import { JwtModule } from "@nestjs/jwt"; // 根据你实际的情况

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: "super_secret", signOptions: { expiresIn: "1d" } }),
  ],
  controllers: [AuthController],
  providers: [GithubStrategy],
})
export class AuthModule {}
```

## 前端调用流程梳理

1. 前端页面中放置一个“使用 GitHub 登录”按钮。
2. 点击按钮时，前端直接执行重定向：`window.location.href = 'http://localhost:3000/auth/github'`。
3. 离开当前网站进入 GitHub 的授权确认页。
4. 用户同意后，GitHub 携带 Code 带着你跳回后台接口：`http://localhost:3000/auth/github/callback`。
5. 后端鉴权完成，签发自身业务的 Token，通过 302 重定向到前端设定的承接页面：`http://localhost:8080/login/success?token=xxx`。
6. 前端承接页面解析 URL 参数保存 Token，清理参数，完成登录。

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 本地开发回调报错 mismatch 或者跳转 404？</h4>💬点击展开/收起</summary>

常见的原因是**回调地址不匹配**。
GitHub OAuth App 后台中填写的 `Authorization callback URL` 需要与你在 `GithubStrategy` 设置里的 `callbackURL` 完全一致，这包括 `http` / `https` 协议、域名、甚至结尾是否带有斜杠。

如果你想做本地联调，建议在 GitHub 申请两个独立的 App，一个用于生产环境（如 `https://api.yourdomain.com/...`），另一个专供本地环境配置（`http://localhost:3000/...`），通过项目的 `.env` 文件去切换 `CLIENT_ID` 等环境变量。

</details>

<!-- #endregion -->
