---
layout: post
title: nestjs accessKey, RAM, username/password
subtitle: 三种凭证的本质区别，以及在 NestJS 里怎么用、怎么藏、怎么轮换
date: 2026-05-01 11:20:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - 安全
---

## 三种凭证一图区分

```text
┌────────────────────┬──────────────────────┬───────────────────────┐
│   username/password │       AccessKey       │         RAM            │
├────────────────────┼──────────────────────┼───────────────────────┤
│ 给"人"用            │ 给"程序"用            │ 不是凭证，是"权限体系"  │
│ 控制台登录          │ API / SDK 调用        │ 用来发各种凭证 + 授权  │
│ 可能开 MFA          │ AK + SK 签名          │ 子账号、用户组、角色…   │
│ 一长串就是密码      │ AccessKeyId+Secret    │ Policy(JSON) 决定权限   │
└────────────────────┴──────────────────────┴───────────────────────┘
```

| 维度     | username/password | AccessKey                    | RAM                               |
| -------- | ----------------- | ---------------------------- | --------------------------------- |
| 全称     | 用户名 / 密码     | Access Key ID + Secret       | Resource Access Management        |
| 用户类型 | 人                | 程序                         | 一套体系（含 User、Role、Policy） |
| 使用方式 | 浏览器登录        | SDK 签名请求                 | 在控制台/API 里管理上面两种       |
| 暴露后果 | 控制台被登录      | API 全权调用，**最危险**     | 体系本身不会"泄漏"                |
| 推荐做法 | MFA + 密码强度    | RAM 子账号 + 最小权限 + 轮换 | 用 RAM 角色 + STS 临时凭证        |

> 一句话：**RAM 不是凭证，是"管理凭证和权限的系统"**。AK 和密码是它发出来的两类东西。

## AccessKey 是怎么签名的

以阿里云 / AWS 为代表，请求**不直接带 Secret**，而是用 Secret 计算签名：

```text
client:
  string_to_sign = method + path + headers + body
  signature      = HMAC-SHA256(secretKey, string_to_sign)
  Header: Authorization = "AccessKeyId=AK..., Signature=..."

server:
  根据 AccessKeyId 查出 Secret
  用同样的算法重算签名 → 比对
```

好处：**Secret 永远不上线**，即使 HTTPS 被中间人破解，也只能拿到那一次的签名（带过期时间），不能伪造别的请求。

## 在 NestJS 里**调用别人**的云服务（典型场景）

比如调阿里云 OSS 上传文件、调短信服务发短信。

### 1. 配置：永远不要把 AK 写进代码

```bash
# .env（加进 .gitignore）
ALIYUN_ACCESS_KEY_ID=LTAI5tXXX
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxx
ALIYUN_OSS_BUCKET=my-bucket
ALIYUN_OSS_REGION=oss-cn-hangzhou
```

```typescript
// app.module.ts
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OssModule,
  ],
})
export class AppModule {}
```

### 2. 封装一个 OSS Service

```typescript
// oss.service.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OSS from 'ali-oss'

@Injectable()
export class OssService {
  private client: OSS

  constructor(private readonly config: ConfigService) {
    this.client = new OSS({
      accessKeyId: config.getOrThrow('ALIYUN_ACCESS_KEY_ID'),
      accessKeySecret: config.getOrThrow('ALIYUN_ACCESS_KEY_SECRET'),
      bucket: config.getOrThrow('ALIYUN_OSS_BUCKET'),
      region: config.getOrThrow('ALIYUN_OSS_REGION'),
    })
  }

  async put(key: string, buffer: Buffer) {
    return this.client.put(key, buffer)
  }
}
```

### 3. 给前端发"临时凭证"——STS（推荐）

直接把 AK 给前端 = 自杀。正确做法：后端用主 AK 调 STS 换一个**临时凭证**（带过期时间和最小权限），扔给前端：

