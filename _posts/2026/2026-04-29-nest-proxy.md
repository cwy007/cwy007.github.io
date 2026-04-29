---
layout: post
title: 反向代理
subtitle: 用户访问的是它，但真正干活的是后面的服务器
date: 2026-04-29 15:47:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - 概念
---

## 一句话理解

> **反向代理（Reverse Proxy）= 站在后端服务器前面，替它接收请求、转发响应的"门面"。**

用户以为自己访问的是 `https://api.example.com`，其实请求先打到一台 Nginx，然后 Nginx 内部决定把它转发给哪台真实服务器（NestJS 实例 A、B、C），再把结果返回给用户。**用户看不到后面是几台机器、什么语言写的**——这就是"反向"的含义：**代理的是服务器，不是客户端**。

## 正向代理 vs 反向代理

很多人混淆这两个词，看图就清楚了：

### 正向代理（Forward Proxy）

代理客户端，"翻墙"是最熟悉的例子：

```text
[ 你 (Client) ] ──→ [ 翻墙服务器 ] ──→ [ google.com ]
                       (正向代理)
                       服务器不知道你是谁
```

- **代理谁**：客户端
- **目的**：访问受限资源、隐藏真实 IP、做缓存
- **服务器视角**：看到的是代理 IP，不知道真正的请求方是谁

### 反向代理（Reverse Proxy）

代理服务器，**用户压根不知道自己被代理了**：

```text
                          ┌─→ [ NestJS 实例 1 :3001 ]
[ 用户 ] ──→ [ Nginx :443 ] ─→ [ NestJS 实例 2 :3002 ]
                          └─→ [ NestJS 实例 3 :3003 ]
                       (反向代理)
                       用户以为只有一个服务
```

- **代理谁**：服务器
- **目的**：负载均衡、统一入口、SSL 卸载、隐藏真实拓扑
- **客户端视角**：只看到一个域名一个 IP

**记忆窍门**：

| 类型     | 代理谁     | 谁知道真相                 |
| -------- | ---------- | -------------------------- |
| 正向代理 | 客户端     | 服务器**不**知道客户端是谁 |
| 反向代理 | 服务器集群 | 客户端**不**知道服务器是谁 |

## 反向代理解决了什么问题

### 1. 负载均衡

后端起 N 个 NestJS 实例，Nginx 按规则（轮询、最少连接、加权）分发流量：

```nginx
# upstream 定义后端服务器组，给它起个名字 nest_backend
# 后面 proxy_pass 用这个名字引用，相当于"逻辑服务集群"
upstream nest_backend {
  # 负载均衡策略：least_conn = 把新请求发给当前活跃连接数最少的那台
  # 其他可选策略：
  #   （默认轮询）按顺序依次分发
  #   ip_hash;          按客户端 IP 哈希，同一个 IP 始终落到同一台（保持会话）
  #   hash $request_uri; 按 URL 哈希，相同 URL 落到同一台（缓存友好）
  least_conn;

  # weight=3 表示这台机器的权重是 3，默认权重是 1
  # 假设三台都健康，流量分配比例约为 3:1:0（第三台是 backup）
  # 适合后端机器配置不均的场景：高配机器多扛点流量
  server 10.0.0.1:3000 weight=3;

  # 不写 weight 默认就是 1
  # 还可以加：max_fails=3 fail_timeout=30s
  # 含义：30 秒内失败 3 次，就把这台标记为不可用，30 秒后再尝试
  server 10.0.0.2:3000;

  # backup = 备用服务器，平时不接流量
  # 只有当 upstream 里所有"非 backup"服务器都挂了，才会启用它
  # 适合做容灾兜底（例如指向另一个机房的实例）
  server 10.0.0.3:3000 backup;
}

# server 块定义一个虚拟主机（监听某个端口、响应某个域名）
server {
  # 监听 443 端口，并启用 SSL/TLS（HTTPS）
  # ssl_certificate / ssl_certificate_key 等证书配置此处略，见"SSL 卸载"小节
  listen 443 ssl;

  # 只处理 Host 头为 api.example.com 的请求
  # 同一台 Nginx 可以配多个 server 块，按 server_name 区分不同站点
  server_name api.example.com;

  # location / 匹配所有路径（前缀匹配，最低优先级）
  # 想精确匹配某个路径用 location = /xxx，正则用 location ~ ^/api/
  location / {
    # 把请求转发给上面定义的 upstream
    # 注意：http:// 协议是 Nginx 与后端之间的协议，与外部 HTTPS 无关
    # 后端 NestJS 起 HTTP 服务即可，HTTPS 已经在 Nginx 这层卸载
    proxy_pass http://nest_backend;

    # 实战中这里通常还要补上转发头，让后端拿到真实信息：
    # proxy_set_header Host              $host;             # 原始域名
    # proxy_set_header X-Real-IP         $remote_addr;       # 客户端真实 IP
    # proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    # proxy_set_header X-Forwarded-Proto $scheme;            # http / https
    # 详见后文"NestJS 在反向代理后面要注意什么"
  }
}
```

