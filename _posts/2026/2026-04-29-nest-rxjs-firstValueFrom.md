---
layout: post
title: nestjs rxjs firstValueFrom, lastValueFrom
subtitle: 把 Observable 转成 Promise 的两个标准 API
date: 2026-04-29 18:01:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - RxJS
---

## 一句话理解

> **`firstValueFrom` / `lastValueFrom` = 把一个 Observable 转成 Promise，让它能配合 `await` 用。**

NestJS 的 `HttpService`（`@nestjs/axios`）、`ClientProxy.send()`（微服务）、`CacheStore.get()` 等很多 API 返回的都是 RxJS 的 `Observable<T>`，但业务代码大多希望用 `await` 平铺写。这两个 API 就是桥梁。

```typescript
import { firstValueFrom, lastValueFrom } from "rxjs";

// 拿"第一个值"就完成（适合 HTTP / RPC：本来就只发一次）
const data = await firstValueFrom(http.get("/users"));

// 等 stream "完成时的最后一个值"（适合多值流的汇总场景）
const last = await lastValueFrom(of(1, 2, 3)); // 3
```

## 区别一图看懂

```text
Observable: ──A──B──C──|         （| 表示 complete）

firstValueFrom →  A             // 拿到第一个值就 resolve，立刻 unsubscribe
lastValueFrom  →  C             // 等 complete 后 resolve 最后一个值
```

| API              | 何时 resolve   | 何时 reject                  | 拿到的值                      |
| ---------------- | -------------- | ---------------------------- | ----------------------------- |
| `firstValueFrom` | 第一个值发出时 | 流 error / 没有值就 complete | 第一个 next 的值              |
| `lastValueFrom`  | 流 complete 时 | 流 error / 没有值就 complete | complete 前最后一个 next 的值 |

**重要陷阱**：

- 如果 Observable 是"无限流"（如 `interval(1000)`），`lastValueFrom` 会**永远 resolve 不了**
- 如果流"什么值都没发就 complete"了，两者都会 reject 一个 `EmptyError`

## 为什么不用旧的 `.toPromise()`

RxJS 7+ **已废弃** `Observable.prototype.toPromise()`，原因是它的语义模糊：

```typescript
// 旧代码（不要再写）
const x = await of(1, 2, 3).toPromise();
// x === 3 还是 1？答案是 3——但很多人误以为是 1
```

`toPromise()` 取的是"最后一个值"（等同 `lastValueFrom`），但名字毫无暗示。所以官方拆成两个语义清晰的函数：

| 旧 API（已废弃）  | 等价新 API            |
| ----------------- | --------------------- |
| `obs.toPromise()` | `lastValueFrom(obs)`  |
| —                 | `firstValueFrom(obs)` |

如果你升级到 RxJS 7+，IDE 会在 `.toPromise()` 上画删除线。

## NestJS 里的典型场景

### 场景 1：HttpModule（`@nestjs/axios`）

`HttpService.get/post/...` 返回 `Observable<AxiosResponse<T>>`，必须包一层：

```typescript
import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

@Injectable()
export class GitHubService {
  constructor(private readonly http: HttpService) {}

  async getUser(name: string) {
    // ❌ 错误写法：拿到的是 Observable，不是数据
    // const res = this.http.get(`/users/${name}`);

    // ✅ 正确写法
    const res = await firstValueFrom(
      this.http.get(`https://api.github.com/users/${name}`),
    );
    return res.data; // AxiosResponse → data
  }
}
```

错误处理可以叠 `catchError`：

```typescript
import { catchError, firstValueFrom } from "rxjs";

const res = await firstValueFrom(
  this.http.get(url).pipe(
    catchError((err) => {
      throw new BadGatewayException(err.message);
    }),
  ),
);
```

### 场景 2：微服务 ClientProxy

`ClientProxy.send()` 返回 `Observable<T>`，每次订阅都会重新发一次请求：

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Injectable()
export class OrderService {
  constructor(@Inject("USER_SERVICE") private readonly client: ClientProxy) {}

  async getUser(id: string) {
    return firstValueFrom(
      this.client.send<User>({ cmd: "user.findById" }, id),
    );
  }
}
```

> 注意：`client.send()` 是**冷 Observable**，不订阅就不会真正发请求。直接 `await firstValueFrom(...)` 才会触发。

### 场景 3：拦截器 / 守卫里需要等异步结果

NestJS 的拦截器返回 `Observable<T>`，但内部经常需要 `await` 数据库或缓存：

```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly cache: Cache) {}

  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const key = buildKey(ctx);
    const cached = await this.cache.get(key);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap(async (data) => {
        await this.cache.set(key, data);
      }),
    );
  }
}
```

