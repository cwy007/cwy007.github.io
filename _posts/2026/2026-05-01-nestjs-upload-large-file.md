---
layout: post
title: nestjs 大文件分片上传
subtitle: 前端切片 + 后端合并 + 秒传 + 断点续传一条龙
date: 2026-05-01 10:04:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## 为什么要分片

直接 `POST` 一个几 GB 的文件会遇到一连串问题：

- **网关 / Nginx 限制**：默认 `client_max_body_size 1m`，超过直接 413
- **网络抖动**：传到 90% 断了，整个文件得重传
- **内存压力**：服务端如果用 `multer.memoryStorage()`，几 GB 文件直接撑爆 Node 进程
- **没法显示进度**：单请求的 `progress` 颗粒度差，用户体验糟
- **没法秒传**：相同文件每次都得完整传一遍

**分片上传**把文件切成若干小块，逐块上传、最后合并。带来三个能力：

| 能力     | 实现方式                                     |
| -------- | -------------------------------------------- |
| 断点续传 | 服务端记录已收到的分片，前端只补缺的         |
| 秒传     | 上传前用 hash 询问后端，已存在则直接返回 URL |
| 并发上传 | 多个分片并行 POST，明显提速                  |

## 整体流程

```text
┌─────────────┐                   ┌─────────────┐
│   浏览器     │                   │  NestJS     │
└──────┬──────┘                   └──────┬──────┘
       │  1. 计算文件 hash (web worker) │
       │ ─────── POST /verify  ───────► │
       │ ◄───── { exists, uploaded[] }  │  秒传 / 断点续传查询
       │                                │
       │  2. for chunk of missing:      │
       │ ─── POST /upload (chunk) ────► │  分片落盘到 tmp/<hash>/
       │                                │
       │  3. 全部上传完                  │
       │ ─────── POST /merge  ────────► │  按序合并 → 写入最终文件
       │ ◄────── { url }                │
```

## 前端：切片 + 并发上传

### 1. 切片

```typescript
const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

function createChunks(file: File) {
  const chunks: Blob[] = []
  for (let cur = 0; cur < file.size; cur += CHUNK_SIZE) {
    chunks.push(file.slice(cur, cur + CHUNK_SIZE))
  }
  return chunks
}
```

### 2. 计算 hash（用 Web Worker，避免阻塞主线程）

```typescript
// hash.worker.ts
import SparkMD5 from 'spark-md5'

self.onmessage = async ({ data: chunks }) => {
  const spark = new SparkMD5.ArrayBuffer()
  for (let i = 0; i < chunks.length; i++) {
    const buf = await chunks[i].arrayBuffer()
    spark.append(buf)
    self.postMessage({ progress: ((i + 1) / chunks.length) * 100 })
  }
  self.postMessage({ hash: spark.end() })
}
```

> 大文件全量 hash 慢。优化方案：**抽样 hash**（首尾 + 中间各取 2MB）牺牲一点碰撞率换速度。

### 3. 上传 + 并发控制

```typescript
async function upload(file: File) {
  const chunks = createChunks(file)
  const hash = await calcHash(chunks)

  // 1. 秒传 / 断点续传查询
  const { data } = await axios.post('/verify', {
    hash,
    name: file.name,
    total: chunks.length,
  })
  if (data.exists) return data.url

  // 2. 跳过已上传的分片
  const uploaded = new Set<number>(data.uploaded)
  const tasks = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ index }) => !uploaded.has(index))
    .map(({ chunk, index }) => () => {
      const fd = new FormData()
      fd.append('chunk', chunk)
      fd.append('hash', hash)
      fd.append('index', String(index))
      return axios.post('/upload', fd)
    })

  await runWithLimit(tasks, 4) // 并发 4

  // 3. 通知合并
  const { data: merged } = await axios.post('/merge', {
    hash,
    name: file.name,
    total: chunks.length,
  })
  return merged.url
}

// 简单的并发限制
async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number) {
  const ret: Promise<T>[] = []
  const executing = new Set<Promise<T>>()
  for (const task of tasks) {
    const p = task().finally(() => executing.delete(p))
    ret.push(p)
    executing.add(p)
    if (executing.size >= limit) await Promise.race(executing)
  }
  return Promise.all(ret)
}
```

## 后端：NestJS 实现

### 1. 安装依赖

```bash
npm i @nestjs/platform-express multer
npm i -D @types/multer
```

### 2. Controller

