---
layout: post
title: nestjs CNAME
subtitle: 从 DNS 协议到自定义域名部署，再到 GitHub Pages 的 CNAME 文件
date: 2026-05-01 10:53:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - DNS
---

## CNAME 是什么

**CNAME (Canonical Name) = DNS 中的"别名"记录**，把一个域名指向**另一个域名**。

```text
api.example.com.   IN CNAME   my-app.vercel.app.
my-app.vercel.app. IN A       76.76.21.21
```

浏览器查 `api.example.com`：

```text
DNS 递归解析:
  api.example.com → CNAME → my-app.vercel.app
  my-app.vercel.app → A → 76.76.21.21
最终拿到 IP: 76.76.21.21
```

### CNAME vs A 记录

| 类型      | 指向       | 适用场景                                     |
| --------- | ---------- | -------------------------------------------- |
| **A**     | 一个 IPv4  | 自有服务器、固定 IP                          |
| **AAAA**  | 一个 IPv6  | 同上                                         |
| **CNAME** | 另一个域名 | 第三方平台（Vercel/GH Pages/CDN/负载均衡器） |

CNAME 的核心价值：**第三方平台可以随时改 IP，你不用动**。

### CNAME 的限制

1. **根域名（apex / zone apex）不能用 CNAME**
   `example.com` 本身不能是 CNAME（与 SOA、NS 记录冲突）。要么用 A 记录，要么用云厂商的 ANAME / ALIAS / Flattened CNAME。
2. **同名记录互斥**
   一个名字有 CNAME 就不能再有 A、MX、TXT 等记录。
3. **多一跳 DNS 查询**
   理论上比 A 慢，实际有缓存可以忽略。

## 场景 1：把自定义域名指向 NestJS 服务

假设你有一个跑在云服务器上的 NestJS（端口 3000），想用 `api.example.com` 访问。

### 1. DNS 配置（任意一种）

**方式 A：A 记录（自有 IP）**

```text
api.example.com.  IN A  1.2.3.4
```

**方式 B：CNAME 到云厂商域名**

```text
api.example.com.  IN CNAME  ecs-1-2-3-4.compute.aliyun.com.
```

### 2. Nginx 反向代理 + HTTPS

```nginx
# ① 80 端口：所有 http 请求强制跳转到 https
server {
  listen 80;
  server_name api.example.com;                        # 匹配的域名（与 DNS 解析的域名一致）
  return 301 https://$host$request_uri;               # 301 永久重定向：保留原始 host + 路径 + query
}

# ② 443 端口：真正处理 https 请求并反代给 NestJS
server {
  listen 443 ssl http2;                               # 监听 443，启用 TLS 与 HTTP/2
  server_name api.example.com;

  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;   # Let's Encrypt 证书链
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;     # 对应的私钥

  location / {
    proxy_pass http://127.0.0.1:3000;                                        # 反向代理到本机的 NestJS
    proxy_set_header Host $host;                                             # 透传客户端请求的 Host 头
    proxy_set_header X-Real-IP $remote_addr;                                 # 透传客户端真实 IP
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;             # 追加到 XFF 链：client, proxy1, proxy2...
    proxy_set_header X-Forwarded-Proto $scheme;                              # 告诉后端原始协议是 http 还是 https
  }
}
```

证书用 Let's Encrypt 一键签：

```bash
sudo certbot --nginx -d api.example.com
```

### 3. NestJS 信任代理头

被反代后客户端真实 IP 在 `X-Forwarded-For`，要让 Express 识别：

```typescript
// main.ts
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.set('trust proxy', 1) // ✅ 信任前面一层 Nginx
  await app.listen(3000)
}
bootstrap()
```

否则 `req.ip` 永远是 `127.0.0.1`、`req.protocol` 永远是 `http`。

## 场景 2：在 NestJS 里查 DNS / 跟 CNAME 链

