---
layout: post
title: nestjs abstract, public, protected, private, readonly
subtitle: NestJS 项目中最常见的 5 个 TS 类成员关键字
date: 2026-04-29 17:27:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - Typescript
---

## 一句话理解

| 关键字      | 一句话描述                   | 编译期 / 运行期               |
| ----------- | ---------------------------- | ----------------------------- |
| `abstract`  | 不能被 `new`，只能被继承     | 编译期 + 运行期（生成空类）   |
| `public`    | 谁都能访问（默认值，可省略） | **仅编译期**                  |
| `protected` | 自己 + 子类可访问，外部不能  | **仅编译期**                  |
| `private`   | 只有自己可访问               | **仅编译期**（用 `#` 才彻底） |
| `readonly`  | 一旦赋值就不能再改           | **仅编译期**                  |

> 重点：除了 `abstract` 和 `#private`，其他四个关键字编译到 JS 后都会**消失**。绕过 TS 直接 `obj['xxx']` 就能访问，所以它们更多是"团队约定 + 编辑器提示"。

## 0. `public`：默认就是它，但写出来更清晰

`public` 是 TypeScript 类成员的**默认可见性**——不写就等于 `public`。所以下面三种写法完全等价：

```typescript
class Foo {
  name: string;        // 默认 public
  public name2: string; // 显式 public
  // 等价
}
```

**那为什么还要写 `public`？** 主要是两种场景：

### 1. 构造函数参数属性简写

这是最高频的用途。下面两段代码完全等价：

```typescript
// 写法 A：手动声明 + 赋值
class UserService {
  name: string;
  age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

// 写法 B：参数前加访问修饰符（public / private / protected / readonly）
class UserService {
  constructor(public name: string, public age: number) {}
  // 自动声明同名属性 + 自动赋值，省 4 行代码
}
```

关键：**只有加了访问修饰符（`public` / `private` / `protected` / `readonly`）的构造函数参数才会自动变成类属性**，不加就只是普通参数。

```typescript
class A {
  constructor(name: string) {}      // name 只是参数，this.name 不存在
}
class B {
  constructor(public name: string) {} // ✅ this.name 自动生成
}
```

### 2. 团队规范：要求显式写访问修饰符

配合 ESLint 规则 `@typescript-eslint/explicit-member-accessibility`，强制每个成员都写 `public` / `private` / `protected`：

```typescript
// ❌ ESLint 报错：缺少访问修饰符
class Bad {
  name: string;
  greet() {}
}

// ✅ 通过
class Good {
  public name: string;
  public greet() {}
}
```

好处：一眼能看出每个成员的可见性，避免漏写 `private` 把内部状态泄漏出去。

### NestJS 里的实战写法

NestJS 控制器里的处理方法**几乎都是 `public`**（路由要被框架调用），但通常省略不写：

```typescript
@Controller("users")
export class UserController {
  // 注入：private readonly（不能 public，否则封装被破坏）
  constructor(private readonly userService: UserService) {}

  // 路由处理方法：默认 public（NestJS 框架要能调到）
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  // 写成显式 public 也对，但社区习惯省略
  @Post()
  public create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

**记忆窍门**：

- 注入参数 → `private readonly`（不写就是 public，破坏封装）
- 路由方法 / 公开 API → 默认 `public`（写不写都行，社区习惯省略）
- 内部辅助方法 → `private`（明确写出）

## 1. `abstract`：抽象类，强制子类实现

NestJS 里最常用的场景：定义一个"模板基类"，让具体业务类继承并补全实现。

```typescript
// 抽象类不能被实例化，只能被继承
export abstract class BaseRepository<T> {
  // 抽象方法没有实现体，子类必须重写
  abstract findById(id: string): Promise<T>;

  // 普通方法可以直接被子类继承
  protected log(msg: string) {
    console.log(`[${this.constructor.name}] ${msg}`);
  }
}

@Injectable()
export class UserRepository extends BaseRepository<User> {
  // 必须实现 findById，否则编译报错
  async findById(id: string): Promise<User> {
    this.log(`finding user ${id}`);
    return { id, name: "Alice" } as User;
  }
}

// new BaseRepository(); // ❌ 编译报错：Cannot create an instance of an abstract class
new UserRepository();    // ✅
```

**NestJS 真实用法**：

- 定义抽象 Strategy（如 `PassportStrategy`、`AbstractHttpAdapter`）
- 定义抽象 Service 让多种实现可注入：

```typescript
// 抽象类 + 依赖注入：把抽象类作为 Provider Token
abstract class CacheService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
}

@Injectable()
class RedisCacheService extends CacheService { /* ... */ }

@Module({
  providers: [
    { provide: CacheService, useClass: RedisCacheService }, // 用抽象类做 token
  ],
  exports: [CacheService],
})
export class CacheModule {}