### 2. SSL 卸载（HTTPS 终止）

证书装在 Nginx 上，外网走 HTTPS、内网走 HTTP，**业务服务不用关心证书**：

```nginx
server {
  # 监听 443 端口并启用 SSL/TLS（即对外提供 HTTPS）
  # 不写 ssl 关键字的话，就只是普通 TCP 监听，浏览器握手会失败
  listen 443 ssl;

  # SSL 证书（公钥链）路径，包含服务器证书 + 中间证书
  # 通常由 Let's Encrypt（免费）或购买的 CA 颁发
  # 文件格式：PEM（-----BEGIN CERTIFICATE----- 开头）
  ssl_certificate     /etc/ssl/cert.pem;

  # SSL 私钥路径，必须严格保密（chmod 600，不要进 git）
  # 公钥（cert）和私钥（key）成对使用：握手时用私钥证明身份
  ssl_certificate_key /etc/ssl/key.pem;

  # 实战中通常还会配置：
  # ssl_protocols TLSv1.2 TLSv1.3;            # 禁用老旧不安全协议（SSLv3/TLSv1.0/1.1）
  # ssl_ciphers HIGH:!aNULL:!MD5;             # 加密套件白名单
  # ssl_prefer_server_ciphers on;             # 优先使用服务端套件顺序
  # ssl_session_cache shared:SSL:10m;         # 会话缓存，复用握手减少 CPU
  # add_header Strict-Transport-Security "max-age=31536000" always;  # HSTS 强制 HTTPS

  location / {
    # 关键点：proxy_pass 用的是 http://（明文 HTTP），不是 https://
    # 含义：
    #   外网用户 ──HTTPS──→ Nginx ──HTTP──→ NestJS（127.0.0.1:3000）
    #   Nginx 在这里"卸载"了 SSL：把加密流量解密后用明文转给后端
    # 好处：
    #   1) 后端 NestJS 不用配证书、不用处理 TLS 握手，CPU 开销全在 Nginx
    #   2) 证书续期、协议升级（如启用 TLSv1.3）只改 Nginx，业务零改动
    #   3) 内网通信走 127.0.0.1（同机）或私有网段，明文也安全
    # 注意：如果 Nginx 和后端跨公网通信，应改为 https:// 保证链路加密
    proxy_pass http://127.0.0.1:3000;
  }
}
```

证书续期、TLS 协议升级都集中在 Nginx 处理，业务零改动。

### 3. 静态资源 / API 分流

前端 SPA 静态文件由 Nginx 直接吐，API 请求转给 NestJS：

```nginx
server {
  # root 指定静态文件根目录，所有未被 proxy_pass 接管的请求
  # 都会从这个目录里找文件返回（相当于把 Nginx 当 Web 服务器用）
  # /var/www/dist 一般是 Vite / webpack 打包后的 dist 目录
  root /var/www/dist;     # SPA 构建产物

  # location /api/ 前缀匹配所有以 /api/ 开头的请求
  # 例如 /api/users → 转给后端 NestJS
  # 优先级高于下面的 location /（更长的前缀优先匹配）
  location /api/ {
    # proxy_pass 末尾带 / 的关键作用：URI 替换
    #   请求 /api/users  →  转发为  http://127.0.0.1:3000/users
    # 如果写成 proxy_pass http://127.0.0.1:3000;（不带 /），则：
    #   请求 /api/users  →  转发为  http://127.0.0.1:3000/api/users
    # 这是新手最容易踩的坑！按后端是否带 /api 前缀来选
    proxy_pass http://127.0.0.1:3000/;
  }

  # location / 兜底：处理所有其他请求（静态资源 + 前端路由）
  location / {
    # try_files 按顺序尝试以下路径，找到第一个存在的就返回：
    #   1) $uri        当前请求路径对应的文件，如 /assets/main.js
    #   2) $uri/       当前路径对应的目录（找 index.html）
    #   3) /index.html 兜底返回 SPA 入口
    # 第三步是关键：SPA 用 history 路由（无 #）时，刷新 /user/profile
    # 浏览器会请求 /user/profile，Nginx 找不到这个文件，就回落到 index.html
    # 由前端 router 解析后再渲染对应页面——这就是"history 路由兜底"
    # 如果不写 try_files，刷新非首页路径就会直接 404
    try_files $uri $uri/ /index.html;  # SPA history 路由兜底
  }
}
```