Node.js 内置 [`dns`](https://nodejs.org/api/dns.html) 模块，NestJS 直接用即可。

### 1. 单条解析

```typescript
import { Injectable } from '@nestjs/common'
import { promises as dns } from 'node:dns'

@Injectable()
export class DnsService {
  // 取 CNAME 链上的下一跳
  async resolveCname(host: string): Promise<string[]> {
    return dns.resolveCname(host) // ['my-app.vercel.app']
  }

  // 直接拿最终 IP（dns.resolve 会自动跟 CNAME）
  async resolveIp(host: string): Promise<string[]> {
    return dns.resolve4(host)
  }
}
```

### 2. 完整跟链直到 A 记录

```typescript
async traceCname(host: string, depth = 0): Promise<string[]> {
  if (depth > 10) throw new Error('CNAME loop')
  try {
    const [next] = await dns.resolveCname(host)
    return [host, ...(await this.traceCname(next, depth + 1))]
  } catch (e: any) {
    if (e.code === 'ENODATA' || e.code === 'ENOTFOUND') return [host]
    throw e
  }
}
```

输出示例：

```text
['api.example.com', 'my-app.vercel.app', 'cname.vercel-dns.com']
```

### 3. 自定义 DNS 服务器

```typescript
import { Resolver } from 'node:dns/promises'

const resolver = new Resolver()
resolver.setServers(['1.1.1.1', '8.8.8.8'])
const cnames = await resolver.resolveCname('api.example.com')
```

适合调试、绕过本地 hosts 缓存或对比公网 DNS 结果。

### 4. 一个域名健康检查接口

```typescript
@Controller('dns')
export class DnsController {
  constructor(private readonly dns: DnsService) {}

  @Get('inspect')
  async inspect(@Query('host') host: string) {
    return {
      host,
      cnameChain: await this.dns.traceCname(host),
      ips: await this.dns.resolveIp(host).catch(() => []),
    }
  }
}
```

## 场景 3：GitHub Pages 的 `CNAME` 文件（与 NestJS 无关，但容易混）

仓库根目录的纯文本文件 `CNAME`（**没有扩展名**）只有一行内容：

```text
cwy007.github.io
```

GitHub Pages 构建时读取这个文件，做两件事：

1. 把它当成自定义域名，签发 Let's Encrypt 证书
2. 把对应站点的 `Host` 头解析配置写好

仓库里这个 `CNAME` 文件**不是 DNS 记录**，它是给 GitHub 看的。真正的 DNS 配置要去你的域名服务商那里加：

```text
www.example.com.  IN CNAME  cwy007.github.io.
example.com.      IN A      185.199.108.153   # GitHub Pages 的 IP
example.com.      IN A      185.199.109.153
example.com.      IN A      185.199.110.153
example.com.      IN A      185.199.111.153
```

> 根域名 `example.com` 不能 CNAME，所以要配 4 条 A 记录到 GitHub 的 anycast IP。

## 排错速查

| 现象                                                  | 可能原因                                      |
| ----------------------------------------------------- | --------------------------------------------- |
| `dig api.example.com` 没有 CNAME 输出                 | DNS 没生效（TTL 还没过）/ 配错了在子域名上    |
| 浏览器报 `ERR_NAME_NOT_RESOLVED`                      | 同上，或运营商 DNS 缓存                       |
| HTTPS 报证书域名不匹配                                | 证书签的不是这个域名 / Nginx server_name 写错 |
| `req.ip` 总是 `127.0.0.1`                             | NestJS 没开 `trust proxy`                     |
| GitHub Pages 提示 "domain is not properly configured" | DNS 还没生效 / 没在仓库 Settings 里填域名     |
| 改了 CNAME 立刻不生效                                 | DNS 缓存（`dig +trace` 看实际值，等 TTL）     |

常用命令：

```bash
dig api.example.com           # 完整解析过程
dig api.example.com CNAME +short
dig api.example.com @1.1.1.1  # 指定 DNS 服务器
nslookup api.example.com
host api.example.com
```

## 一图流总结

```text
┌──────────────────────────────────────────────────────────────────┐
│ 三个语境下的 CNAME                                                 │
├──────────────────────────────────────────────────────────────────┤
│ 1. DNS 协议层                                                      │
│    api.example.com  ─CNAME─►  my-app.vercel.app  ─A─►  76.76.21.21│
├──────────────────────────────────────────────────────────────────┤
│ 2. NestJS 部署                                                     │
│    DNS(CNAME/A) → Nginx(443/HTTPS) → Node:3000                    │
│    main.ts: app.set('trust proxy', 1)                             │
├──────────────────────────────────────────────────────────────────┤
│ 3. NestJS 运行时查 CNAME                                           │
│    import { promises as dns } from 'node:dns'                     │
│    await dns.resolveCname(host)                                   │
├──────────────────────────────────────────────────────────────────┤
│ 4. GitHub Pages CNAME 文件                                         │
│    repo/CNAME (一行域名) + 域名商配 A/CNAME → 自动 HTTPS          │
└──────────────────────────────────────────────────────────────────┘
```

## 参考

- RFC 1034 §3.6.2 CNAME RR：<https://datatracker.ietf.org/doc/html/rfc1034>
- Node.js dns 模块：<https://nodejs.org/api/dns.html>
- NestJS 部署文档：<https://docs.nestjs.com/faq/keep-alive-connections>
- GitHub Pages 自定义域名：<https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site>