// 业务类只依赖抽象，不耦合具体实现
@Injectable()
export class UserService {
  constructor(private readonly cache: CacheService) {}
}
```

> 抽象类**会**编译到 JS（变成普通 class，构造函数里抛错），所以可以作为运行时的依赖注入 token。这是它和 `interface` 的关键区别——`interface` 编译后完全消失，不能做 token。

## 2. `protected`：自己 + 子类可见

```typescript
class Animal {
  protected name: string;       // 子类能访问
  private secret = "hidden";    // 子类也不能访问

  constructor(name: string) {
    this.name = name;
  }
}

class Dog extends Animal {
  bark() {
    console.log(this.name);   // ✅ protected 可见
    // console.log(this.secret); // ❌ private 不可见
  }
}

const d = new Dog("Rex");
// d.name;   // ❌ 外部访问不到
// d.secret; // ❌ 外部访问不到
```

**NestJS 常见用法**：基类提供工具方法，子类调用，外部禁用。

```typescript
abstract class BaseController {
  protected handleError(err: Error) {
    throw new InternalServerErrorException(err.message);
  }
}

@Controller("users")
export class UserController extends BaseController {
  @Get(":id")
  async findOne(@Param("id") id: string) {
    try {
      return await this.userService.findOne(id);
    } catch (err) {
      this.handleError(err); // ✅ 子类可调用
    }
  }
}
```

## 3. `private` vs `#private`：两种"私有"

TypeScript 有两种私有成员，**机制完全不同**：

```typescript
class Foo {
  private a = 1;   // TS 私有：仅编译期检查
  #b = 2;          // ES 私有（hard private）：运行时强制
}

const f = new Foo();
// 编译期：两个都报错
// f.a; f.#b;

// 运行时：
console.log((f as any)["a"]);   // 1 ❌ 私有失效
console.log((f as any)["#b"]);  // undefined ✅ 真私有
```

| 维度          | `private name`          | `#name`            |
| ------------- | ----------------------- | ------------------ |
| 检查时机      | 仅 TS 编译期            | 运行时 JS 引擎强制 |
| 编译产物      | 普通属性 `this.name`    | 真正的私有字段     |
| 反射 / Object | 能被 `Object.keys` 看到 | 完全不可见         |
| 与 DI 配合    | 完全没问题              | 完全没问题         |
| 序列化 / JSON | **会**被序列化          | **不会**被序列化   |

**NestJS 实践建议**：

- 一般用 `private`（习惯、生态友好、IDE 提示完整）
- 涉及"绝对不能让外部碰"的敏感数据（密钥、内部缓存），用 `#`
- 构造函数注入 99% 用 `private readonly`：

```typescript
@Injectable()
export class UserService {
  // private + readonly 是 NestJS 注入的"标准搭配"
  // private  → 外部不能 service.userRepo 访问
  // readonly → 防止意外把它重新赋值（this.userRepo = null）
  constructor(private readonly userRepo: UserRepository) {}
}
```

## 4. `readonly`：只读属性

```typescript
class Config {
  readonly apiUrl: string;          // 只能在构造函数 / 初始化时赋值
  readonly tags: string[] = [];     // 注意：只是引用只读，数组本身可变！

  constructor(url: string) {
    this.apiUrl = url;              // ✅ 构造函数里允许
  }

  update() {
    // this.apiUrl = "new";         // ❌ 编译错误
    this.tags.push("a");            // ✅ 数组内容可变
    // this.tags = [];              // ❌ 引用不能换
  }
}
```

**`readonly` vs `const`**：

- `const`：变量不能重新赋值（只能用于 `let` / `const` 声明）
- `readonly`：类的属性 / 接口字段不能被赋新值（更细粒度）

**深度只读**要用 `Readonly<T>` 工具类型 / `as const`：

```typescript
const config = {
  port: 3000,
  cors: { origin: "*" },
} as const;

// config.port = 4000;     // ❌
// config.cors.origin = "x"; // ❌（深度只读）
```

NestJS 标准注入写法本质是参数属性简写：

```typescript
constructor(private readonly userRepo: UserRepository) {}

// 等价于：
class UserService {
  private readonly userRepo: UserRepository;
  constructor(userRepo: UserRepository) {
    this.userRepo = userRepo;
  }
}
```

## 4 个关键字组合速查

```typescript
@Injectable()
export class OrderService {
  // 公开常量（外部可读不可写）
  readonly version = "1.0.0";

  // 内部状态（外部不可见，自己也不能重赋值）
  private readonly cache = new Map<string, Order>();

  // 真私有：绝对不暴露
  #apiKey = process.env.STRIPE_KEY;

  // 子类可用的工具方法
  protected formatPrice(n: number) {
    return `¥${n.toFixed(2)}`;
  }

  // NestJS 注入：private + readonly
  constructor(private readonly db: DataSource) {}
}
```

