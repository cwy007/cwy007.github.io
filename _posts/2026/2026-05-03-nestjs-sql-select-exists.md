---
layout: post
title: nestjs sql select子查询和exists
subtitle: 突破单表查询瓶颈：深入理解 SQL 子查询与 EXISTS 优化
date: 2026-05-03 18:33:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - SQL
---

在复杂的业务场景中，我们常常需要基于一个查询的结果去执行另一个查询，这就是**子查询（Subquery）**。子查询可以让哪怕最复杂的逻辑论证都能在一条 SQL 语句中完成。而 `EXISTS` 关键字作为子查询的绝佳伴侣，在处理海量数据的性能优化时更是不可或缺。

本文将结合 SQL 原生语句与 NestJS (TypeORM) 实战，带你彻底搞懂并用好它们。

## 1. 什么是子查询？

子查询是指嵌套在其他 SQL 语句（如 `SELECT`、`INSERT`、`UPDATE` 或 `DELETE`）内部的查询。
按子查询出现的位置分类，我们可以将其分为以下三种常见用法：

### 1.1 `WHERE` 中的子查询（最常见）
当我们需要使用一个未知的值作为过滤条件时，子查询极为好用。

```sql
-- 查询所有分数高于"全校平均分"的学生
SELECT name, score
FROM student
WHERE score > (SELECT AVG(score) FROM student);
```

### 1.2 `FROM` 中的子查询（派生表）
把一个复杂的 select 查询结果当成一张临时的“虚拟表”来用。注意：放在 `FROM` 后的子查询必须用 `AS` 指定一个表别名。

```sql
-- 先查出每个班级的平均成绩，然后再在这个临时结果集里过滤
SELECT class_id, avg_score
FROM (SELECT class_id, AVG(score) AS avg_score FROM student GROUP BY class_id) AS class_avg
WHERE avg_score > 80;
```

### 1.3 `SELECT` 中的子查询
为返回的每一行记录计算一个额外的值。这通常会导致每主表一行就要查一次，等同于 `N+1` 查询问题，在大型表中需**慎用**。

```sql
-- 查询学生的名字，以及动态即时查出他所在班级的人数
SELECT
  name,
  (SELECT COUNT(*) FROM student s2 WHERE s2.class_id = s1.class_id) AS class_count
FROM student s1;
```

## 2. IN vs EXISTS：到底选哪个？

在处理集合包含过滤时，我们经常用到 `IN`（例如查询在某个集合里的学生）。而 `EXISTS` 是一个用于判断子查询是否会返回任何行的**布尔运算**（True / False）。

### 2.1 怎么用 `EXISTS` 以及它的短路求值

`EXISTS` 只关心子查询**是否有结果**（哪怕它 `SELECT 1` 或者 `SELECT NULL`），并不关心结果具体值是什么。
一旦找到第一条匹配的记录，它就会发生**短路（短路求值）**，立即停止对当前主表这一行的后续查找，性能极高。

```sql
-- 找出至少有一门"不及格"成绩的学生记录
-- 只要扫描到一条该生小于60的成绩，立马判定 True 并跳出，不会无脑查完这个学生所有的成绩。
SELECT name
FROM student s
WHERE EXISTS (
    SELECT 1
    FROM score sc
    WHERE sc.student_id = s.id AND sc.grade < 60
);
```

### 2.2 经典性能面试题：IN 和 EXISTS 谁更快？

结论并非绝对的谁好谁坏，这完全取决于“外侧主表”和“内侧子表”的数据量体量比例（著名的**小表驱动大表法则**）：

- **主表小、子表（被嵌表）大，用 `EXISTS`**：
  `EXISTS` 是对外表进行循环，每次拿外表的一条记录去子查询里执行验证。如果主表只有 100 条人名，而子表成绩表有 100万 条记录，那 `EXISTS` 配上子表外键索引直接起飞。
- **主表大、子表小，用 `IN`**：
  `IN` 的原理是先把子查询执行完毕，把结果集统一拉出来缓存在内存里，然后再拿外面的主表一行一行对比内存中的值。

## 3. NestJS (TypeORM) 中的写法

在 NestJS 的日常开发中，利用 TypeORM 的 `QueryBuilder` 构造包含 `EXISTS` 的子查询语句非常丝滑：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { Score } from './score.entity';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async findFailingStudents() {
    return await this.studentRepository
      .createQueryBuilder('student')
      .where((qb) => {
        // 在 WHERE 内部构造独立的 EXISTS 查询实例
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Score, 'score')
          .where('score.student_id = student.id')
          .andWhere('score.grade < 60')
          .getQuery();

        // 拼接包裹进 EXISTS 操作符中返回
        return `EXISTS ${subQuery}`;
      })
      .getMany();
  }
}
```

通过上述写法，我们既保持了 ORM 的类型安全防护，又能压榨出数据库底层原生命令应有的极限查询性能。

## QA

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 为什么 EXISTS 里面一般写 SELECT 1？写 SELECT * 有区别吗？</h4>💬点击展开/收起</summary>

在 SQL 发展早期或某些特定数据库中，写 `SELECT *` 可能会引起多余的列解析或数据提取，从而带来少许性能损耗。因此，程序员们总结出的习惯是写成 `SELECT 1`（1 只是一个常数占位符），以告诉数据库“我不在乎返回的具体字段值是什么，只要能查到一行记录就行”。

不过在现代的数据库优化器里（如较新版本的 MySQL、PostgreSQL 中），无论是写 `SELECT 1` 还是 `SELECT *`，甚至是 `SELECT 'hello'`，引擎在遇到 `EXISTS` 时都能**聪明地忽略掉 SELECT 列表的内容**，只会关注能否匹配到记录。因此两者在现代引擎中性能其实是一样的。但是，**写 `SELECT 1` 已经成为一种表明用意的行业标准（Best Practice）**。

</details>

<!-- #endregion -->