如果 `cache.get()` 返回 Observable，就要 `firstValueFrom(this.cache.get(key))`。

## 进阶用法

### 1. `defaultValue`：流为空时的兜底

RxJS 7.5+ 支持第二个参数指定"流为空就 complete 时"的默认值，避免 `EmptyError`：

```typescript
import { firstValueFrom, EMPTY } from "rxjs";

// 不传 defaultValue：reject EmptyError
// await firstValueFrom(EMPTY); // ❌ throws

// 传 defaultValue：resolve null
const x = await firstValueFrom(EMPTY, { defaultValue: null }); // null
```

业务里很常用：拿不到数据返回 `null`，而不是抛错。

### 2. 配合 `take(1)` / `timeout`

如果上游是热 Observable（如 WebSocket），用 `take(1)` 显式声明只要一个值，避免持有不必要的订阅：

```typescript
const msg = await firstValueFrom(
  socket$.pipe(
    take(1),
    timeout(5000), // 5s 超时
  ),
);
```

`firstValueFrom` 内部其实会自动 `take(1)`，但显式写出来对阅读者更友好。

### 3. 别在循环里大量 `await firstValueFrom`

```typescript
// ❌ 串行，慢
for (const id of ids) {
  results.push(await firstValueFrom(http.get(`/users/${id}`)));
}

// ✅ 并行：用 forkJoin 或 Promise.all
const results = await firstValueFrom(
  forkJoin(ids.map((id) => http.get(`/users/${id}`))),
);
// 或
const results = await Promise.all(
  ids.map((id) => firstValueFrom(http.get(`/users/${id}`))),
);
```

<details markdown="1">

<summary><h4>QA: 什么时候用 `firstValueFrom`，什么时候用 `lastValueFrom`？</h4>💬点击展开/收起</summary>

判断依据：**Observable 会发几个值**？

- **只发一个值就 complete**（HTTP 响应、RPC 调用、`of(x)`）→ 两者都行，但语义上推荐 **`firstValueFrom`**（更明确）
- **会发多个值最后 complete**（比如某个统计流的累加结果）→ 用 **`lastValueFrom`**
- **可能永远不 complete**（`interval`、`fromEvent`、热源 WebSocket）→ 必须用 **`firstValueFrom`**，否则永远卡住
- **流可能为空**（filter 过滤完没值了）→ 加 `{ defaultValue: ... }` 或上游 `defaultIfEmpty`

经验法则：**90% 场景用 `firstValueFrom`**。

</details>

<details markdown="1">

<summary><h4>QA: NestJS 文档里有些例子直接 `return` Observable，有些 `await firstValueFrom`，怎么选？</h4>💬点击展开/收起</summary>

NestJS 的 Controller / Resolver 支持三种返回值：`T` / `Promise<T>` / `Observable<T>`，框架会自动处理。所以技术上**两种写法都行**：

```typescript
// 写法 A：直接返回 Observable（NestJS 会自动订阅）
@Get(":id")
findOne(@Param("id") id: string) {
  return this.http.get(`/users/${id}`).pipe(map((res) => res.data));
}

// 写法 B：await 后返回数据
@Get(":id")
async findOne(@Param("id") id: string) {
  const res = await firstValueFrom(this.http.get(`/users/${id}`));
  return res.data;
}
```

**选 B（await）更推荐**，理由：

1. **错误堆栈更清晰**：`try/catch` 能正常工作，async 堆栈完整
2. **业务逻辑更线性**：多个异步操作不需要嵌套 `pipe(switchMap, ...)`
3. **团队门槛低**：不是每个后端同学都熟悉 RxJS
4. **配合事务、日志中间件**更方便

只有当你**真的需要流式语义**（合并多个流、防抖、节流、组合）时才保留 Observable。

</details>

<details markdown="1">

<summary><h4>QA: `firstValueFrom` 取消订阅了吗？会不会内存泄漏？</h4>💬点击展开/收起</summary>

会自动取消订阅，不会泄漏：

- `firstValueFrom`：拿到第一个值后立刻 unsubscribe
- `lastValueFrom`：流 complete 后自然结束订阅

但要注意：**Promise 一旦创建就无法"撤销"**。如果上游是个长任务（30s 的 HTTP 请求），调用方 `await` 中途想取消，没有原生办法。需要取消的场景请用 `AbortController`（HTTP）或保留 Subscription：

```typescript
const sub = http.get(url).subscribe({
  next: (res) => { /* ... */ },
  error: (err) => { /* ... */ },
});

// 想取消时
sub.unsubscribe();
```

