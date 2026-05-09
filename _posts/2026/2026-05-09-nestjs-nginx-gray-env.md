---
layout: post
title: nestjs Nginx 实现灰度系统-多租户和非多租户
subtitle: 手把手教你搭建平滑过渡的灰度环境
date: 2026-05-09 16:58:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - Nginx
  - Docker
---

![流量染色](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/60249ce21c284c928086815fec6801e9~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

灰度发布（又称金丝雀发布）是服务发布平滑过渡的重要手段。它可以在不中断核心业务的情况下，让部分用户先体验到新版本。如果有问题也能快速回滚，将影响面控制在最小。

今天我们来看一下，如何使用 Nginx 分别在**非多租户（单租户）场景**和**多租户场景**中实现一套优雅的灰度系统。

## 什么是灰度发布？

简单来说，灰度发布就是：
部署了新版本（V2），并保留老版本（V1）。
当流量进入 Nginx 网关时，Nginx 根据特定的策略（比如 Header、Cookie、客户端 IP，甚至是权重），将一小部分请求导向 V2，绝大部分依然保留在 V1。验证无误后，再逐渐增加 V2 的比例，直到 100%。

## 技术实现原理：流量染色

任何庞大且复杂的灰度系统，其底层逻辑几乎都可以回归到两个核心步骤，在业界这被称为**“流量染色”（Traffic Coloring）**：

1. **染色（Coloring）**：当用户第一次发起请求或登录时，系统必须确定该用户应该进入哪个版本。这里可以通过预设的放量比例（如抽样 10%）或特定白名单规则。一旦确定，应用层或响应侧会通过 `Set-Cookie` 在用户浏览器中种下一个持久化标识（例如 `Cookie: gray_version=v2`），这就等于给这个用户的后续所有流量“染上了颜色”。
2. **分发（Routing）**：当用户带上了被染色的 Cookie 或 Header 再次发起请求到达 Nginx（网关层）时，Nginx 充当路由器的角色。它读取该请求中的“染色”字段，直接基于特定的匹配规则将其精确转发到所对应的后端服务集群地址（老环境或灰度环境）。

基于染色与分发机制，我们可以极大地保护整个业务体系，并且做到针对单个用户的会话状态保持（Session Consistency）。

### NestJS 中的染色代码示例

在网关完成流量分发前，我们需要在业务端完成最初的流量打标。在 NestJS 中，通常会在用户成功登录的接口内，通过向控制器的 `Response` 对象注入标识来实现**应用层主动染色**：

```typescript
import { Controller, Post, Res, Body } from '@nestjs/common';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: any, @Res({ passthrough: true }) res: Response) {
    // 1. 执行常规身份验证逻辑
    const user = { id: 120, username: 'test_user' }; // 模拟查询到的用户数据

    // 2. 染色逻辑：判断是否在白名单、租户特性或是按确定的比例随机放量
    // 比如：这里假定所有的 userId 尾号为 0 的用户（约占 10% 流量的特征用户）进入灰度环境
    const isGrayUser = user.id % 10 === 0;

    // 3. 执行染色：通过 Set-Cookie 下发灰度版本标识
    if (isGrayUser) {
      res.cookie('gray_version', 'v2', {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 有效期设为 7 天
      });
    } else {
      // 老旧或正常流量给予原配置
      res.cookie('gray_version', 'v1', {
        httpOnly: true,
      });
    }

    return { message: '登录成功', user };
  }
}
```

这个前置的染色动作完成后，客户端（如浏览器）在未来的接口请求中都会自行带上这颗关键的 Cookie。接下来的第二步中，Nginx 才能从 Cookie 里提取出 `gray_version` 判断来做网关侧的流量分发。

## 方案一：非多租户（单租户）架构的灰度实现

单租户系统比较简单，一般我们会基于 HTTP Request 头部中的标识（如特定的 Cookie、Header 或者 User-Agent）来决定分配哪台机器。

### 1. 基于特定 Header 的灰度

假设我们在请求中携带了自定义的 HTTP 头：`Header: version=v2`。

```nginx
# 定义 V1（旧版）服务器集群
upstream old_servers {
    server 192.168.1.100:3000;
}

# 定义 V2（新版，灰度）服务器集群
upstream gray_servers {
    server 192.168.1.101:3000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        # 默认使用旧版本集群
        set $backend "old_servers";

        # 当 HTTP 请求头 version 为 v2 时，将上游指成基于新集群
        # 注意：Nginx 读取自定义 Header 时，会自动转小写，中划线变下划线
        if ($http_version = "v2") {
            set $backend "gray_servers";
        }

        # 根据 $backend 变量来动态代理
        proxy_pass http://$backend;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. 基于 Cookie 标识的灰度

同样地，对于前端路由或者前端发起的请求，最常见的是根据 Cookie 分流（例如根据某个特定标识抽取白名单用户）：

```nginx
    location / {
        set $backend "old_servers";

        # 判断 Cookie 中是否有 gray=true
        if ($cookie_gray = "true") {
            set $backend "gray_servers";
        }

        proxy_pass http://$backend;
    }
```

### 3. 基于权重分配（通过 `split_clients`）

如果是按流量百分比进行灰度（例如放量 10% 流量给新版），我们可以使用 Nginx 自带的 `split_clients` 模块。它能根据参数进行 Hash 处理并划分为特定百分率。

```nginx
# 基于 IP Hash 进行拆分
split_clients $remote_addr $backend {
    10%     gray_servers;
    *       old_servers;
}

server {
    listen 80;

    location / {
        proxy_pass http://$backend;
    }
}
```

## 方案二：多租户（SaaS）架构的灰度实现

对于多租户系统（SaaS），不同的租户通常拥有不同的子域名（如 `tenant1.myapp.com`）或者包含特定的租户 ID。
我们要达到的效果是：**只针对某个指定租户（如大客户，或者内部测试租户）开放灰度版本。**

假设租户 A 是 `tenantA.example.com`，租户 B 是 `tenantB.example.com`，我们打算给租户 B (tenantB) 配置灰度升级。

我们可以在 Nginx 中通过 `$host` 或使用 `map` 映射机制来实现优雅分流。

### 1. 使用 `map` 处理子域名灰度分流

在 `http` 块中使用 `map`：

```nginx
# 将访问对应的子域名映射到对应的 upstream
map $host $backend_pool {
    default                  old_servers;   # 默认指向老集群

    tenantB.example.com      gray_servers;  # 唯一把这个租户指向新集群
    test.example.com         gray_servers;  # 测试租户
}

upstream old_servers {
    server 192.168.1.100:3000;
}

upstream gray_servers {
    server 192.168.1.101:3000;
}

server {
    listen 80;
    # 泛解析该域名的所有子域名
    server_name *.example.com;

    location / {
        # 直接使用我们在 map 里解析出来的变量
        proxy_pass http://$backend_pool;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

这个 `map` 指令极为强大。后续如果我们需要扩大灰度的范围，比如让 `tenantC` 也能享受，只需要在 `map` 配置中加一行 `tenantC.example.com gray_servers;` 然后平滑重启 Nginx (`nginx -s reload`) 即可。

### 2. 通过 URL 参数带租户 ID

如果你们的系统不是独立子域名，而是在 URL 或者 header 中带租户标识（如 `tenant_id`）：

```nginx
    location / {
        set $backend "old_servers";

        # 比如通过 header 带过来的租户标志
        if ($http_tenant_id = "tenantB") {
            set $backend "gray_servers";
        }

        proxy_pass http://$backend;
    }
```

## 灰度深度实践解答 (QA)

在真正将灰度系统落地到生产环境时，常常会遇到以下三个深入的业务架构问题。

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 何时设置 Cookie 中的灰度标识？</h4>💬点击展开/收起</summary>

通常有以下几种方式：

- **权限/配置中心下发**：用户登录后，前端首先异步请求一个“开关服务（Feature Toggle）”获取当前用户的配置。如果在灰名单内，前端逻辑主动通过 JavaScript 种下带灰度标识的 Cookie。
- **网关层动态拦截写入**：在到达 Nginx 之前（或 Nginx+Lua），有一个鉴权前置校验。解析出当前请求的身份信息查表后，直接通过 `Set-Cookie` 指令下发浏览器。
- **运营测试通道**：对于内部测试的灰度，可以直接让内部开发/测试人员使用浏览器插件（如 ModHeader）手动在本地设置特定的 Cookie 或 Header。

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 数据库结构有变动时，有什么影响？</h4>💬点击展开/收起</summary>

这是灰度发布中**最大的痛点。**
由于灰度期间，V1（旧版）和 V2（新版）代码**往往同时连接着同一个物理数据库**，所以任何破坏性的数据库表结构变更都会直接导致 V1 端大面积报错。

**解决原则是：所有数据库变更在灰度期间必须完全向后兼容（只增不减）。**

- **可以包容的操作**：添加新表、新增具备默认值或容许 null 的新字段。因为老版代码（V1）没有映射这些新字段，自然就会忽略。
- **绝对禁止的操作**：在灰度期间修改现有字段名、删除字段或改变不可向下兼容的字段数据类型。
- 若必须要破坏性重构旧字段，需采用高成本的 **扩展/收缩模式 (Expand/Contract Pattern)**。先利用多版本周期进行只增字段+应用层代码双写兼容，等 V1 完全下线且数据迁移排空后才能删除老字段。

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: Nginx 是如何解析请求的 Header 和 Cookie 的？又是如何将其传递给后端应用的？</h4>💬点击展开/收起</summary>

**1. Nginx 如何解析 Header 和 Cookie？**

Nginx 会自动将客户端发送的 HTTP 请求头和 Cookie 映射为内部的全局变量，其命名和解析规则非常固定：

- **Header 变量**：以 `$http_` 开头，加上请求头名称。原名称将被转化为**全部小写**，且中划线 `-` 会被替换为下划线 `_`。例如，客户端发来的 `X-Tenant-Id: 123` 会被 Nginx 解析为变量 `$http_x_tenant_id`。
  - _注意_：Cookie 本质上也是一个名为 `Cookie` 的 Header 对象，所以在 Nginx 中，你完全可以通过 `$http_cookie` 拿到一整串未切割的原始 Cookie 字符串（例如 `id=1; gray_version=v2`）。
- **独立的 Cookie 变量**：为了方便单独取值，避免正则切割，Nginx 还特供了以 `$cookie_` 开头，加上具体的 Cookie 键名的方式。例如，客户端携带的 `Cookie: gray_version=v2` 会被 Nginx 直接一键解析为内部独立变量 `$cookie_gray_version`。

**2. 如何将这些字段传递给后端应用（如 NestJS）？**

- **默认透传行为**：默认情况下，Nginx 的 `proxy_pass` 机制会自动将客户端发来的**所有原请求头（包含了 Cookie）原封不动地转发**给后端的应用服务器。因此大多数情况下无需配置，后端就能直接使用 `req.headers` 或 `req.cookies` 获取。
- **显式重写/传递传递**：如果你想要在网关层做修改，或者拼接了全新的标识（例如 Nginx 在网关层根据逻辑查出的用户真实 ID）想要强制传递给后端，则必须显式使用 `proxy_set_header` 指令覆盖。

```nginx
location / {
    # 将 Nginx 解析出来的变量重新赋值给发往后端的 Header
    proxy_set_header X-Custom-Tenant-Id $http_x_tenant_id;

    # 强制追加原本不存在的 Header 交给后端 NestJS
    proxy_set_header X-Gray-Env "true";

    proxy_pass http://backend;
}
```

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: <code>proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;</code> 的作用是什么？</h4>💬点击展开/收起</summary>

它的作用是**传递真实的客户端 IP 地址**给后端的应用服务器（比如 NestJS）。

在反向代理的场景中：

1. **客户端**发送请求给 **Nginx**。
2. **Nginx** 作为代理服务器，再去请求**后端应用**。

对于后端应用来说，和它建立 TCP 连接的其实是 Nginx 服务器。所以如果后端直接去取请求的 IP（比如 `req.ip`），拿到的大概率是 Nginx 所在机器的各种内部/外部 IP（比如 `127.0.0.1` 或者是 Docker 桥接子网的网关 IP），而**掩盖了真实的客户端访客 IP**。

- **`X-Forwarded-For`**：是一个工业标准的 HTTP Request Header，用来记录请求头从客户端经过各个代理服务器的 IP 地址链（格式为 `Client IP, Proxy1 IP, Proxy2 IP...`）。
- **`$proxy_add_x_forwarded_for`**：是 Nginx 里的一个内部变量。它会自动把原请求中本身带有的 `X-Forwarded-For` 字段（如果有的话）和当前的远端访问 IP (`$remote_addr`) 用逗号拼接起来。

加上这行配置后，后端应用（NestJS）就可以通过读取 Header 中的 `x-forwarded-for` 字段，来准确获取到真正的客户端访问者的公网 IP，用于做黑名单限制、地域统计或接口限流（Rate Limit）等功能）。

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 后端应用（如 NestJS）的代码层面要做什么特殊的修改吗？</h4>💬点击展开/收起</summary>

单纯处理 HTTP 业务逻辑本身代码是不需要知道自己被路由到了 V1 还是 V2 环境的。但为了配合宏观的微服务体系，有几点极其特殊的逻辑需要干预代码去处理：

- **灰度状态透传能力**：如果当前应用背后还需要继续调用其他的 RPC 或微服务，你的 NestJS 侧必须设计一层全局 Interceptor 拦截器，将客户端传入的包含灰度标识的 Header 抓取，并原封不动地**透传封装**到向下游发起的请求头里去。否则调用链路在下游一过网关，又会由于丢失标志兜底回到老版。
- **防止异步型任务双挂重跑**：比如消息队列（MQ）消费和定时任务（Cron）等无需接收 HTTP 主动流量的任务。由于 V1 和 V2 服务本质是同时运行的，不加控制的话老版本和灰度版本都会同时被定时触发跑同一个任务导致数据双写复写。这就要求在代码启动时，读取部署挂载的系统变量（如 `IS_GRAY_ENV=true`），业务内判断逻辑主动要求灰度机器不加载定时任务，或必须配合 Redis 分布式互斥锁执行防重判读。

</details>

<!-- #endregion -->

## 总结

利用 Nginx 我们可以轻松完成网关层面的流量切分和管控。在业务逐渐复杂化的今天，这可以有效地为我们的 NestJS 系统增加**发布稳定性**。

- **非多租户系统**：优先尝试利用 **Cookie**、**Request Headers** 来标识特定用户（白名单），或者通过 `split_clients` 根据权重下发流量。
- **多租户系统**：可以通过 `map` 指令匹配 `$host` 二级域名信息，或者基于 Header 参数精确让某一个或某几个“小白鼠”租户走向灰度（金丝雀）环境。