<details markdown="1">

<summary><h4>QA: 为什么 NestJS 注入参数都写 `private readonly`？省略行不行？</h4>💬点击展开/收起</summary>

**省略可以编译通过，但强烈不推荐**。原因有三：

```typescript
// 写法 A：什么都不加（不推荐）
constructor(userRepo: UserRepository) {
  this.userRepo = userRepo; // 还得手动赋值
}

// 写法 B：只 public（不推荐）
constructor(public userRepo: UserRepository) {}
// service.userRepo.delete(...) 外部能直接调，破坏封装

// 写法 C：private readonly（推荐 ✅）
constructor(private readonly userRepo: UserRepository) {}
```

- `private` → 防止外部直接访问，强制走 service 方法
- `readonly` → 防止 `this.userRepo = null` 这种意外覆盖（特别是写测试时容易手滑）
- 是 NestJS 文档、社区、Nest CLI 生成模板的统一约定，团队协作零成本

</details>

<details markdown="1">

<summary><h4>QA: `private` 在运行时真的无效吗？为什么不推荐用 `#`？</h4>💬点击展开/收起</summary>

是的，`private` 编译到 JS 后就是普通属性：

```typescript
class Foo { private secret = 123; }

// 编译产物大致是：
class Foo {
  constructor() { this.secret = 123; }
}

const f = new Foo();
console.log(f["secret"]); // 123，private "失效"
```

`#` 才是 ECMAScript 标准的真私有，**那为什么 NestJS 生态默认不用 `#`**？

1. **历史包袱**：NestJS 诞生于 `#` 标准之前，社区代码、官方文档全是 `private`
2. **依赖注入零影响**：DI 关心的是构造函数签名，`private` / `#` 都不影响
3. **Reflect / decorators 兼容性**：早期某些装饰器实现对 `#` 字段有坑（现已修复）
4. **测试方便**：单测有时需要 spy 私有方法，`private` 通过 `(svc as any).xxx` 能改，`#` 完全改不动
5. **JSON 序列化**：很多库默认会 `JSON.stringify(obj)`，`private` 字段会被序列化，`#` 不会——根据需求选

**结论**：除非有真"零暴露"需求（密钥、内部状态绝对不能泄漏），用 `private` 即可。

</details>

<details markdown="1">

<summary><h4>QA: `abstract class` 和 `interface` 在 NestJS 里怎么选？</h4>💬点击展开/收起</summary>

| 维度          | `abstract class`      | `interface`            |
| ------------- | --------------------- | ---------------------- |
| 编译产物      | 保留为 JS 类          | 完全消失               |
| 能做 DI token | ✅                     | ❌（要配 Symbol token） |
| 能有默认实现  | ✅（普通方法）         | ❌（只能签名）          |
| 多重实现      | ❌（单继承）           | ✅（多实现）            |
| 适用场景      | 想统一基础逻辑 + 注入 | 纯类型约束             |

**NestJS 选择规则**：

- 想注入 → 用 `abstract class` 做 token
- 只是数据契约（DTO、API 响应类型）→ 用 `interface` / `type`
- 既要默认实现又要多继承 → 用 `mixin` 函数

```typescript
// interface 想做 DI token，必须用字符串 / Symbol token
export const USER_REPO = Symbol("USER_REPO");

interface IUserRepo { findById(id: string): Promise<User>; }

@Module({
  providers: [{ provide: USER_REPO, useClass: UserRepository }],
})
export class UserModule {}

// 注入处
constructor(@Inject(USER_REPO) private readonly repo: IUserRepo) {}
```

</details>

## 踩坑提示

1. **`private` 当成真私有用**：`(svc as any).xxx = 1` 能改，写敏感数据务必用 `#`
2. **`readonly` 不是深度冻结**：`readonly tags: string[]` 还是能 `push`，要冻结整个对象用 `Object.freeze` 或 `Readonly<T>`
3. **抽象类不能 `new`**：但运行时仍然存在；用 `interface` 时不能做 DI token
4. **构造函数注入忘加 `private`**：变成 public 属性，外部能直接 `service.repo` 调，破坏封装
5. **`#private` 与 `Object.assign` / 序列化不友好**：迁移老代码加 `#` 前要测好序列化、深拷贝

## 小结

- `abstract` —— 类不能 new，子类必须实现抽象方法；可作为 DI token
- `public` —— 默认可见性，可省略；构造函数参数加上才会自动变成属性
- `protected` —— 自己 + 子类可见，外部不可见（仅编译期）
- `private` —— 只有自己可见（仅编译期）；`#` 才是运行时真私有
- `readonly` —— 属性只能初始化时赋值；只是引用只读，不深度冻结
- NestJS 注入参数固定写法：`constructor(private readonly xxx: XxxService) {}`
