---
layout: post
title: NestJS 日志最佳实践
subtitle: 内置 Logger、Pino、Winston、结构化日志与生产落地一条龙
date: 2026-05-01 17:30:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## 为什么日志很重要

日志是线上排障的第一手线索。日志做不好，生产出了问题只能瞎猜。一份好的日志系统需要：

- **结构化**（JSON）：机器可解析，方便 ELK / Loki / CloudWatch 查询
- **分级**（debug / info / warn / error）：过滤噪音
- **有 context**（traceId / userId / path / latency）：每条日志能串联到一次请求
- **高性能**：日志不能成为瓶颈（Pino 比 console.log 快 5-10 倍）
- **异步写入**：不阻塞请求处理

## NestJS 内置 Logger

### 基本用法

```typescript
import { Logger } from '@nestjs/common'

@Injectable()
export class CatService {
  private readonly logger = new Logger(CatService.name) // context = 'CatService'

  findAll() {
    this.logger.log('Fetching all cats')
    this.logger.warn('Deprecated endpoint')
    this.logger.error('Something broke', someError.stack)
    this.logger.debug('Raw query result', JSON.stringify(result))
    this.logger.verbose('Even more detail')
  }
}
```

### 日志级别控制

```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log'],       // 生产只开这三个
  // logger: false,                       // 关掉所有内置日志
})
```

### 优缺点

| 优点                     | 缺点                           |
| ------------------------ | ------------------------------ |
| 零依赖，开箱即用         | 输出纯文本，不是 JSON          |
| API 简洁                 | 不支持日志文件 / 远程传输      |
| 可自定义（实现接口替换） | 性能一般（底层 `console.log`） |

**结论**：开发环境用内置 Logger 看彩色输出；**生产环境换 Pino 或 Winston**。

## 生产方案一：Pino（推荐）

[Pino](https://getpino.io/) 是目前 Node 生态最快的 JSON logger，`nestjs-pino` 提供 NestJS 一等集成。

### 安装

```bash
npm i nestjs-pino pino-http pino-pretty
```

### 配置

```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }  // 开发：彩色可读
          : undefined,                                               // 生产：原生 JSON
        redact: ['req.headers.authorization', 'req.body.password'], // ← 脱敏
        customProps: (req) => ({ traceId: req.headers['x-trace-id'] }),
        serializers: {
          req: (req) => ({ method: req.method, url: req.url, id: req.id }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 在 main.ts 替换默认 Logger

```typescript
// main.ts
import { Logger } from 'nestjs-pino'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger)) // ← 用 Pino 接管 NestJS 内置日志
  await app.listen(3000)
}
```

### 在 Service 里注入

```typescript
import { Logger } from 'nestjs-pino'

@Injectable()
export class OrderService {
  constructor(private readonly logger: Logger) {}

  async create(dto: CreateOrderDto) {
    this.logger.log({ msg: 'Creating order', userId: dto.userId, amount: dto.amount })
    // 输出 JSON: {"level":"info","msg":"Creating order","userId":42,"amount":99.9,...}
  }
}
```

> `nestjs-pino` 自动把 `pino-http` 中间件接进来，每个请求的 `req.log` 天然带有 `traceId`、`latency` 等字段。

## 生产方案二：Winston

Winston 生态更老，插件更多（日志文件轮转、多 Transport 同时写）。适合需要**同时写文件 + 发 Elasticsearch** 的场景。

### 安装

```bash
npm i nest-winston winston winston-daily-rotate-file
```

### 配置

```typescript
// app.module.ts
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'
import 'winston-daily-rotate-file'

@Module({
  imports: [
    WinstonModule.forRoot({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),           // 输出 JSON
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),     // 开发：简洁可读
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',               // 只保留 14 天
          zippedArchive: true,
        }),
      ],
    }),
  ],
})
export class AppModule {}
```

### 在 main.ts 替换

```typescript
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  await app.listen(3000)
}
```

## 结构化日志：每条日志该带什么

**最小字段集**：

```json
{
  "level": "info",
  "time": "2026-05-01T10:04:00.000Z",
  "msg": "Order created",
  "traceId": "abc-123",
  "userId": 42,
  "orderId": "ord-789",
  "latency": 38
}
```

| 字段      | 说明                                |
| --------- | ----------------------------------- |
| `level`   | `debug` / `info` / `warn` / `error` |
| `time`    | ISO 8601，统一 UTC                  |
| `msg`     | 人类可读的描述，**动词 + 名词**     |
| `traceId` | 全链路追踪 ID，贯穿整条请求         |
| `userId`  | 操作人，方便按用户查日志            |
| `err`     | 错误时带 `{ message, stack, code }` |
| `latency` | 耗时（ms），方便性能分析            |

**禁止出现在日志里的字段**：

- `password` / `passwordHash`
- `Authorization` / `token` / `cookie`
- 身份证号、银行卡号等 PII

Pino 的 `redact` 选项可以自动脱敏，Winston 可以写自定义 format 过滤。

## 请求追踪：TraceId 全链路透传

### 方式一：手动中间件（适合所有 Logger）

```typescript
// trace.middleware.ts
import { randomUUID } from 'node:crypto'
import { Injectable, NestMiddleware } from '@nestjs/common'

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: any, next: () => void) {
    req['traceId'] = (req.headers['x-trace-id'] as string) ?? randomUUID()
    res.setHeader('X-Trace-Id', req['traceId'])  // 回写到响应头，方便前端对账
    next()
  }
}
```

### 方式二：AsyncLocalStorage（推荐）

`AsyncLocalStorage` 在整个异步调用链上"隐式传递"上下文，不需要每个函数都手动传 `traceId`。

```typescript
// trace.context.ts
import { AsyncLocalStorage } from 'node:async_hooks'