### 4. 跨域代理（开发期常用）

前端 dev server 没法直接调线上 API（CORS 拦截），用 Vite / Webpack DevServer 的代理转发：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://staging-api.example.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

浏览器访问 `http://localhost:5173/api/users`，Vite 内部代理到 `https://staging-api.example.com/users`——这就是一个迷你的反向代理。

### 5. 灰度发布 / A-B 测试

按 cookie / header / 百分比把流量切到新版本：

```nginx
# split_clients 是 Nginx 内置的"按比例分流"指令
# 工作原理：对第一个参数做 MurmurHash2 哈希，把哈希值映射到 [0, 100%) 区间
# 然后按下面的百分比规则赋值给变量 $backend
#
# 第一个参数 "${remote_addr}AAA"：哈希的输入
#   - $remote_addr 是客户端 IP，保证"同一个用户始终落在同一组"（粘性）
#   - 拼接 "AAA" 是加盐，防止与其他 split_clients 哈希结果完全一致
#   - 想按用户 ID 分流可以换成 "$cookie_userid"，按请求随机分流可以用 "$request_id"
#
# 第二个参数 $backend：输出变量名，下面 proxy_pass 会用到
split_clients "${remote_addr}AAA" $backend {
  # 10% 的客户端（哈希落在前 10% 区间）→ $backend = "nest_canary"
  # nest_canary 应是上面 upstream 块里定义的金丝雀版本服务器组
  10%   nest_canary;   # 10% 流量进金丝雀

  # * 表示其余所有情况（剩下的 90%）→ $backend = "nest_stable"
  # 必须放在最后作为兜底，否则未匹配的请求 $backend 会是空字符串
  *     nest_stable;
}

location / {
  # 关键：proxy_pass 后面用变量 $backend，Nginx 在每次请求时
  # 才会动态决定转发到 nest_canary 还是 nest_stable
  # 注意：用变量做 proxy_pass 时，Nginx 需要 resolver（DNS 解析器）
  # 如果 upstream 名是静态定义的就没问题；如果是域名要加 resolver 8.8.8.8;
  proxy_pass http://$backend;
}
```

进阶玩法（按 cookie / header 灰度，更适合内部测试）：

```nginx
# 根据请求头 X-Canary 决定走金丝雀还是稳定版
map $http_x_canary $backend {
  default      nest_stable;   # 没传该 header 走稳定版
  "true"       nest_canary;   # X-Canary: true 走金丝雀
  "1"          nest_canary;
}

location / {
  proxy_pass http://$backend;
}
```

灰度发布的常见演进路径：先用 header / cookie 让内部员工试用 → 按 IP 哈希放 1% / 5% / 10% / 50% → 全量切换。

### 6. 安全 / 限流

防爬虫、DDoS 防护、IP 黑白名单全在前面这层做完，后端只处理已经"安检过"的流量：

