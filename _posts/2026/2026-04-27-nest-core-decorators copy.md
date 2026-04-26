---
layout: post
title: nestjs 核心装饰器有哪些
subtitle: NestJS 深度依赖 TypeScript 装饰器（Decorators）来实现依赖注入、路由分发和面向切面编程（AOP）。
date: 2026-04-27 00:38:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

NestJS 广泛使用了装饰器（Decorators）来定义和组织代码。以下是 NestJS 中最核心和最常用的一些装饰器，按照它们的功能进行分类：

## 1. 模块与提供者 (Modules & Providers)

- **`@Module()`**: 用于类，将其标记为 Nest 模块。接收一个对象，包含 `imports`（导入其他模块）、`controllers`（当前模块下的控制器）、`providers`（由 Nest 注入器管理的实例）、`exports`（导出的提供者）等配置。
- **`@Injectable()`**: 将一个类标记为提供者（Provider），意味着它可以由 Nest 的依赖注入（IoC）容器管理并注入到其他类中。通常用于 Service 类。
- **`@Inject()`**: 当你需要手动指定注入的 token 时（比如注入一个提供者，它的 token 是一个字符串或 Symbol，而不是类名），使用这个装饰器。

## 2. 控制器与路由 (Controllers & Routing)

- **`@Controller()`**: 将一个类标记为路由控制器。可以接收一个字符串参数作为该控制器下所有路由的前缀。
- **HTTP 方法装饰器**: 映射 HTTP 请求到具体的控制器方法。
  - `@Get()`
  - `@Post()`
  - `@Put()`
  - `@Delete()`
  - `@Patch()`
  - `@Options()`
  - `@Head()`
  - `@All()`: 处理所有 HTTP 方法。

## 3. 请求参数提取 (Request/Parameter Decorators)

这些装饰器用于在控制器的方法签名中提取请求(Request)的各个部分：

- **`@Req()` / `@Request()`**: 注入完整的请求对象（如 Express 的 `req` 或 Fastify 的 `request`）。
- **`@Res()` / `@Response()`**: 注入完整的响应对象（如 Express 的 `res` 或 Fastify 的 `reply`）。**注意**：一旦注入了 `@Res()`，Nest 将进入手动响应模式，你需要自己调用 `res.send()` 等方法返回值，否则请求会被挂起，除非同时在响应装饰器中传入 `{ passthrough: true }`。
- **`@Body()`**: 提取 `req.body`（请求体）。
- **`@Query()`**: 提取 `req.query`（URL 查询参数）。
- **`@Param()`**: 提取 `req.params`（路由路径参数，如 `/user/:id` 中的 `id`）。
- **`@Headers()`**: 提取 `req.headers`（请求头）。
- **`@Ip()`**: 提取请求者的 IP 地址。
- **`@Session()`**: 提取 `req.session`（需要配置 session 插件）。

## 4. AOP 面向切面增强 (Guards, Interceptors, Pipes, Filters)

Nest 提供了强大的面向切面编程支持，这些装饰器可以控制进入路由前、后的行为：

- **`@UseGuards()`**: 应用守卫（Guards）。通常用于权限校验、认证（如 JWT 鉴权）。返回 true 放行，false 阻止。
- **`@UseInterceptors()`**: 应用拦截器（Interceptors）。可以在函数执行之前/之后绑定额外的逻辑，转换函数返回的结构，记录日志或处理缓存等。
- **`@UsePipes()`**: 应用管道（Pipes）。用于对客户端传来的输入数据进行**转换**（例如字符串转数字）和**验证**（利用 class-validator 校验 DTO 数据是否合法）。
- **`@UseFilters()`**: 应用异常过滤器（Exception Filters）。用于捕获未处理的异常，并返回给客户端自定义格式的错误响应。

## 5. 异常处理 (Exception Handling)

- **`@Catch()`**: 用于类，将其标记为自定义异常过滤器，并可以指定捕获哪种类型的异常（如 `@Catch(HttpException)`）。

## 6. 其他常用装饰器

- **`@HttpCode()`**: 强制修改成功的处理方法返回的 HTTP 状态码（默认情况下，POST 返回 201，其余情况返回 200）。
- **`@Header()`**: 设置自定义的响应头。
- **`@Redirect()`**: 将请求重定向到指定的 URL。

**总结：**
NestJS 的核心就是围绕着 `@Module`（组织代码）、`@Controller`（接收并路由请求）以及 `@Injectable`（依赖注入处理业务逻辑）这三大装饰器建立的架构，配合 AOP 切面装饰器进行功能增强。