```typescript
// upload.controller.ts
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import * as fs from 'fs-extra'
import * as path from 'path'

const TMP_DIR = path.resolve(process.cwd(), 'uploads/tmp')
const TARGET_DIR = path.resolve(process.cwd(), 'uploads/files')

@Controller()
export class UploadController {
  // 1. 秒传 / 断点续传查询
  @Post('verify')
  async verify(@Body() body: { hash: string; name: string }) {
    const ext = path.extname(body.name)
    const target = path.join(TARGET_DIR, body.hash + ext)
    if (await fs.pathExists(target)) {
      return { exists: true, url: `/files/${body.hash}${ext}` }
    }
    const chunkDir = path.join(TMP_DIR, body.hash)
    const uploaded = (await fs.pathExists(chunkDir))
      ? (await fs.readdir(chunkDir)).map(Number).sort((a, b) => a - b)
      : []
    return { exists: false, uploaded }
  }

  // 2. 接收分片
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: diskStorage({
        destination: async (req, _file, cb) => {
          const dir = path.join(TMP_DIR, req.body.hash)
          await fs.ensureDir(dir)
          cb(null, dir)
        },
        filename: (req, _file, cb) => cb(null, req.body.index),
      }),
    }),
  )
  uploadChunk(@UploadedFile() _chunk: Express.Multer.File) {
    return { ok: true }
  }

  // 3. 合并
  @Post('merge')
  async merge(
    @Body() body: { hash: string; name: string; total: number },
  ) {
    const { hash, name, total } = body
    const ext = path.extname(name)
    const chunkDir = path.join(TMP_DIR, hash)
    const target = path.join(TARGET_DIR, hash + ext)
    await fs.ensureDir(TARGET_DIR)

    // 用流按序拼接，避免一次性读进内存
    const writeStream = fs.createWriteStream(target)
    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(chunkDir, String(i))
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(chunkPath)
          .on('end', resolve)
          .on('error', reject)
          .pipe(writeStream, { end: false })
      })
    }
    writeStream.end()

    // 清理临时分片
    await fs.remove(chunkDir)

    return { url: `/files/${hash}${ext}` }
  }
}
```

### 3. Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { UploadController } from './upload.controller'
import * as path from 'path'

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.resolve(process.cwd(), 'uploads/files'),
      serveRoot: '/files',
    }),
  ],
  controllers: [UploadController],
})
export class AppModule {}
```

### 4. 调大 body 限制

```typescript
// main.ts
import { NestFactory } from '@nestjs/core'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(json({ limit: '50mb' }))
  app.use(urlencoded({ extended: true, limit: '50mb' }))
  await app.listen(3000)
}
bootstrap()
```

> 单分片不要超过 `multer` 的默认限制（默认无限，但 Nginx 默认 `client_max_body_size 1m` 必须改）。

## Nginx 配置

```nginx
location / {
  client_max_body_size 50m;       # 单个分片大小上限
  proxy_request_buffering off;    # 大文件直接透传，不在 Nginx 缓冲
  proxy_pass http://127.0.0.1:3000;
}
```

## 关键设计点

### 1. 分片大小怎么选

| 大小  | 优点               | 缺点                    |
| ----- | ------------------ | ----------------------- |
| 1MB   | 失败重传成本低     | 请求多，HTTP 开销占比高 |
| 5MB   | **平衡，推荐默认** | —                       |
| 10MB+ | 请求少，吞吐高     | 失败重传贵，弱网不友好  |

### 2. 文件 hash vs 分片 hash

- **文件级 hash**：用来做秒传 / 标识文件
- **分片级 hash**：用来防分片传错位，可选。简单做法是只校验分片 size 和 index

### 3. 临时分片清理

`uploads/tmp/<hash>/` 会越堆越多。补一个定时任务清理 N 天没动过的目录：

```typescript
import { Cron } from '@nestjs/schedule'