或者在 `pipe` 里加 `takeUntil(cancel$)` 之类的取消信号。

</details>

<details markdown="1">

<summary><h4>QA: `return firstValueFrom(...)` 需要加 `await` 吗？</h4>💬点击展开/收起</summary>

**不强制需要，但推荐加**。两种写法运行结果相同：

```typescript
// 写法 A：直接 return（够用）
async getUser(id: string) {
  return firstValueFrom(this.client.send<User>({ cmd: "user.findById" }, id));
}

// 写法 B：return await（推荐）
async getUser(id: string) {
  return await firstValueFrom(this.client.send<User>({ cmd: "user.findById" }, id));
}
```

**为什么推荐 B**：

1. **错误堆栈更完整**：不加 `await`，错误堆栈会丢失当前函数的帧（"return-promise tail call"），调试时看不到 `getUser` 这一层
2. **`try/catch` 行为正确**：必须 `await` 才能在当前函数捕获到 RxJS 抛出的错误
   ```typescript
   async getUser(id: string) {
     try {
       return firstValueFrom(...);       // ❌ catch 抓不到（异常发生在外层 await 时）
       return await firstValueFrom(...); // ✅ catch 能抓到
     } catch (err) {
       this.logger.error(err);
     }
   }
   ```
3. **ESLint 规则已转向**：旧的 `no-return-await` 要求去掉 `await`，但 `@typescript-eslint/return-await` 推荐选项是 `"in-try-catch"` 或 `"always"`——**保留 `await` 是现代最佳实践**

**结论**：纯转发不带 `try/catch` 时两种写法都行；但**统一写 `return await` 不会错**，特别是在拦截器、事务、错误处理链路里。

</details>

<details markdown="1">

<summary><h4>QA: Observable 中文应该怎么说？</h4>💬点击展开/收起</summary>

**没有完全统一的译名**，常见说法：

| 译法            | 流行度 | 适用场景                                       |
| --------------- | ------ | ---------------------------------------------- |
| **可观察对象**  | ⭐⭐⭐⭐⭐  | 官方文档、书籍正式翻译；最准确字面译           |
| **可观察序列**  | ⭐⭐⭐⭐   | 强调"值的序列"语义，微软 .NET Rx 文档常用      |
| **数据流 / 流** | ⭐⭐⭐⭐⭐  | 口语 / 博客最常用，但泛指太广（不只是 RxJS）   |
| **响应式流**    | ⭐⭐⭐    | 偏 Reactor / 后端语境（Reactive Streams 规范） |
| **观察者对象**  | ⭐⭐     | **常见错译**——观察者是 `Observer`，别用反了    |

**实战建议**：

- **书面正式**：第一次出现写"**可观察对象（Observable）**"，后续直接用英文 `Observable`
- **口语 / 团队交流**：直接说 "Observable" 或 "流"，没人会念"可观察对象"
- **不要写"观察者"**：那是 Observer（订阅方），和 Observable（被订阅的源）正好相反

> 类似地：`Observer` = 观察者，`Subscription` = 订阅，`Subject` = 主题/中继。

中文技术圈惯例：博客、注释、代码评审里**直接用英文 `Observable`** 最常见，避免歧义。

</details>

## 踩坑提示

1. **忘了 `await`**：`firstValueFrom(obs)` 返回 Promise，没 await 直接当数据用会拿到 `Promise { ... }`
2. **空流抛 `EmptyError`**：上游用了 `filter` 等过滤后一个值都没发就 complete，必须传 `{ defaultValue }` 或 `defaultIfEmpty`
3. **无限热流用 `lastValueFrom`**：永远不 resolve，请求挂起
4. **错误处理位置**：`try/catch` 包 `await firstValueFrom(...)` 能抓到 RxJS 流里的 error；上游用 `catchError` 也能拦截，按需选择
5. **冷 Observable 重复订阅**：每次 `firstValueFrom` 都会触发一次订阅 = 一次新请求；要复用结果用 `shareReplay(1)`

## 小结

- `firstValueFrom(obs)` —— 拿第一个值就 resolve，**90% 场景用它**
- `lastValueFrom(obs)` —— 等 complete 拿最后一个值，**禁用于无限流**
- 都是 RxJS 7+ 替代废弃的 `.toPromise()` 的官方写法
- NestJS 主要用法：`HttpService`、`ClientProxy.send`、需要 `await` Observable 的所有地方
- 配套：流可能为空就传 `{ defaultValue }`；要超时用 `timeout()`；要并行用 `forkJoin` 或 `Promise.all`