```nginx
# limit_req_zone：定义一个"限流计数器"，必须放在 http 块（不能放 server / location 内）
#
# 三个参数：
#   1) $binary_remote_addr —— 限流 key（用谁来识别"同一个请求方"）
#      - 用客户端 IP 的二进制形式（比 $remote_addr 字符串更省内存：IPv4 占 4 字节）
#      - 想按用户 ID 限流可以用 $http_authorization 或 $cookie_userid
#      - 注意：在反向代理后面要确保 Nginx 拿到的是真实 IP（用 set_real_ip_from）
#   2) zone=login:10m —— 共享内存区
#      - login 是这个限流区的名字，下面 limit_req 用它引用
#      - 10m = 10MB 内存，能存约 16 万个 IP 状态（1 个 IP 约 64 字节）
#   3) rate=5r/s —— 速率上限
#      - 每秒 5 个请求；也可写 30r/m（每分钟 30 个）
#      - Nginx 内部按"漏桶算法"匀速放行：相当于每 200ms 才允许一个请求过
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/s;

location /api/login {
  # 应用上面定义的限流规则
  #
  # burst=10 —— 允许的突发请求数（漏桶的桶容量）
  #   - 短时间内超过 5r/s 但累计未超过 10 个的请求会被"排队"，不会立即拒绝
  #   - 队列里的请求按 5r/s 的速率慢慢放行（最长延迟 2 秒）
  #   - 超过 burst 上限的请求直接 503（默认状态码，可用 limit_req_status 改）
  #
  # nodelay —— 关键修饰符，改变 burst 的行为
  #   - 不加 nodelay：突发请求会被"延迟处理"（用户感知到接口变慢）
  #   - 加 nodelay：突发请求"立即处理"，但同时占用桶里的位置
  #     桶满之前继续来的请求才会被拒绝，更适合登录、支付等接口
  #
  # 实际效果（rate=5r/s burst=10 nodelay）：
  #   - 第 1 秒突发来 15 个请求 → 前 10 个立即处理，后 5 个直接 503
  #   - 之后每秒最多 5 个请求能通过，桶以 5/s 的速率"恢复容量"
  limit_req zone=login burst=10 nodelay;

  # 限流通过后再转发到后端，后端不用再做 IP 级别的限流
  proxy_pass http://nest_backend;
}
```

进阶限流玩法：

```nginx
# 同一个 location 可以叠加多个 limit_req，全部命中才放行
# 例如：单 IP 5r/s + 全局总量 1000r/s
limit_req_zone $binary_remote_addr zone=per_ip:10m  rate=5r/s;
limit_req_zone $server_name        zone=global:10m  rate=1000r/s;

location /api/ {
  limit_req zone=per_ip  burst=10 nodelay;
  limit_req zone=global  burst=200 nodelay;
  proxy_pass http://nest_backend;
}

# 限制同一 IP 的并发连接数（不是速率，是同时打开的连接数）
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

location /download/ {
  limit_conn conn_per_ip 3;   # 单 IP 最多 3 个并发下载
  proxy_pass http://nest_backend;
}
```

`limit_req`（限速率）和 `limit_conn`（限并发）经常搭配使用：前者防刷，后者防大文件下载占满连接池。

### 7. 隐藏真实拓扑

外部只看到 `api.example.com:443`，看不到内部其实是 K8s 里 30 个 Pod。出问题时可以在不停机的情况下替换、扩缩容。

## NestJS 在反向代理后面要注意什么

NestJS 跑在 Nginx / Cloudflare / ALB 后面时，几个细节要处理：

### 1. 拿真实客户端 IP

