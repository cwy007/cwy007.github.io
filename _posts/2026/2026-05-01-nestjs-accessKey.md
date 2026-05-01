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

## 参考

- 阿里云 AccessKey 最佳实践：<https://help.aliyun.com/zh/ram/user-guide/security-best-practices-of-an-accesskey-pair>
- AWS IAM Best Practices：<https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html>
- NestJS 认证文档：<https://docs.nestjs.com/security/authentication>
- OWASP Authentication Cheat Sheet：<https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
