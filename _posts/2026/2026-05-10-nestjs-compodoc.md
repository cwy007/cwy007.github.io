---
layout: post
title: nestjs @compodoc/compodoc
subtitle: 生成项目代码架构和内部技术文档
date: 2026-05-10 20:04:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

![overview](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260510201045798.png)

在企业级项目开发中，良好的代码文档是降低团队沟通成本的关键。NestJS 默认完美支持基于 TypeScript 和装饰器的开发模式，这使得我们可以直接使用 **Compodoc** 来为整个系统生成一份静态的代码架构和内部技术文档。

Compodoc 最初为 Angular 量身打造，但由于 NestJS 在架构上（Module, Controller, Provider 等）与 Angular 的高度相似性，Compodoc 自然而然地成为了生成 NestJS 内部技术开发文档的首选工具。

## 1. 安装与配置

首先，我们需要将 `@compodoc/compodoc` 作为开发依赖安装到项目中：

```bash
npm install -D @compodoc/compodoc
```

安装完成后，我们需要在 `package.json` 的 `scripts` 配置中添加生成和运行 Compodoc 的快捷命令：

```json
{
  "scripts": {
    "compodoc": "compodoc -p tsconfig.json -s -w",
    "compodoc:build": "compodoc -p tsconfig.json -d ./documentation"
  }
}
```

- `-p tsconfig.json`：指定 TypeScript 配置文件，Compodoc 会从该文件推断出项目的结构。
- `-s`：开启本地 HTTP Server 预览。
- `-w`：开启 Watch 模式，代码变动时自动重新编译刷新。
- `-d ./documentation`：指定静态网页产物的输出目录（默认名为 `documentation`）。

## 2. 规范你的代码注释

Compodoc 是基于 **JSDoc** 规范来解析文档的。因此，为了让生成的文档详尽清晰，我们需要在编写 Controller、Service 甚至普通 DTO 类时加上由 `/** ... */` 包裹的规范注释。

```typescript
// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * 用户服务类 (UserService)
 *
 * 负责处理与用户相关的所有业务逻辑聚合，如注册、查询、第三方账号绑定等。
 */
@Injectable()
export class UserService {

  /**
   * 这是一个内部缓存标识
   */
  private readonly cacheKey = 'USER_LIST_CACHE';

  /**
   * 创建一个新的系统用户
   *
   * 此方法将会在底层执行数据库持久化，并通过消息队列广播一条 `user.created` 事件。
   *
   * @param createUserDto 包含了邮箱和密码的 DTO 传输对象
   * @returns 返回持久化成功后的新用户 Entity 实例
   */
  async create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }
}
```

按照此标准书写业务代码，Compodoc 会自动收集 `description`、`@param` 和 `@returns` 并格式化到最终展示页面上。

## 3. 生成与运转文档页面

在项目根目录执行我们在 `package.json` 写好的脚本即可：

```bash
npm run compodoc
```

当你看到终端吐出类似如下的日志时，说明文档生成与服务器启动成功：

```text
[15:10:01]
[15:10:01] Pre-parsing components
[15:10:01] Pre-parsing modules
...
[15:10:02] Serving documentation from ./documentation at http://127.0.0.1:8080
```

随后打开浏览器访问 `http://localhost:8080`，你就能看到一个自带精美左侧目录树（Module 分布图、Controller 列表、Service 列表）与右侧详情的技术大纲系统了。

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 既然项目中已经有了 Swagger 配置，为什么还要大费周章用 Compodoc？</h4>💬点击展开/收起</summary>

很多新手经常会混淆 Swagger 和 Compodoc 这两者的定位和受众：

- **Swagger (OpenAPI)**：面向的是 **API 的消费者**（例如：前端工程师、移动端 App 开发人员、自动测试脚本或者外部 API 调用企业）。它只专注于 RESTful/HTTP 的暴露面——告诉别人你有几个地址、传什么参数进来、吐什么 JSON 出去。至于这个 API 背后是哪个模块写的，有哪些私有变量协助，它完全不关心。
- **Compodoc**：面向的是 **内部后台研发团队** 和架构接手人。它记录的是工程内里的组织架构。通过 Compodoc 可以清晰地了解：某模块依赖了那些服务，这个类里面挂了哪些 Private 方法、Public 方法，系统的拓扑模块关系图长啥样。

简而言之：**Swagger 是对外说明“怎么使用 API”；Compodoc 是对内说明“这些代码是怎么组织的”**。在成熟的企业级后背开发场景中，两者各司其职，相互补充搭配使用。

</details>

<!-- #endregion -->

[https://www.npmjs.com/package/@compodoc/compodoc](https://www.npmjs.com/package/@compodoc/compodoc)