`req.ip` 默认是反向代理的 IP（127.0.0.1），要让 Nest / Express 信任 `X-Forwarded-For`：

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set("trust proxy", 1); // 信任 1 层代理
  await app.listen(3000);
}
```

之后 `req.ip` / `@Ip()` 拿到的就是用户真实 IP。

### 2. 正确生成回调 URL

OAuth 回调、绝对路径生成时，要用 `X-Forwarded-Proto` / `X-Forwarded-Host`，否则会写死成 `http://localhost:3000/...`：

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
```

### 3. WebSocket 必须显式开启 upgrade

NestJS Gateway 在反向代理后，要让 Nginx 转发 WebSocket 握手：

```nginx
location /socket.io/ {
  proxy_pass http://nest_backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade    $http_upgrade;  # 关键
  proxy_set_header Connection "upgrade";       # 关键
  proxy_read_timeout 3600s;                    # 长连接超时调大
}
```

### 4. 超时设置要对齐

Nginx 默认 `proxy_read_timeout` 是 60s，长接口（导出 Excel、SSE）会被截断；NestJS 的 `timeout` Interceptor 也要和上游对齐，否则会出现"接口还没返回 Nginx 就 504"。

<details markdown="1">

<summary><h4>QA: Nginx、HAProxy、Traefik、Cloudflare 都是反向代理吗？</h4>💬点击展开/收起</summary>

是的，都是反向代理，但侧重点不同：

| 工具              | 类型         | 强项                                     | 典型场景             |
| ----------------- | ------------ | ---------------------------------------- | -------------------- |
| **Nginx**         | 通用反向代理 | 静态资源、配置灵活、社区资料多           | 自建服务器、VPS      |
| **HAProxy**       | 高性能 LB    | 7 层 / 4 层都行，TCP 层负载均衡更强      | 数据库连接池、长连接 |
| **Traefik**       | 容器原生     | 自动从 Docker / K8s 服务发现，配置即代码 | K8s、Docker Compose  |
| **Caddy**         | 自动 HTTPS   | 自动申请 / 续期 Let's Encrypt 证书       | 个人项目、快速上线   |
| **Envoy**         | 服务网格基石 | gRPC、动态路由、可观测性                 | Istio / 微服务网关   |
| **Cloudflare**    | 云端 CDN+WAF | DDoS 防护、全球 CDN、零配置 HTTPS        | 公网站点、防攻击     |
| **AWS ALB / ELB** | 云端 LB      | 与 AWS 生态深度集成                      | EC2 / ECS / EKS      |
| **API Gateway**   | API 专用网关 | 鉴权、限流、计费、API 版本化             | 对外开放 API 平台    |

实际项目里常**叠加使用**：Cloudflare（最外层，CDN+WAF）→ ALB（云内 LB）→ Nginx（应用层路由）→ NestJS。

</details>

<details markdown="1">

<summary><h4>QA: API Gateway 和反向代理是一回事吗？</h4>💬点击展开/收起</summary>

**反向代理是底层能力，API Gateway 是建立在反向代理之上的"业务层网关"**。

| 维度     | 反向代理（Nginx）     | API Gateway（Kong / APISIX / 自研）    |
| -------- | --------------------- | -------------------------------------- |
| 关注点   | 流量转发、负载均衡    | API 鉴权、限流、计费、协议转换         |
| 配置粒度 | 路径 / Host           | 单个 API 端点                          |
| 鉴权能力 | 简单的 Basic Auth、IP | OAuth2、JWT、API Key、签名             |
| 协议转换 | HTTP ↔ HTTP           | HTTP ↔ gRPC / SOAP / GraphQL           |
| 可观测性 | 日志                  | 完整的链路追踪、指标、API 文档自动生成 |
| 典型用户 | 运维 / SRE            | 开发 / 业务部门                        |

**简单理解**：所有 API Gateway 都包含反向代理能力，但反过来不成立。如果业务只是"前面挡一层"，Nginx 就够；如果要做开放平台、对外卖 API，才需要 API Gateway。

</details>

<details markdown="1">

<summary><h4>QA: 反向代理 vs 网关 vs 负载均衡 vs CDN，到底什么关系？</h4>💬点击展开/收起</summary>

这四个词经常混着用，但角度不同：

- **反向代理**：技术形态——"替服务器接请求"，是其他三者的**底层实现机制**
- **负载均衡（Load Balancer）**：功能视角——"把流量分给多台机器"，是反向代理最经典的用途
- **网关（Gateway）**：业务视角——"统一入口 + 业务策略（鉴权 / 限流 / 路由）"
- **CDN**：地理 + 缓存视角——"全球分布式节点 + 静态资源缓存"，离用户最近的边缘节点也是反向代理

一个完整的请求路径常常是：

```text
用户 → CDN（缓存命中直接返回）→ 云 LB（负载均衡）→ API Gateway（鉴权 / 限流） → Nginx（应用路由）→ NestJS
       ↑                       ↑                  ↑                          ↑
       全是反向代理在不同层级的体现
```

</details>

## 踩坑提示

1. **`trust proxy` 不开 → 限流按 IP 全是同一个**：所有请求 `req.ip` 都是 `127.0.0.1`，IP 限流瞬间被打穿
2. **`X-Forwarded-Proto` 没传 → OAuth 回调写成 http**：登录回调跳到 `http://...` 浏览器拒绝
3. **WebSocket 没加 upgrade header → 握手 400**：症状是连接立刻断开，看 Nginx 日志能发现
4. **buffer 太小 → 大文件下载失败**：`proxy_buffer_size`、`client_max_body_size` 要按业务调
5. **多层代理混乱**：Cloudflare → ALB → Nginx → NestJS 时，`X-Forwarded-For` 是一串 IP，要按层数取（最右边的最可信）

## 小结

- **反向代理 = 服务器前面的"门面"**：用户访问它，它把请求转发给真正的后端
- 与正向代理的区别：正向代理客户端，反向代理服务器
- 解决：负载均衡、SSL 卸载、静态分流、跨域、灰度、安全防护、拓扑隐藏
- NestJS 跑在反向代理后面要：开 `trust proxy`、传 `X-Forwarded-*` header、WebSocket 显式 upgrade、超时对齐
- Nginx / HAProxy / Traefik / Cloudflare / API Gateway 都是反向代理在不同场景下的具象