@Cron('0 3 * * *') // 每天 3 点
async cleanup() {
  const dirs = await fs.readdir(TMP_DIR)
  const now = Date.now()
  for (const d of dirs) {
    const stat = await fs.stat(path.join(TMP_DIR, d))
    if (now - stat.mtimeMs > 7 * 24 * 3600 * 1000) {
      await fs.remove(path.join(TMP_DIR, d))
    }
  }
}
```

### 4. 并发安全

同一个文件被两个用户同时上传 / 合并，可能写入冲突。简单方案：

- `merge` 阶段用 `hash` 做 Redis 分布式锁
- 或合并完写一个 `<hash>.done` 标志文件，二次合并直接跳过

### 5. 大文件直传 OSS

如果用云存储（阿里 OSS / AWS S3 / 七牛），优先走它们的 **MultipartUpload** 接口：

- 后端只签名 / 鉴权
- 前端直接 PUT 到对象存储，不经过 Node 服务器
- 省带宽、省内存、自带断点续传

NestJS 这套实现适合**自建存储**或学习目的。

## 一图流总结

```text
┌──────────────────────────────────────────────────────────┐
│                       前  端                              │
│  File ─slice─► chunks ─Worker─► hash                     │
│                                                           │
│  POST /verify  ───────► { exists?, uploaded[] }           │
│  for missing chunks (并发=4):                             │
│    POST /upload (chunk + hash + index)                    │
│  POST /merge   ───────► { url }                           │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                     NestJS 后端                           │
│  uploads/                                                 │
│    tmp/<hash>/0,1,2...   ← multer diskStorage             │
│    files/<hash><ext>     ← 合并后最终文件                  │
│  ServeStaticModule 暴露 /files/* 给浏览器下载             │
└──────────────────────────────────────────────────────────┘
```

## QA

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: <code>Promise.race</code> 在并发控制里起的是什么作用？</h4>💬点击展开/收起</summary>

`Promise.race(iterable)` 接收一组 Promise，**只要有任何一个先 settle（resolve 或 reject），返回的 Promise 就以那个结果立刻 settle**，其余的会被忽略（但不会被取消，仍然继续在跑）。

```typescript
const p1 = new Promise(r => setTimeout(() => r('A'), 300))
const p2 = new Promise(r => setTimeout(() => r('B'), 100))
const p3 = new Promise(r => setTimeout(() => r('C'), 200))

await Promise.race([p1, p2, p3]) // 'B'  (100ms 最快)
```

### 1. 在分片上传里的作用：限流"一进一出"

回看上传里的并发控制：

```typescript
async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number) {
  const ret: Promise<T>[] = []
  const executing = new Set<Promise<T>>()
  for (const task of tasks) {
    const p = task().finally(() => executing.delete(p))
    ret.push(p)
    executing.add(p)
    if (executing.size >= limit) await Promise.race(executing)
  }
  return Promise.all(ret)
}
```

关键就一行：

```typescript
if (executing.size >= limit) await Promise.race(executing)
```

含义是：**当正在跑的任务数已经塞满 `limit`，就阻塞在这里，直到其中任意一个完成（race 出第一个），然后腾出位置启动下一个**。这就是经典的"令牌池"模式。

时间线（`limit = 4`，10 个分片）：

```text
时间 →
[c1][c2][c3][c4]                    ← 起 4 个，executing 满了
                ↑ Promise.race 等任一个完成
[c1][c2][c3][c4][c5]                ← c2 先完，腾位 → 起 c5
                ↑ race 又等
...
```

### 2. 为什么不用 `Promise.all` + 切片

也可以这样写（俗称"批处理"）：

```typescript
for (let i = 0; i < tasks.length; i += 4) {
  await Promise.all(tasks.slice(i, i + 4).map(t => t()))
}
```

差别：

- 批处理是"**齐步走**"：4 个里最慢的那个决定下一批何时开始 → 弱网下被掉队任务拖累
- `race` 是"**滚动窗口**"：完一个补一个 → 始终保持 4 个在跑，吞吐更高

### 3. 容易踩的坑：reject 的传播

`Promise.race` 遇到第一个 reject 会**整体 reject**：

```typescript
const p1 = Promise.reject(new Error('boom'))
const p2 = new Promise(r => setTimeout(() => r('ok'), 100))

await Promise.race([p1, p2]) // ❌ throw 'boom'，p2 还在跑但被忽略
```

在并发控制里，如果某个分片失败，`race` 会把错误抛到 `await` 处，导致整个上传中断。修法：

```typescript
const p = task()
  .catch(e => { /* 单独处理：失败重试 / 记录 / 标记 */ })
  .finally(() => executing.delete(p))
