---
layout: post
title: nestjs class-validator 教程
subtitle: 内置装饰器说明和如何自定义装饰器
date: 2026-05-10 15:33:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

在 NestJS 项目中，对用户提交的数据进行严格校验是必不可少的环节。NestJS 官方推荐使用 `class-validator` 配合 `class-transformer` 和 `ValidationPipe` 来完成优雅的、基于装饰器的数据校验（主要在 DTO 中使用）。

本文将介绍如何开启全局验证、常用的内置验证装饰器，并手把手教你编写自定义验证装饰器。

## 1. 安装与开启全局验证

首先，安装必需的依赖栈：

```bash
npm install class-validator class-transformer
```

为了让所有的 DTO 校验自动生效，我们需要在 `main.ts` 中开启全局的 `ValidationPipe`：

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 开启全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // 开启后，将自动剔除 DTO 类中未定义的属性，防止恶意字段注入
    forbidNonWhitelisted: true, // 如果传入了未在 DTO 中定义的属性，直接抛出 400 错误
    transform: true, // 自动将客户端传递的 payload 转换为 DTO 实例对象
  }));

  await app.listen(3000);
}
bootstrap();
```

## 2. 常用内置装饰器一览

`class-validator` 提供了极其丰富的内置验证规则，下面是一个典型用户注册 DTO 的例子，涵盖了最常用的装饰器：

```typescript
// src/user/dto/register-user.dto.ts
import {
  IsString,
  IsEmail,
  IsNumber,
  IsNotEmpty,
  Length,
  Min,
  Max,
  IsIn,
  IsOptional,
  Matches
} from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @Length(4, 20, { message: '用户名长度必须在 4~20 个字符之间' })
  username: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsNumber()
  @Min(18, { message: '年龄必须大于等于 18 岁' })
  @Max(100)
  age: number;

  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, {
    message: '密码必须至少包含8个字符，且至少包含一个字母和一个数字'
  })
  password: string;

  // IsOptional 表示该字段非必填，但如果填了就必须符合后面的规则
  @IsOptional()
  @IsIn(['male', 'female', 'other'], { message: '性别只能是 male, female 或 other' })
  gender?: string;
}
```

### 嵌套对象验证 (Nested Validation)

如果你的 DTO 里面包含另一个对象（如数组中包含多个对象，或者字段嵌套），你需要使用 `@ValidateNested`，并配合 `class-transformer` 的 `@Type` 才能正确校验深层数据：

```typescript
import { ValidateNested, IsNotEmptyObject } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';

export class CreateCompanyDto {
  // ...其它基础字段

  @ValidateNested() // 声明我要验证这个嵌套结构
  @Type(() => AddressDto) // 必须加这个，指明运行时要转换验证的目标类型类
  @IsNotEmptyObject()
  address: AddressDto;
}
```

## 3. 进阶：自定义验证装饰器

有时候内置的规则无法满足复杂的业务场景。比如：校验“确认密码”是否与“密码”字段值一致，或者查询数据库里是否有重复用户名。这个时候就需要用到自定义装饰器。

我们以**“判断两个字段的值是否一致”**为例，编写一个 `@Match` 装饰器（常用于校验 `password` 和 `confirmPassword`）。

### 编写约束逻辑与装饰器工厂

```typescript
// src/common/decorators/match.decorator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from 'class-validator';

// 声明装饰器工厂（外部调用时传参）
export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMatch',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property], // 把参照字段传入约束中
      options: validationOptions,
      validator: {
        // value 是当前装饰器修饰的字段的值
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName]; // 取出参照字段的值
          // 返回 true 代表验证通过，false 代表验证失败
          return value === relatedValue;
        },
        // 验证失败时的默认提示
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.propertyName} 必须匹配 ${relatedPropertyName}`;
        }
      },
    });
  };
}
```

### 实际使用

将写好的 `@Match` 引入到实际业务的 DTO 中：

```typescript
// src/auth/dto/reset-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @Match('password', { message: '两次输入的密码不一致！请重新确认' })
  confirmPassword: string;
}
```

## 4. 补充：在 NestJS 中使用 Zod 进行校验

除了官方开箱即用的 `class-validator` 外，近年来类型更安全的 schema 校验库 **Zod** 也备受前端和 Node.js 后端开发者的青睐。如果你更喜欢函数式、类型推导更强的方式，并且正在构建全栈（共享验证 Schema），可以在 NestJS 中轻松接入 Zod。

### 安装依赖

```bash
npm install zod
```

### 定义 Zod Schema 与 DTO

由于 Zod 可以直接推导出 TypeScript 类型，你完全不需要重复写一套 `class` 或 `interface`：

```typescript
// src/user/dto/create-user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(4).max(20),
  email: z.string().email(),
  age: z.number().min(18).max(100),
});

// 直接从 Schema 推导出 TS 类型，供 Controller 享用
export type CreateUserDto = z.infer<typeof createUserSchema>;
```

### 创建 Zod 验证管道 (ZodValidationPipe)

接下来，我们实现一个自定义管道，把拦截到的 Body 扔给上一步的 Zod Schema 去解析：

```typescript
// src/common/pipes/zod-validation.pipe.ts
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema  } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      // parse 会返回深层清洗后通过校验的数据，如果失败会自动抛出 ZodError
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      // 将 Zod 的错误转成 HTTP 400 异常
      throw new BadRequestException('Validation failed', { cause: error });
    }
  }
}
```

### 在 Controller 中使用

```typescript
// src/user/user.controller.ts
import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createUserSchema, CreateUserDto } from './dto/create-user.schema';

@Controller('users')
export class UserController {
  @Post()
  @UsePipes(new ZodValidationPipe(createUserSchema)) // 针对该路由应用我们自定义的 Zod 管道
  async create(@Body() createDto: CreateUserDto) {
    // 此时 createDto 的推导类型已经十分严谨安全
    return { message: '创建成功', data: createDto };
  }
}
```

> **最佳实践提示**：原生的 Zod 方案可能会让你丢失基于 `@nestjs/swagger` 的自动化接口文档扫描支持。在企业级工程中，如果执意要用 Zod 且需要配合 Swagger，推荐直接使用社区封装好的插件 [`nestjs-zod`](https://github.com/risenotes/nestjs-zod)，它用 `createZodDto` 补全了元数据鸿沟。

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: class-validator 验证失败时返回的 400 格式太繁杂，如何统一改写响应格式？</h4>💬点击展开/收起</summary>

默认情况下，`ValidationPipe` 抛出的 `BadRequestException` 结构包含非常深层级的 `errors` 数组和对象约束。如果这不符合你公司的统一响应结构规范（比如一般前端只想要一句话），可以在 `main.ts` 中针对 `ValidationPipe` 的 `exceptionFactory` 参数予以拦截处理：

```typescript
import { BadRequestException } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    exceptionFactory: (errors) => {
      // 提取所有的验证错误信息并扁平化合并为一句话
      const messages = errors.map(
        err => Object.values(err.constraints || {}).join('; ')
      ).join('; ');

      // 抛出自定义标准的 HTTP 异常
      return new BadRequestException({
        code: 40001,
        message: '请求参数校验失败',
        details: messages
      });
    },
  }),
);
```

这样，前端接收到的 400 接口报错，就是扁平易读的标准错误回执了。

</details>

<!-- #endregion -->
