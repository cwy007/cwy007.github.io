---
layout: post
title: nestjs 基于 RBAC 实现权限控制
subtitle: RBAC（Role Based Access Control）基于角色的权限控制
date: 2026-05-07 19:26:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

RBAC（Role-Based Access Control，基于角色的访问控制）是业界最广泛使用的权限管理模型。本文将带你在 NestJS 中，从 DTO 设计到装饰器、守卫（Guard）的开发，一步步实现标准的 RBAC 权限控制。

## RBAC 核心概念

在标准 RBAC 模型中，权限与角色相关联，用户通过成为适当角色的成员而得到对应的权限。其核心关系如下：

- **User（用户）**：系统实体的映射。
- **Role（角色）**：权限的集合，如“管理员”、“普通用户”。
- **Permission（权限）**：对特定资源的操作许可，如“文章发布”、“评论删除”。

关系表设计通常为：`User -> 多对多关联表 -> Role -> 多对多关联表 -> Permission`。

## 第一步：定义枚举与 DTO 设计

首先，我们需要定义角色和权限的枚举常量，并在 DTO 中使用它们来规范数据的传输协议和参数校验。这也是业界最规范的写法。

在 `src/common/enums/` 下创建相关枚举：

```typescript
// src/common/enums/role.enum.ts
export enum Role {
  User = "USER",
  Admin = "ADMIN",
  SuperAdmin = "SUPER_ADMIN",
}

// src/common/enums/permission.enum.ts
export enum Permission {
  CreateArticle = "CREATE_ARTICLE",
  UpdateArticle = "UPDATE_ARTICLE",
  DeleteArticle = "DELETE_ARTICLE",
  ReadArticle = "READ_ARTICLE",
}
```

接下来设计对应的 DTO。基于 `class-validator` 和 `class-transformer`，我们来实现分配角色给用户、创建角色的参数校验：

```typescript
// src/users/dto/assign-role.dto.ts
import { IsEnum, IsNotEmpty, IsNumber } from "class-validator";
import { Role } from "../../common/enums/role.enum";

export class AssignRoleDto {
  @IsNotEmpty({ message: "用户 ID 不能为空" })
  @IsNumber({}, { message: "用户 ID 必须是数字" })
  readonly userId: number;

  @IsEnum(Role, { each: true, message: "必须是合法的角色类型" })
  readonly roles: Role[];
}

// src/roles/dto/create-role.dto.ts
import { IsEnum, IsString, IsNotEmpty } from "class-validator";
import { Permission } from "../../common/enums/permission.enum";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: "角色名称不能为空" })
  readonly name: string;

  @IsEnum(Permission, { each: true, message: "必须是合法的权限类型" })
  readonly permissions: Permission[];
}
```

## 第二步：创建自定义装饰器

为了在 Controller 的路由上动态标记所需的角色或权限，我们需要自定义装饰器。这里通过 `@nestjs/common` 中的 `SetMetadata` 注入元数据。

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { Role } from "../enums/role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// src/common/decorators/permissions.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { Permission } from "../enums/permission.enum";

export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

## 第三步：实现权限守卫（Guard）

在 NestJS 中，请求周期的权限拦截和鉴权通常放在 Guard 中处理。我们会用到 `Reflector` 来读取上一步注入到路由上的元数据，结合 Request 对象中当前请求的用户信息来完成判权。

创建角色守卫：

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../enums/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 读取路由中配置的角色元数据
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果该接口没有配置 Roles 装饰器，代表不限制该权限，直接放行
    if (!requiredRoles) {
      return true;
    }

    // 获取当前请求对象
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 这里是通过前置的 JwtAuthGuard 解析 Token 然后注入到 request 里的 user 对象

    if (!user) {
      throw new ForbiddenException("当前处于未登录状态，无权访问");
    }

    // 假设 user.roles 是一个包含已具备角色的数组
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException("当前角色无权操作此资源");
    }

    return true;
  }
}
```

## 第四步：在 Controller 中集成并使用

完成装饰器和 Guard 的开发后，就可以极其简单地将权限控制附着在业务逻辑上了：

```typescript
// src/articles/articles.controller.ts
import { Controller, Post, UseGuards, Get } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller("articles")
// 业界标准应用中，RolesGuard 必须位于 JwtAuthGuard（或其它身份鉴别守卫）之后
// @UseGuards(JwtAuthGuard, RolesGuard)
@UseGuards(RolesGuard)
export class ArticlesController {
  @Get()
  // 没有配置 @Roles() 装饰器，代表不受权限角色约束
  findAll() {
    return "返回所有文章";
  }

  @Post()
  @Roles(Role.Admin, Role.SuperAdmin)
  create() {
    return "仅管理员、超级管理员角色可触发此接口创建文章";
  }
}
```

这样封装后，基于角色的接口鉴权体系就搭起来了，以后新增接口只需要简单挂载一个 `@Roles()` 装饰器即可。

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 为什么不使用全局的 Guards，而是推荐放置在局部 Controller 级别？</h4>💬点击展开/收起</summary>

在大多数中后台权限管理系统（例如纯 B 端应用）中，如果你希望整个项目默认遵循**白名单模式**（所有的接口默认都需要权限鉴别），那么完全建议在 `app.module.ts` 中通过 `APP_GUARD` 注册全局 Guard。同时，提供一个 `@Public()` 自定义装饰器来跳过鉴权。

但如果项目存在较多公开前台接口（C 端或对外的公开 API），为了不产生过度鉴权的冗余，在 Controller 或 Handler（某个具体的增删改查方法）上使用 `@UseGuards()` 会更加轻量高内聚且减少不必要的性能开销。

</details>

<!-- #endregion -->
