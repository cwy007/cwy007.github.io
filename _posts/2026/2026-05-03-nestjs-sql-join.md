---
layout: post
title: nestjs sql join
subtitle: 彻底掌握一对一、多表连接（JOIN）查询与级联操作
date: 2026-05-03 16:48:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - SQL
---

在实际的业务开发中，数据往往不会一股脑地全塞在一张表里，为了避免数据冗余和维护一致性，通常会通过拆表把数据分散存放在多张关联表中（即数据库的范式设计）。这就意味着，我们需要在查询时把分散的数据重新拼凑起来。这就离不开强大的 **JOIN（连接）** 查询，以及配套使用的 **级联（Cascade）外键约束**。

## 1. 多表连接查询（JOIN）

JOIN 是 SQL 中用于把两张或多张表横向结合起来的操作。这就像是把两个具有“血缘关系”的 Excel 表格合并成一张巨表。

### JOIN / INNER JOIN（内连接）

内连接是最常见、最符合直觉的连接方式。`JOIN` 在很多 SQL 方言中默认指代的就是 `INNER JOIN`。

**原理：求两张表的“交集”**。系统会去比对左右两张表，只有当左边和右边的表**都有**相互匹配的外键记录时，这条数据才会被放到结果集中。任意一方没匹配上的直接忽略。

```sql
-- 查询拥有有效身份档案（id_card）的学生（student），且双方都必须有数据
SELECT s.name, c.card_number
FROM student AS s
INNER JOIN id_card AS c ON s.card_id = c.id;
```

### LEFT JOIN（左连接）

也称为左外连接。

**原理：以“左表”（写在 `JOIN` 左边的表）为主心骨**。结果一定会原样保留左边的所有行。如果右边对应的表没有和它匹配的数据，也没关系，数据库会强行拼上去，只不过右边提供的数据空位会全部填上 `NULL`。

```sql
-- 查询所有的学生以及他们的选课成绩。
-- 即使有的学生还没选课、或者是旷考没有成绩记录，左表（学生）的信息依然存在，而从右表（成绩）带回的字段值为 NULL。
SELECT s.name, sc.score
FROM student AS s
LEFT JOIN score AS sc ON s.id = sc.student_id;
```

### RIGHT JOIN（右连接）

也称为右外连接。

**原理：和左连接完全对称，以“右表”为主心骨**。结果会毫无保留地输出右表的所有行，如果左表没有相关数据则全部填 `NULL`。
*在真实的后端开发中，大多数程序员往往通过对换表名的书写顺序，用 `LEFT JOIN` 完全替代 `RIGHT JOIN`，这样代码从上向下的阅读流更符合正常人类逻辑。*

## 2. 外键设置中的级联方式（Cascade）

通常我们用 JOIN 进行的是读取操作，而在增删改时，多张表之间的联动约束则由**外键（Foreign Key）的级联选项**掌控。
当建立两张表的外键约束关系（例如：`用户表 user` 关联 `凭证表 credential`），你要告诉数据库如果主表用户注销销户了，从表中依赖他的那堆凭证该怎么办？

### 常见的级联策略

1. **RESTRICT / NO ACTION (严格拒绝 / 默认)**：
   这是关系型数据库最常见的默认保护网。如果你试图删掉一个还有小弟绑着它的“主表”行，数据库直接报错拉闸，拒绝你的 `DELETE` 或 `UPDATE` 行为。
2. **CASCADE (级联斩杀 / 级联同步)**：
   非常爽快的自动联动方式。比如你配了 `ON DELETE CASCADE`。只要我们在主库把这个 user 删除，所有关联着他为外键依赖的 credential ，数据库会不动声色地**自动打包帮你全部删光**，省得你再写几个 Delete 语句跑去扫尾。`ON UPDATE CASCADE` 同理，主键改了底下的关联也同步修改。
3. **SET NULL (设为空)**：
   也是一种非常绅士的处理方法。如果你删掉了 user 主库记录被设置为 `SET NULL` 后，从库所有依赖过它的数据并不会凭空消失被销毁，而是把用来绑定的 `user_id` 那个单元格温和地改成 `NULL` 值变成漂流记录。（但要求从表的对应外键字段在建表时不要勾选非空报错 Not Null）。

在 NestJS 开发中，如果我们使用 **TypeORM** 这种 ORM 引擎装饰器，通常在一对多或一对一声明外键列时就能轻松挂配：

```typescript
@OneToOne(() => IdCard, {
  onDelete: 'CASCADE',  // 级联删除，学生毕业删除了，其对应的附加属性表记录一块干掉
  onUpdate: 'CASCADE'
})
@JoinColumn()
idCard: IdCard;
```

## 3. 多对多关联查询（Many-to-Many）

除了常见的一对一（比如学生与身份证）、一对多（比如班级与学生），在业务中最复杂的通常是**多对多（Many-to-Many）**关系。典型的场景有：
- **文章与标签**：一篇文章可以有多个标签，一个标签下也可以对应多篇文章。
- **学生与课程**：一个学生可以选修多门课程，一门课程里也有多个学生。

### 数据库层面：引入中间表

在关系型数据库中，是无法直接在两张表上通过一个外键来实现多对多关系的。我们必须引入第三张表——**中间表（Join Table / Junction Table）**。
中间表的核心职责是记录双方主键的映射关系。例如在 `student_course` 中间表中，只会存放两个核心字段：`student_id` 和 `course_id`。

**纯 SQL 查询多对多的方法：**
由于中间表的阻隔，我们需要连续使用两次 `JOIN` 把三张表连起来找数据。

```sql
-- 查询小明同学选修的所有课程名称
SELECT s.name AS student_name, c.name AS course_name
FROM student AS s
-- 1. 先把学生主表和中间表联系起来
INNER JOIN student_course AS sc ON s.id = sc.student_id
-- 2. 再通过中间表顺藤摸瓜，把外键对应的课程表联系起来
INNER JOIN course AS c ON sc.course_id = c.id
WHERE s.name = '小明';
```

### NestJS (TypeORM) 中的多对多配置与反向连表

如果你使用 TypeORM 等现代 ORM 框架，多对多开发体验会得到极大提升。你甚至不需要手动去数据库里建那张繁琐的中间表，只需要像下面这样通过 `@ManyToMany` 和 `@JoinTable()` 装饰器声明，框架会自动帮你生成中间表并在查询时处理连接：

```typescript
// student.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Course } from './course.entity';

@Entity()
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // 划重点：@JoinTable() 必不可少，且只需在多对多关系的"拥有方"加上即可
  @ManyToMany(() => Course)
  @JoinTable()
  courses: Course[];
}
```

配置完成后，当你在 NestJS 中调用 `studentRepository.find({ relations: ['courses'] })` 时，底层就会自动发出上面带两次 `INNER JOIN` 的原生 SQL 语句，将复杂的连表数据一秒封装为嵌套的 JSON 对象返回给前端。
