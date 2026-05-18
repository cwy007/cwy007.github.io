---
layout: post
title: nestjs swagger
subtitle: 在nestjs 中使用 swagger 的最佳实践
date: 2026-05-17 19:12:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

Swagger（OpenAPI）是现代 Web API 开发的标配。在 NestJS 中，通过 `@nestjs/swagger` 集成 Swagger 可以极大地简化 API 文档的生成与维护工作。本文将介绍在 NestJS 项目中高效集成并使用 Swagger 的最佳实践。

## 1. 安装与初始化配置

首先，安装相关依赖。如果你使用 Express 作为底层（NestJS 默认），则需要安装 `swagger-ui-express`。

```bash
npm install --save @nestjs/swagger swagger-ui-express
```

然后在 `main.ts` 中初始化 Swagger 文档：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('用户管理 API')
    .setDescription('提供用户相关的增删改查接口')
    .setVersion('1.0')
    .addBearerAuth() // 如果需要 JWT Auth 支持
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

启动应用后，访问 `http://localhost:3000/api/docs` 即可预览自动生成的 Swagger UI。

## 2. 常用装饰器一览

在编写 Controller 和 DTO 时，我们需要使用对应的装饰器来提供元数据：

### Controller 级装饰器

- `@ApiTags('Users')`：将接口按模块分组。写在 Controller 类上。
- `@ApiOperation({ summary: '创建用户' })`：描述核心功能。
- `@ApiResponse({ status: 201, description: '创建成功' })`：描述响应结果。
- `@ApiBearerAuth()`：声明该接口需要 Token 鉴权。

### DTO（数据传输对象）装饰器

通常我们需要通过 `@ApiProperty({ description: '用户名称' })` 来标记 DTO 中的每一个字段。这能让 Swagger 解析出请求体的 Schema。

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'chanweiyan', description: '用户名' })
  username: string;

  @ApiProperty({ minimum: 1, default: 18, description: '年龄' })
  age: number;
}
```

## 3. 最佳实践：使用 Swagger CLI 插件自动推断

每次写 DTO 都手动添加 `@ApiProperty` 非常繁琐。NestJS 提供了一个极其方便的**编译期 CLI 插件**，它可以解析 AST，根据 TypeScript 的类型注解自动生成 Swagger 属性。

**开启方法**：
编辑项目根目录的 `nest-cli.json`，在 `compilerOptions` 中添加插件配置：

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

开启插件后，**你不再需要写 `@ApiProperty`，甚至描述可以通过特殊的注释提取！**

比如上面的 DTO，只需这样写：

```typescript
export class CreateUserDto {
  /**
   * 用户名
   * @example chanweiyan
   */
  readonly username: string;

  /**
   * 年龄
   * @example 18
   */
  readonly age: number;
}
```

重新编译后，注释自动变成了 Swagger 说明，大大减少了装饰器侵入。同时搭配 `class-validator` 也能完美生效。

## 4. 常见问题解答

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 配置 CLI 插件后，有时候修改类型不生效？</h4>💬点击展开/收起</summary>

这通常是 NestJS 增量编译导致 AST 解析缓存的问题。如果在开发期间发现新建字段没刷新，请强制清空 `dist` 目录进行一次完整重启：

```bash
rm -rf dist && npm run start:dev
```

</details>

<!-- #endregion -->

## 总结

在 NestJS 项目中使用 Swagger，**最核心的提效入口就是启用 CLI Plugin (`@nestjs/swagger` plugin)**。配合注释解析（`introspectComments`），代码不仅保持极度清爽，更能与 `class-validator` 等完美结合，实现"文档即代码的完美统一。