```typescript
import * as Sts from '@alicloud/sts20150401'

@Injectable()
export class StsService {
  constructor(private readonly config: ConfigService) {}

  async assumeRole(userId: string) {
    const client = new Sts.default({
      accessKeyId: this.config.getOrThrow('ALIYUN_ACCESS_KEY_ID'),
      accessKeySecret: this.config.getOrThrow('ALIYUN_ACCESS_KEY_SECRET'),
      endpoint: 'sts.aliyuncs.com',
    })
    const res = await client.assumeRole({
      roleArn: 'acs:ram::123456:role/oss-uploader',
      roleSessionName: `user-${userId}`,
      durationSeconds: 3600, // 1 小时后失效
      policy: JSON.stringify({
        Version: '1',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['oss:PutObject'],
            Resource: [`acs:oss:*:*:my-bucket/uploads/${userId}/*`],
          },
        ],
      }),
    })
    return res.body?.credentials // { AccessKeyId, AccessKeySecret, SecurityToken, Expiration }
  }
}
```

前端拿到这套临时凭证直接 PUT 到 OSS，绕过 NestJS 服务器，省带宽。

## 在 NestJS 里**发凭证给别人**（自建 OpenAPI）

如果你的 NestJS 是别人调用的服务，你需要自己实现 AK/SK 签名。

### 1. 数据模型

```typescript
// access-key.entity.ts
@Entity()
export class AccessKey {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ unique: true })       accessKeyId: string  // 公开，可上日志
  @Column()                       secretHash: string   // ✅ 只存 hash
  @Column()                       userId: string
  @Column({ default: 'active' })  status: 'active' | 'disabled'
  @Column({ nullable: true })     lastUsedAt: Date
  @CreateDateColumn()             createdAt: Date
}
```

### 2. 生成 AK / SK

```typescript
import { randomBytes, createHash } from 'node:crypto'

generateAccessKey() {
  const accessKeyId = 'AK' + randomBytes(16).toString('hex')   // 32 字符
  const secret      = randomBytes(32).toString('base64url')    // 43 字符
  const secretHash  = createHash('sha256').update(secret).digest('hex')
  return { accessKeyId, secret, secretHash }
}
```

> Secret **只在创建时返回一次**，存库的是 hash。用户丢了只能重置。

### 3. 验签 Guard

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'

@Injectable()
export class AkSignatureGuard implements CanActivate {
  constructor(private readonly repo: AccessKeyRepository) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest()
    const ak  = req.header('X-Ak-Id')
    const ts  = req.header('X-Ak-Timestamp')
    const sig = req.header('X-Ak-Signature')

    if (!ak || !ts || !sig) throw new UnauthorizedException('missing signature')
    if (Math.abs(Date.now() - Number(ts)) > 5 * 60_000) {
      throw new UnauthorizedException('timestamp expired') // 防重放
    }

    const key = await this.repo.findActive(ak)
    if (!key) throw new UnauthorizedException()

    // 注意：你需要把 secret 明文存 KMS / Vault；这里用 hash 演示思路
    const stringToSign = `${req.method}\n${req.path}\n${ts}`
    const expect = createHmac('sha256', key.secretPlaintext).update(stringToSign).digest('hex')

    const a = Buffer.from(expect)
    const b = Buffer.from(sig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException()
    }
    req.user = { id: key.userId }
    return true
  }
}
```

要点：

- 时间戳防重放（5 分钟窗口）
- `timingSafeEqual` 防时序攻击
- AK 可以日志，**Secret 永远不可日志**

## username/password：人用的

NestJS 里登录最常见的是 Passport + JWT：

```bash
npm i @nestjs/passport @nestjs/jwt passport passport-local passport-jwt bcrypt
```

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException()
    }
    return { token: this.jwt.sign({ sub: user.id, name: user.username }) }
  }
}
```

铁律：

- **bcrypt / argon2** hash，不要 MD5/SHA
- 密码强度校验（长度、复杂度）
- 登录失败计数 + 速率限制（防爆破）
- 重要操作叠 MFA / 二次验证
- 别用 password 调 API，**API 用 AK**

## 三者怎么配合（推荐组合）

```text
人 (用户/管理员)
  └─ username + password + MFA  ──► 控制台 / 后台
        │
        │ 在控制台里创建子账号 / 角色
        ▼
RAM 体系
  ├─ User   → 颁发 AccessKey ──► 长期程序调用
  └─ Role   → 颁发临时凭证(STS) ──► 短期 / 给前端 / 跨账号
        │
        │ 程序拿着 AK / 临时凭证
        ▼
NestJS 服务
  ├─ 调外部云服务（OSS、SMS）：AK 放 .env，STS 给前端
  └─ 暴露自己的 OpenAPI：自己签发 AK，HMAC 验签
```

## 安全清单

- [ ] AK / 密码 / 数据库连接串等**全部走环境变量**，不进 git
- [ ] `.env*` 在 `.gitignore` 里，CI 用密钥管理（GH Actions Secret / Vault / KMS）
- [ ] 主账号 AK **从不直接用**，业务都用 RAM 子账号 / 角色
- [ ] 子账号最小权限（只允许 `oss:PutObject` 到指定 bucket 路径）
- [ ] 给前端发临时 STS，不发主 AK
- [ ] 自建 OpenAPI 的 Secret 只存 hash，明文只在创建时返回一次
- [ ] 验签用 `timingSafeEqual`，带 timestamp 防重放
- [ ] 密码用 bcrypt/argon2，不存明文，不存可逆加密
- [ ] AK 定期轮换（例如 90 天），账户登录开 MFA
- [ ] 错误日志不打 Secret / Token / Authorization 头

## 常见误区

1. **把 AK 写在前端代码里** — 等于公开发布密钥
2. **后端把 AK 通过接口直接返回给前端** — 同上
3. **AK 同时给多个项目共用** — 出事无法定位、无法轮换
4. **用 root / 主账号 AK 跑业务** — 一旦泄漏全盘失守
5. **密码存 MD5** — 现代 GPU 几小时跑完字典
6. **签名只看是否相等不防时序攻击** — 用 `timingSafeEqual`
7. **AK 没有过期 / 没有轮换** — 长期凭证就是定时炸弹

## QA

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: <code>STS</code> 是什么？为什么说它是"给前端的正确姿势"？</h4>💬点击展开/收起</summary>

**STS = Security Token Service**，云厂商（阿里云 / AWS / 腾讯云 / GCP 都有）提供的**临时凭证签发服务**。它接收一个长期凭证（你的主账号 AK 或 RAM 子账号 AK），返回一组**带过期时间、带最小权限**的临时凭证。

### 1. 临时凭证长什么样

普通 AK 只有两段：

```text
AccessKeyId     = LTAI5tXXX
AccessKeySecret = xxxxxxxx
```

STS 临时凭证是**三段**：

```text
AccessKeyId     = STS.NTxxx           ← 临时 ID（前缀通常是 STS.）
AccessKeySecret = xxxxxxxx            ← 临时 Secret
SecurityToken   = CAIS+ABCD...long... ← 关键！请求时必须带上这个 token
Expiration      = 2026-05-01T12:34:56Z ← 过期时间，常见 15min ~ 12h
```

> 多出来的 `SecurityToken` 是身份证，普通 AK 没有这一项。请求 OSS/SMS 等服务时**三个都要带**。

### 2. 工作流程

```text
①                ②                  ③                  ④
前端 ──登录──► NestJS ──主AK调用──► STS ──返回临时凭证──► NestJS
                                                          │
                                                          ▼
                                                       ⑤ 下发给前端
                                                          │
                                                          ▼
                                       ⑥ 前端用临时凭证直接 PUT OSS
```

- ①②：前端登录拿到自己的 JWT
- ③：NestJS 拿主 AK + 一份 Policy 调 `AssumeRole`
- ④：STS 校验主 AK + Policy → 返回临时凭证
- ⑤：NestJS 把临时凭证返给前端
- ⑥：**前端绕过 NestJS，直连 OSS**

### 3. 为什么是"前端的正确姿势"

| 直接发主 AK 给前端      | 用 STS 临时凭证                      |
| ----------------------- | ------------------------------------ |
| 永久有效，泄漏=全盘失守 | 1 小时过期，泄漏=损失可控            |
| 全部 OSS 操作权限       | 只能 `PutObject` 到 `uploads/<uid>/` |
| 没法区分用户            | 每个 `roleSessionName` 可审计        |
| 出事只能整个 AK 重置    | 自然过期，不需要做任何事             |

### 4. Policy 是怎么"缩权"的

`AssumeRole` 的 `policy` 参数是一段 JSON，**与 Role 自身权限取交集**——只能更小，不能更大：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["oss:PutObject"],
      "Resource": ["acs:oss:*:*:my-bucket/uploads/u_42/*"]
    }
  ]
}
```

哪怕这个 Role 本身有 `oss:*` 权限，临时凭证也只能 PUT 到 `u_42/` 这个目录下。

### 5. NestJS 里典型的接口

```typescript
@Post('sts/oss')
@UseGuards(JwtAuthGuard)
async getOssStsCredentials(@Req() req: Request) {
  const userId = req.user.id
  return this.sts.assumeRole(userId)
  // 返回 { AccessKeyId, AccessKeySecret, SecurityToken, Expiration }
}
```

前端拿到后初始化 OSS SDK：

```typescript
const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: cred.AccessKeyId,
  accessKeySecret: cred.AccessKeySecret,
  stsToken: cred.SecurityToken,        // ← 关键
  bucket: 'my-bucket',
  refreshSTSTokenInterval: 50 * 60_000, // 提前刷新
  refreshSTSToken: () =>
    fetch('/sts/oss', { method: 'POST' }).then(r => r.json()), // ← 上面是 @Post，这里别忘了 method
})
```

### 6. 适用场景

- **浏览器/小程序直传 OSS / S3**：最经典
- **App SDK**：避免把 AK 打包进 APK
- **跨账号访问**：A 账号的 Role 允许 B 账号 `AssumeRole`
- **CI/CD 临时部署**：用 OIDC 换 STS，避免在 GitHub Secrets 存长期 AK
- **联邦登录**：把企业 IdP 的身份换成临时 AWS/阿里云凭证

### 7. 各家叫法

| 云厂商 | 服务名                       | 接口                             |
| ------ | ---------------------------- | -------------------------------- |
| 阿里云 | STS                          | `AssumeRole`                     |
| AWS    | STS (Security Token Service) | `AssumeRole` / `GetSessionToken` |
| 腾讯云 | CAM 临时密钥                 | `AssumeRole`                     |
| GCP    | IAM Credentials API          | `generateAccessToken`            |
| 七牛云 | 上传凭证（uploadToken）      | 类似思路，单次有效               |

> 概念是一致的：**用长期凭证 + 一份限制策略，换一组短期、可缩小的凭证。**

### 8. 常见坑

1. **忘了带 `SecurityToken`**：用临时 AK 直接发请求，403 InvalidAccessKey
2. **Policy 写大了**：以为给了限制，实际还是与 Role 取交集——主要漏洞往往在 Role 本身权限太大
3. **`durationSeconds` 设成 12h**：泄漏窗口变大，建议默认 1h，前端按需自动刷新
4. **服务端不缓存**：每次请求都调 STS，命中限流。可以给同一个用户的临时凭证缓存到 80% 有效期
5. **`roleSessionName` 不唯一**：审计日志里看不出是哪个用户

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: <code>createHmac</code> 和 <code>timingSafeEqual</code> 是干什么的？</h4>💬点击展开/收起</summary>

它俩都来自 Node 的 `node:crypto` 模块，是写"AK/SK 验签"必用的两兄弟：

- **`createHmac`**：用一把密钥算消息的 HMAC 摘要，证明"这条消息是知道密钥的人发的"
- **`timingSafeEqual`**：恒定时间比较两个 Buffer，**避免时序攻击泄漏密钥**

### 1. `createHmac`：HMAC 是什么

HMAC = Hash-based Message Authentication Code = **带密钥的哈希**。

```typescript
import { createHmac } from 'node:crypto'

const sig = createHmac('sha256', 'my-secret-key')   // 算法 + 密钥
  .update('GET\n/api/users\n1714521600000')         // 待签字符串
  .digest('hex')                                    // 输出格式：hex / base64 / Buffer

// → '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
```

#### HMAC vs 普通 Hash 区别

```typescript
// ❌ 不带密钥：任何人都能算出同样的值，没法证明是"你"发的
createHash('sha256').update(msg).digest('hex')

// ✅ 带密钥：只有持有 secret 的人能算出 → 服务端用同样的 secret 重算就能验签
createHmac('sha256', secret).update(msg).digest('hex')
```

#### 常见用途

| 场景            | 字符串                                  |
| --------------- | --------------------------------------- |
| AK/SK 接口签名  | `METHOD\nPATH\nTIMESTAMP\nBODY_HASH`    |
| Webhook 验签    | GitHub `X-Hub-Signature-256` 用 SHA-256 |
| JWT (HS256)     | `base64url(header).base64url(payload)`  |
| 短链/分享 token | `id + expire + secret`                  |

#### 算法选哪个

```typescript
createHmac('sha256', secret)   // ✅ 默认推荐
createHmac('sha512', secret)   // 更长，性能稍差，安全余量更大
createHmac('sha1', secret)     // ⚠️ 老 API 兼容用，新项目别用
createHmac('md5', secret)      // ❌ 已不安全
```

#### 完整签 + 验示例

```typescript
// 客户端
const ts = Date.now().toString()
const stringToSign = `GET\n/api/orders\n${ts}`
const signature = createHmac('sha256', SK).update(stringToSign).digest('hex')

fetch('/api/orders', {
  headers: {
    'X-Ak-Id': AK,
    'X-Ak-Timestamp': ts,
    'X-Ak-Signature': signature,
  },
})

// 服务端
const expect = createHmac('sha256', secretFromDB).update(stringToSign).digest('hex')
// 然后用 timingSafeEqual 比对，不要直接 ===
```

### 2. `timingSafeEqual`：为什么不能用 `===`

`a === b` 或 `a.equals(b)` 在底层是**逐字节比较，遇到第一个不同就提前返回**——比较时间会随匹配前缀的长度变化。

```text
正确签名: 9f86d081884c7d65...
攻击者尝试:
  a86d... → 第 1 字节就不同，0.1µs 返回
  9a86... → 第 2 字节不同，0.2µs 返回
  9f86... → 第 3 字节不同，0.3µs 返回
  ...
```

**通过统计响应时间，攻击者可以一字节一字节地猜出整个签名**（time attack / timing attack）。这在云函数、慢网络下尤其可被利用。

`timingSafeEqual` 的实现是**无论两个 Buffer 是否相等，都把每一字节都 XOR 一遍再 OR 起来**——耗时只与长度相关，与内容无关。

```typescript
import { timingSafeEqual } from 'node:crypto'

const a = Buffer.from(expect)
const b = Buffer.from(actual)

// ⚠️ 长度不同必须先判断，不然 timingSafeEqual 会抛 RangeError
if (a.length !== b.length) return false

return timingSafeEqual(a, b)
```

### 3. 在 Guard 里的标准用法

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

verify(method: string, path: string, ts: string, secret: string, given: string) {
  const expect = createHmac('sha256', secret)
    .update(`${method}\n${path}\n${ts}`)
    .digest('hex')

  const a = Buffer.from(expect, 'hex')
  const b = Buffer.from(given, 'hex')      // 注意编码要一致

  if (a.length !== b.length) return false  // ① 长度不一致直接 false
  return timingSafeEqual(a, b)             // ② 恒定时间比较
}
```

### 4. 常见坑

1. **`timingSafeEqual` 长度不同抛错**
   先 `if (a.length !== b.length) return false`，否则 Node 会抛 `RangeError`。

2. **编码不一致**
   `digest('hex')` 出来的是 hex 字符串，请求头里也得是 hex；如果一边 base64 一边 hex，长度不一样直接挂。统一用 `Buffer.from(str, 'hex')` 转。

3. **`update()` 多次调用是累加，不是覆盖**
   ```typescript
   createHmac('sha256', k).update('a').update('b').digest('hex')
   // 等价于 update('ab')
   ```

4. **secret 类型**
   `createHmac(algo, key)` 的 key 接受字符串或 Buffer。**最好用 Buffer**（`Buffer.from(SK, 'utf8')`），避免不同 locale 的字符编码问题。

5. **不带 timestamp 防重放**
   只签 method+path 的话，攻击者抓包后可以无限重放。一定加 `ts` 进 stringToSign，并在服务端校验 `Math.abs(now - ts) < 5min`。

6. **签名包含 body 时**
   先对 body 做 hash，再把 hash 拼到 stringToSign，避免大 body 直接进 HMAC。
   ```typescript
   const bodyHash = createHash('sha256').update(body).digest('hex')
   const sts = `${method}\n${path}\n${ts}\n${bodyHash}`
   ```

### 5. 速记

- **`createHmac` = "我用密钥给这条消息盖个章"**
- **`timingSafeEqual` = "比较两枚章长得像不像，但比对时长不暴露差异在第几位"**
- 验签流程：**重算 → 转 Buffer → 校长度 → `timingSafeEqual`**

</details>

<!-- #endregion -->

## 参考

- 阿里云 AccessKey 最佳实践：<https://help.aliyun.com/zh/ram/user-guide/security-best-practices-of-an-accesskey-pair>
- AWS IAM Best Practices：<https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html>
- NestJS 认证文档：<https://docs.nestjs.com/security/authentication>
- OWASP Authentication Cheat Sheet：<https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
