---
layout: post
title: nestjs 快速掌握 TypeORM
subtitle: 深入图解 TypeORM 核心架构：DataSource、EntityManager 与 Repository
date: 2026-05-04 13:14:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - TypeORM
---

![TypeORM](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/df762fa8ccb948f6ae3ca66a92640975~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

在 NestJS 开发中，TypeORM 是最常被使用的 ORM（对象关系映射）框架。学习 TypeORM 最初的门槛，往往是理不清它里面那几个长得很像的核心类。

本文将结合开局的架构思想图关系，为你彻底梳理清楚 **DataSource**、**EntityManager**、**Repository** 以及 **Entity** 之间的运作流转逻辑。

## 1. 核心架构层级解析

在开始讲解每个对象之前，我们先通过一幅完整的架构关系图来建立宏观认知：

```text
┌──────────────┐  initialize  ┌───────────────┐ - - - - - - - - -► ┌────────────────────┐
│  DataSource  ├─────────────►│ EntityManager │                    │                    │
└──────────────┘              └───────┬───────┘                    │        save        │
                                      │ getRepository              │       delete       │
                                      │                            │        find        │
┌──────────────┐                  ┌───▼───────────┐                │       query        │
│   Entity1    │◄................ │  Repository1  │ - - - - - - - -► createQueryBuilder │
└──────────────┘                  └───────────────┘                │                    │
                                                                   └────────────────────┘
┌──────────────┐                  ┌───────────────┐                           ▲
│   Entity2    │◄................ │  Repository2  │ - - - - - - - - - - - - - ┘
└──────────────┘                  └───────────────┘
```

从这幅架构依赖图上，它们呈现出明显的从属派生结构：`DataSource` 孕育出了全局 `EntityManager`，而 `EntityManager` 继续往下分离出了无数个专属的 `Repository`，但它们全部都共享右侧那一套统一的通用 API。

### 1.1 DataSource (数据源)
`DataSource` 是整套 TypeORM 体系的**绝对基石**。
它负责保存数据库连接的配置信息（如 host、port、username、password），并且掌管着实际的底层数据库物理连接池。在应用启动时，当调用 `initialize()` 方法后，真实的数据库连接被建立并激活，同时它内部会孕育出一个全局统一的 `EntityManager` 实例供人差遣。

### 1.2 EntityManager (全能实体管理器)
`EntityManager` 就像是一个**“全能管家”**。
顾名思义，它可以管理当前连接下你的**所有实体（Entity）**。你只要拿到一个 `EntityManager` 的实例，就可以对全库进行随心所欲的操作。唯一的代价是，每次调用操作方法时，你需要把目标“实体类”作为第一个参数传给它：

```typescript
// 每次都要额外传入实体类 (比如 User 或 Article) 交代你要对谁操作
await entityManager.find(User);
await entityManager.save(User, { name: 'Alice' });
await entityManager.find(Article);
```

*(在进行复杂跨表操作或者手动控制事务 Transaction 时，我们通常会高频地使用这个极其灵活的 EntityManager)*

### 1.3 Repository (专职仓储)
`Repository` 可以看作是 `EntityManager` 的**“专职分身”**。
在日常业务中，每次用 `entityManager` 都要多传一遍实体类实在有些繁琐，且不利于代码的职责剥离。于是 TypeORM 提供了 `Repository` 模式。
每个 `Repository` 都只绑定**唯一的一个 Entity**。底层实际上它是通过 `entityManager.getRepository(Entity)` 创建封装出来的。

```typescript
// 使用已被绑定好宿主的 UserRepository，方法变得异常简洁
await userRepository.find();
await userRepository.save({ name: 'Alice' });
```

### 1.4 Entity (实体)
`Entity` 就是一个纯纯的 TypeScript 类文件（类比图中的 `Entity1`、`Entity2`）。
通过加上 `@Entity()`、`@Column()` 等装饰器，它和数据库中的某一张物理表（Table）建立了一一对应的映射与反序列化关系。

---

## 2. 一脉相承的核心操作方法

不管是全能的 `EntityManager`，还是单绑的 `Repository`，它们提供的数据操作能力大纲是一样完整的。梳理其核心 API，主要包含以下常用方法：

- **`save`**: 新增或者修改 Entity。如果传入的对象带有 ID 主键，它底层会先执行一次 `SELECT` 确认数据是否存在，然后再决定是触发 `UPDATE` 还是 `INSERT`。
- **`update`**: 直接发起 `UPDATE` 修改操作，不会提前执行 `SELECT` 去验证数据，性能更高但缺乏对象生命周期监听。
- **`insert`**: 直接发起 `INSERT` 插入记录。
- **`delete`**: 通过主键 ID 或简单条件删除 Entity，底层直接发起 `DELETE` 操作。
- **`remove`**: 通过传入已查询出的完整 Entity 对象来删除记录。同样会先做对象追踪。
- **`find`**: 查找多条记录，可以传入包含 `where`、`order`、`relations` 等高级组合条件的对象。
- **`findBy`**: 稍微简便一点的快捷查找。直接接收 `where` 的查询条件，不用再在外面套一层 `{ where: {...} }`。
- **`findAndCount`**: 查找多条记录的同时返回符合条件的总数量。常用于前端分页列表。
- **`findByAndCount`**: 基于 `findBy` 提供查询以及获得总数量的功能。
- **`findOne`**: 查找符合条件的单条首条记录，支持配置复杂选项对象。
- **`findOneBy`**: 也就是 `findOne` 的简化免套壳版本，直接接收条件对象。
- **`findOneOrFail`**: 和 `findOne` 用法相同，但如果数据库中没查到符合条件的记录，它会主动抛出一个 `EntityNotFoundError` 异常。对付严格的守卫类查询很有效。
- **`query`**: 用于直接执行**纯原生 SQL 语句**。一般处理超级复杂的跨表或分析型 SQL 时打破黑盒使用。
- **`createQueryBuilder`**: 创建复杂的 SQL 语句构造器（如 `LEFT JOIN` 多个实体）。这是 TypeORM 进阶中最王牌的武器。
- **`transaction`**: 快捷包裹一层事务逻辑的方法套壳，可以把相关的 DB 变更包揽在一个安全的回滚控制流内。
- **`getRepository`**: (仅 EntityManager 拥有)：直接通过这个管家，拿到对应目标实体的专属 `Repository` 实例，获取后的方法操作如同上述。

## 3. 在 NestJS 中的实战形态

NestJS 官方通过 `@nestjs/typeorm` 将这些功能优雅地抹平了。
绝大多数常规的单表 CRUD（增删改查），我们都采用 **Repository 的依赖注入模式** 搞定：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';

@Injectable()
export class StudentService {
  constructor(
    // 将单一实体的专职仓储 Repository 注入进服务中
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  async fetchAll() {
    // 你直接就拥有了架构图中最后那块方块赋予的全部能力
    return await this.studentRepo.find();
  }
}
```

只有当我们遇到前面学过的 **Transaction 多表同生共死事务**需求时，我们才会在代码里往上追溯，去呼唤 `DataSource` 来手动建立接管底层的 `QueryRunner` 环境。
理清了这幅经典的架构脉络图，TypeORM 就仅仅剩下了熟练肌肉记忆过程了。

- [https://github.com/cwy007/typeorm_mysql_test](https://github.com/cwy007/typeorm_mysql_test)