export const traceStore = new AsyncLocalStorage<{ traceId: string; userId?: number }>()

export function getTrace() {
  return traceStore.getStore()
}
```

```typescript
// trace.interceptor.ts
import { randomUUID } from 'node:crypto'
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { traceStore } from './trace.context'

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest()
    const traceId = req.headers['x-trace-id'] ?? randomUUID()

    return new Observable(subscriber => {
      traceStore.run({ traceId }, () => {
        next.handle().subscribe(subscriber)
      })
    })
  }
}
```

在 Service 里随时取：

```typescript
import { getTrace } from './trace.context'

@Injectable()
export class PaymentService {
  create() {
    const { traceId } = getTrace()!
    this.logger.log({ msg: 'Payment initiated', traceId })
  }
}
```

## 错误日志：Exception Filter 统一捕获

```typescript
// all-exceptions.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp()
    const req    = ctx.getRequest()
    const res    = ctx.getResponse()
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error'

    this.logger.error({
      msg: message,
      status,
      path: req.url,
      method: req.method,
      traceId: req['traceId'],
      stack: exception instanceof Error ? exception.stack : undefined,
    })

    res.status(status).json({ statusCode: status, message, traceId: req['traceId'] })
  }
}
```

```typescript
// main.ts
app.useGlobalFilters(new AllExceptionsFilter())
```

## 日志分级使用规范

| 级别      | 什么时候用                                             |
| --------- | ------------------------------------------------------ |
| `debug`   | 开发调试：SQL、参数、中间状态。**生产关闭**            |
| `info`    | 正常业务流程节点：订单创建、用户登录、定时任务执行     |
| `warn`    | 可恢复的异常：重试、降级、弃用 API 被调用              |
| `error`   | 需要人介入的错误：数据库断连、第三方不可用、未捕获异常 |
| `verbose` | 比 debug 更细，通常只在本地临时用                      |

规则：

- 同一个请求的 `info` 不超过 3 条（太多等于没有）
- 循环体内 **不要** 打 `info`，最多 `debug`
- `error` 必须带 `stack`（或 `err` 对象）

## 性能：日志不要成为瓶颈

- **Pino** 异步写入，基准测试比 Winston 快 3-5 倍，比 `console.log` 快 8 倍
- **生产禁止 `pino-pretty`**（格式化有额外开销，且破坏 JSON 结构）
- **日志采样**：高频接口（如健康检查）可以只记录 1% 的请求

```typescript
pinoHttp: {
  autoLogging: {
    ignore: (req) => req.url === '/health',  // 健康检查不记录
  },
}
```

- **不要在 `debug` 里做复杂序列化**（`JSON.stringify(bigObject)`），先判断 level：

```typescript
// ❌ 无论 level 如何，JSON.stringify 都会执行
this.logger.debug(JSON.stringify(heavyObject))

// ✅ Pino 的 lazy eval（传对象不传字符串）
this.logger.debug({ heavyObject }, 'debug info')  // Pino 只在 debug 开启时才序列化
```

## 日志收集与查询

| 环境           | 推荐方案                                                   |
| -------------- | ---------------------------------------------------------- |
| 本地开发       | `pino-pretty` 彩色输出 / Winston Console transport         |
| 小型自建服务器 | 写文件 → `DailyRotateFile` → `logrotate`                   |
| 容器 / K8s     | 直接打到 stdout，由日志 agent（Filebeat / Fluent Bit）收集 |
| 云原生         | Cloudwatch Logs / 阿里云 SLS / Grafana Loki                |
| 全文搜索       | Elasticsearch + Kibana（ELK）/ OpenSearch                  |

> **不要在 NestJS 里实现日志上传**。把日志打到 stdout，由基础设施（Agent / Sidecar）处理传输。

## 一图流总结

```text
请求进来
  │
  ▼
TraceInterceptor / pino-http 中间件
  → 生成 traceId，注入 AsyncLocalStorage
  │
  ▼
业务 Service
  → this.logger.log({ msg, traceId, userId, ... })
  │
  ▼
Exception Filter（未捕获的错误）
  → this.logger.error({ msg, stack, traceId })
  │
  ▼
Pino / Winston
  → 格式化为 JSON
  → 写 stdout（容器）/ 文件（VM）
  │
  ▼
日志 Agent（Filebeat / Fluent Bit / CloudWatch）
  → 上传到 ELK / Loki / SLS
  │
  ▼
Kibana / Grafana 查询 traceId → 串联整条请求链路
```

## 参考

- nestjs-pino：<https://github.com/iamolegga/nestjs-pino>
- Pino 文档：<https://getpino.io/>
- nest-winston：<https://github.com/gremo/nest-winston>
- NestJS 日志官方文档：<https://docs.nestjs.com/techniques/logger>
- AsyncLocalStorage：<https://nodejs.org/api/async_context.html>
