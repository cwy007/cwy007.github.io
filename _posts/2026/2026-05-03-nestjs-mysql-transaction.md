---
layout: post
title: nestjs mysql transaction 和 savepoint
subtitle: 彻底搞懂 ACID、事务并发控制与局部回滚（Savepoint）
date: 2026-05-03 20:39:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - SQL
---

在真实的后端业务开发中，我们常常会遇到诸如“转账”这样的场景：A 账户扣钱，B 账户加钱。如果 A 扣钱成功了，但在执行 B 加钱的那一瞬间服务器断电了，或者抛了一个异常，那这笔钱不就凭空消失了吗？

为了解决这种“多步操作必须同生共死”的问题，我们需要引入关系型数据库的超级重器——**事务（Transaction）**。而 **Savepoint（保存点）** 则是事务中非常实用的高级进阶特性。

## 1. 什么是事务及 ACID？

事务就是把一组 SQL 语句打包成一个**不可分割的工作单元**。你要么把它们全部执行成功，要么一个都别执行（全部撤销恢复原状）。
一个合格的事务机制必备四大特性，也就是俗称的面试必考题 **ACID** 属性：

- **A (Atomicity - 原子性)**：同生共死。所有操作要么全部提交（Commit），要么全部回滚（Rollback）。
- **C (Consistency - 一致性)**：数据在操作前后，不管是对内的数据完整性校验，还是针对外界业务上的守恒定律都要保持一致。
- **I (Isolation - 隔离性)**：多个事务并发执行时，彼此的中间状态应当是看不见、相互隔离的。
- **D (Durability - 持久性)**：一旦事务成功 Commit，数据的修改就是永久的，哪怕服务器立刻冒烟炸掉，重启后数据依然在硬盘上。

## 2. 原生 MySQL 中的事务与 Savepoint

### 2.1 基本的开启、提交与回滚

```sql
-- 开启事务
START TRANSACTION; (或者使用 BEGIN;)

-- 扣钱和加钱
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;

-- 如果一切顺利，提交更改，结果固化落盘
COMMIT;

-- 如果遇到错乱或人为后悔，马上撤销刚刚的一切更改变动
ROLLBACK;
```

### 2.2 嵌套防线：Savepoint 机制

假如你正在进行一个庞大耗时的超长事务编排，好不容易执行并算对了前面 99 步，如果在第 100 步报错并且你只能选 `ROLLBACK`，那就意味着这前面的 99 步全白干了。
**Savepoint（保存点）** 可以看作是在事务长河中插下的“读档存档点”。你可以仅把时光倒流到某个局部阶段，而不是全部推翻。

```sql
START TRANSACTION;

INSERT INTO logs (msg) VALUES ('第一步成功');
SAVEPOINT step1; -- 存档点 1

INSERT INTO logs (msg) VALUES ('第二步成功');
SAVEPOINT step2; -- 存档点 2

INSERT INTO logs (msg) VALUES ('第三步我要作死了（出错）');
-- 此时我们只想撤销第三步，保留一二两步的战果：
ROLLBACK TO step2;

-- 最后提交整个大事务，这样除了被回滚掉的第三步外，1、2两步都能落盘成功。
COMMIT;
```

## 3. 在 NestJS (TypeORM) 中实战事务与保存点

日常在 NestJS 中用 TypeORM 操作时，我们可以直接利用 `QueryRunner` 来执行最灵活的手动事务接管。这种控制流能清晰地处理 Savepoint。

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AccountService {
  // 直接注入 TypeORM 底层的 DataSource 实例
  constructor(private dataSource: DataSource) {}

  async complexTransferFlow() {
    // 实例化一个 queryRunner 取得数据库专属实体连接生命周期
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    // 1. 开启事务 (相当于 START TRANSACTION;)
    await queryRunner.startTransaction();

    try {
      // 业务步骤 A：正常的账户基础扣款
      await queryRunner.manager.query(`UPDATE account SET balance = balance - 100 WHERE id = 1`);

      // 插下第一个保存点
      // TypeORM 中的原生 query 方法是可以直接发指令做 Savepoint 的！
      await queryRunner.query('SAVEPOINT after_deduct');

      try {
        // 业务步骤 B：一个非常容易报错的外部风险写入逻辑（如调用某次不稳定的积分日志发放记录）
        await queryRunner.manager.query(`INSERT INTO risk_log (status) VALUES ('测试奖励')`);
      } catch (innerError) {
        console.error('积分发放失败，不用慌，局部存档倒流开始');
        // 撤回步骤 B 的更改，而不摧毁步骤 A
        await queryRunner.query('ROLLBACK TO after_deduct');
      }

      // 最后收尾，把所有的战果敲定
      await queryRunner.commitTransaction();

    } catch (err) {
      // 如果外层捕获了极其致命毁灭性的错误，则执行总撤销
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      // 最后无论如何千万别忘了放开对该数据库连接的使用释放
      await queryRunner.release();
    }
  }
}
```

通过引入 `QueryRunner` 配合原生的 `SAVEPOINT xxx`，我们巧妙地防范了由于个别非核心边缘服务报错而导致大事务完全垮塌重启的灾难性问题。

## QA

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 数据库事务隔离的“四大隔离级别”是什么，怎么影响幻读？</h4>💬点击展开/收起</summary>

在处理并发事务时，如果相互之间隔离不到位，会产生脏读、不可重复读、幻读等乱象。
为了追求性能和严格程度的平衡，SQL 规范定义了以下四个事务隔离级别（按严格程度从低到高排列，目前 MySQL InnoDB 默认采用的是 **Repeatable Read**）：

1. **Read Uncommitted (读未提交)**：最奔放的。事务 A 还没提交的中间值，居然可以被事务 B 看到。这叫做**“脏读”**。
2. **Read Committed (读已提交)**：解决了脏读（事务未提交前绝对不可见），但在同一个事务里，连续读取同一条数据如果它被别人改过了，数值会变成新的发生改变。这叫做**“不可重复读”**。
3. **Repeatable Read (可重复读)**：MySQL InnoDB 默认级别。解决了不可重复读，同一个长事务里无论你怎么读，一条记录的镜像都会如同你刚进来时一模一样（通过 MVCC 多版本并发控制实现）。但可能出现别人新插入了行你并不知道，这叫做**“幻读”**（MySQL 利用 Next-Key 锁间隙锁的机制，在大部分情况下实际上也解决了幻读）。
4. **Serializable (串行化)**：隔离级别的王者。所有的读写全部退化成排队排着串行单线跑，绝对安全但并发性能坠入冰谷。

</details>

<!-- #endregion -->