```

或者 `Promise.race` 之后用 `Promise.allSettled` 收集所有结果再统一判断。

### 4. `race` 还能做什么

- **超时**：

  ```typescript
  function withTimeout<T>(p: Promise<T>, ms: number) {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms),
      ),
    ])
  }
  ```

- **取消（配合 AbortController）**：拿到第一个结果就 abort 其他请求
- **多源选最快**：CDN 切换、DNS over HTTPS 多服务器查询

### 5. 和兄弟方法对比

| 方法                 | 行为                                                |
| -------------------- | --------------------------------------------------- |
| `Promise.all`        | 全成功才成功；任一失败立刻失败                      |
| `Promise.allSettled` | 等全部 settle，返回结果数组（含成功/失败）          |
| `Promise.race`       | **第一个 settle 决定结果**（无论成功失败）          |
| `Promise.any`        | 第一个**成功**决定结果；全部失败抛 `AggregateError` |

> 经验：限流用 `race` + `Set`；可能失败的批量任务用 `allSettled` 收尾；多源容错用 `any`。

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: <code>import * as path from 'path'</code> 是什么写法？</h4>💬点击展开/收起</summary>

这是 **TypeScript / ESM 的"命名空间导入" (namespace import)**，把模块的所有具名导出聚合到一个对象里。

```typescript
import * as path from 'path'

path.join(__dirname, 'a', 'b')
path.resolve(process.cwd())
path.extname('foo.txt')   // '.txt'
```

等价于"`path` 模块导出的所有东西，我作为一个对象拿来用"。

### 1. 为什么 NestJS / TS 项目里大量这么写

Node 内置的 `path`、`fs`、`crypto`、`os` 都是 **CommonJS 模块**，没有默认导出（`module.exports = { join, resolve, ... }` 是一个对象，没有 `default` 字段）。在 TS 里：

```typescript
// ❌ 严格 ESM 模式 / "esModuleInterop": false 时编译报错
import path from 'path'

// ✅ 命名空间导入：把 module.exports 当成 namespace
import * as path from 'path'

// ✅ 也可以解构具名导入
import { join, resolve } from 'path'
```

### 2. 三种写法区别

```typescript
import path from 'path'           // ① 默认导入
import * as path from 'path'      // ② 命名空间导入
import { join } from 'path'       // ③ 具名导入
```

| 写法 | 拿到的是什么               | CJS 模块能用吗                          |
| ---- | -------------------------- | --------------------------------------- |
| ①    | `module.exports.default`   | **要开 `esModuleInterop: true`** 才能用 |
| ②    | 整个 `module.exports` 对象 | ✅ 直接能用                              |
| ③    | 解构出来的某个具名属性     | ✅ 直接能用                              |

### 3. `esModuleInterop` 和 `node:` 前缀

`tsconfig.json` 里推荐：

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```

开了之后：

```typescript
// 也能写成默认导入风格，更接近"现代"写法
import path from 'node:path'
import fs from 'node:fs'
```

`node:` 前缀是 Node 16+ 推荐的写法，**明确告诉运行时这是内置模块**，避免被同名 npm 包遮蔽，也比无前缀稍快。

### 4. 这几种写法选哪个？

| 场景                            | 推荐                                |
| ------------------------------- | ----------------------------------- |
| 老仓库 / 已经全用 `import * as` | 保持 `import * as path from 'path'` |
| 新项目 + `esModuleInterop`      | `import path from 'node:path'`      |
| 只用一两个函数                  | `import { join } from 'node:path'`  |
| 写库（要兼容老 TS / Babel）     | `import * as path from 'path'`      |

### 5. 常见坑

1. **`Cannot use 'import.meta'` / `default export` 报错**
   多半是 `esModuleInterop` 没开，又用了 `import path from 'path'`。改成 `import * as path` 即可。
2. **`path.default.join is not a function`**
   反过来：开了 `esModuleInterop` 的转译产物里，`import * as path` 拿到的对象有时会被包成 `{ default: {...} }`，调用要用 `path.join`，不要写 `path.default.join`。统一用具名导入最稳。
3. **运行时是 ESM (`"type": "module"`)**
   纯 ESM 下推荐 `import path from 'node:path'`（Node 自己做了 interop）。`import * as path` 也能用，但属性访问要小心：`path.default` 才是真正的导出对象。

### 6. 一句话总结

> `import * as path from 'path'` = "把这个 CommonJS 模块的整个 `module.exports` 当一个命名空间对象拿过来用"。在 TS 没开 `esModuleInterop` 的项目里，它是导入 Node 内置模块**最兼容**的写法。

</details>

<!-- #endregion -->

## 参考

- Multer：<https://github.com/expressjs/multer>
- spark-md5：<https://github.com/satazor/js-spark-md5>
- Nest 文件上传文档：<https://docs.nestjs.com/techniques/file-upload>
- AWS S3 Multipart Upload：<https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html>
