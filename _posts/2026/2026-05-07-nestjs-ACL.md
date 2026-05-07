---
layout: post
title: nestjs 基于ACL实现权限控制
subtitle: ACL（Access Control List）访问控制列表
date: 2026-05-07 13:57:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

在后台管理系统中，权限控制是必不可少的一环。常见的权限模型有 RBAC（基于角色的访问控制）、ABAC（基于属性的访问控制）以及 ACL（访问控制列表）。

本文将带你一步步使用 NestJS 的核心特性（**装饰器 Decorator** 和 **守卫 Guard**）来实现一个基础的 ACL 权限控制系统。

## 1. 明确实现思路

在 NestJS 中，实现权限控制的推荐做法是：

1. **认证（Authentication）**：确认当前用户的身份（通常通过 JWT 等解析出 `req.user`）。
2. **授权（Authorization）**：判断当前用户是否拥有访问该接口的权限（这是 ACL 需要做的）。

我们将通过以下几个步骤实现：

- 创建一个自定义装饰器 `@Roles()`，用于在控制器（Controller）或路由方法上定义所需的权限（角色）。
- 创建一个 `RolesGuard` 守卫，拦截请求，检查当前用户的权限是否满足该路由的要求。

## 2. 定义角色（Role）枚举

首先，我们定义系统中的角色。在实际项目中，你可以将这些存放在数据库中，或者作为静态配置。

创建一个 `role.enum.ts`：

```typescript
// src/enums/role.enum.ts
export enum Role {
  User = "user",
  Admin = "admin",
  SuperAdmin = "superadmin",
}
```

## 3. 创建自定义权限装饰器 `@Roles`

我们需要一种方式来给不同的路由节点“打标签”，声明访问该接口需要什么角色权限。NestJS 提供了自定义装饰器的功能。

执行命令（或手动创建文件）：

```bash
nest g d common/decorators/roles
```

在 `roles.decorator.ts` 中，我们利用 `@SetMetadata` 将角色数组绑定到路由的元数据（Metadata）中：

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { Role } from "../../enums/role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

## 4. 创建权限拦截守卫 `RolesGuard`

守卫（Guard）的核心责任是根据运行时的上下文（例如身份验证、角色信息）来决定请求是否应该被路由处理机接受。

```bash
nest g gu common/guards/roles
```

在 `roles.guard.ts` 中实现：

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../../enums/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取路由上定义的角色约束
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果该接口没有使用 @Roles() 配置任何角色要求，则默认放行
    if (!requiredRoles) {
      return true;
    }

    // 从请求对象中获取 user （此user通常在认证守卫 JwtAuthGuard 中被挂载）
    const { user } = context.switchToHttp().getRequest();

    // 如果还没有解析出 user 信息，直接拒绝
    if (!user || !user.roles) {
      return false;
    }

    // 判断用户拥有的角色，是否包含该接口要求的任意一个角色
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

## 5. 在全局或局部应用守卫

为了让 `RolesGuard` 生效，我们需要将它绑定到路由上。通常建议将其设置为全局守卫，或者在特定模块中引入。

如果作为全局守卫注入，可以在 `app.module.ts` 中配置：

```typescript
// src/app.module.ts
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  controllers: [AppController],
  providers: [
    // 注入全局守卫
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

> **注意：** 你的系统中应该还有一个认证守卫（如 JwtAuthGuard），并且 **认证守卫要在角色守卫之前执行**，确保 `req.user` 能被正确赋值给 `RolesGuard` 使用。

## 6. 在控制器中使用它

现在，你只需要在你想要的 Controller 或者单一的 Method 上，通过我们创建的 `@Roles()` 控制权限。

```typescript
// src/app.controller.ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "./common/decorators/roles.decorator";
import { Role } from "./enums/role.enum";

@Controller("users")
export class AppController {
  @Get("public")
  getPublic() {
    return "Anyone can see this.";
  }

  // 只有携带了 admin 角色的用户才能访问该接口
  @Get("admin-panel")
  @Roles(Role.Admin)
  getAdminPanel() {
    return "Welcome, Admin!";
  }

  // 无论是 admin 还是 superadmin 都能访问
  @Get("logs")
  @Roles(Role.Admin, Role.SuperAdmin)
  getLogs() {
    return "System logs here.";
  }
}
```

## 总结

以上就是 NestJS 基于 ACL 的基础权限控制骨架。实际的企业级引用中，我们可能还需要面对诸如动态配置权限树或者具体的颗粒度更新控制。对于更复杂的权限需求，可以考虑结合 Casl 等第三方库引入 ABAC 模型。
