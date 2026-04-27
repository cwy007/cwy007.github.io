---
layout: post
title: nestjs 自定义装饰器
subtitle: Nest 内置了很多装饰器，大多数功能都是通过装饰器来使用
date: 2026-04-27 15:45:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---


### 什么时候需要使用自定义装饰器

1.当nest内置装饰器不能满足需求的时候

2.当装饰器比较多，需要把多个装饰器合并成一个的时候

- SetMetadata, `@SetMetadata`：用于给路由打上“元数据”标签。不同的 metadata 有不同的业务场景。
  - **场景举例 1：角色权限控制**。有些接口只需登录，有些接口需要 `admin` 角色。可以用 `@SetMetadata('roles', ['admin'])` 给路由打上需要的角色标签，然后在 Guard 中读取这个标签进行拦截。
  - **场景举例 2：公共接口放行**。你有一个全局的 JWT Guard 拦截所有请求，但登录、注册接口不需要 token，你可以用 `@SetMetadata('isPublic', true)` 给它们打上白名单标签，Guard 读到这个标签就直接放行。

- Guard, CanActive, @UseGuards，applyDecorators

- Reflecor

### 1. 封装 `@SetMetadata`：自定义方法装饰器

Nest 内置的 `@SetMetadata` 用起来比较原始，每次都要写 key 和 value，比如 `@SetMetadata('roles', ['admin'])`。我们可以将其封装为一个语义化更强的 `@Roles` 装饰器。

**业务场景：** 控制某个接口只有特定角色的用户能访问。

```typescript
import { SetMetadata } from '@nestjs/common';

// 封装成 @Roles 装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```
**使用：**
```typescript
@Post('create')
@Roles('admin', 'super_admin') // 语义化更好
create() {
  return '只有管理员能创建文章';
}
```

### 2. 合并多个装饰器：使用 `applyDecorators`

很多时候，我们的某个接口需要同时打上多个标签或多个守卫（Guard）。例如，一个受保护的后台接口，既要经过 JwtAuthGuard（验证是否登录），又要经过 RolesGuard（验证权限），最后还要在 Swagger (ApiBearerAuth) 中标明需要 Token。写一堆装饰器会导致代码很臃肿。

**业务场景：** 组合统一的身份认证校验装饰器。

```typescript
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export function Auth(...roles: string[]) {
  return applyDecorators(
    Roles(...roles), // 调用上面封装的 Roles 装饰器
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(), // Swagger 装饰器
  );
}
```
**使用：**
```typescript
// 也可以直接用在 Class 级别，给整个控制器的接口都加上统一的验证
@Controller('admin')
@Auth('admin')
export class AdminController {
  @Post()
  create() { ... }
}
```
无论是方法装饰器还是类装饰器，用法和底层逻辑是一致的，只是作用域不同。

### 3. 通过 `createParamDecorator` 创建自定义参数装饰器

Nest 提供了许多内置的参数装饰器，如 `@Query()`, `@Body()`, `@Headers()`。但很多时候我们需要更贴近业务的参数，比如经常要在 Controller 层从 `req.user` 里获取当前登录用户的信息。如果每次都写 `@Req() req` 然后推导 `req.user`，代码会很啰嗦，还脱离了 Nest 装饰器驱动的优雅风格。

**业务场景：** 获取当前请求上下文中的登录用户实体。

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    // ExecutionContext 可以拿到底层的 request/response
    const request = ctx.switchToHttp().getRequest();
    // 假设前面的 Guard 已经把用户信息挂载在了 req.user 上
    const user = request.user;

    // 如果装饰器传了参数，比如 @CurrentUser('id')，则只返回该字段
    return data ? user?.[data] : user;
  },
);
```
**使用：**
```typescript
@Get('profile')
getProfile(@CurrentUser() user: any, @CurrentUser('id') userId: number) {
  console.log(userId);
  return user;
}
```

### 总结
通过自定义方法、合并装饰器和参数装饰器，NestJS 赋予了我们极高的自由度，能将重复的横切关注点或解析逻辑隐藏在装饰器背后，使得控制器的代码**非常清爽、语义化极强。**
