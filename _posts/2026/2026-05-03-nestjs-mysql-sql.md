---
layout: post
title: nestjs mysql sql
subtitle: MySQL 基础查询语法与常用内置函数实战精讲
date: 2026-05-03 15:46:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - SQL
---

在 NestJS 的后端开发中，无论是手写 SQL 还是使用 TypeORM、Prisma 等 ORM 框架，扎实的数据库查询基本功都是必不可少的。为了演示查询，我们可以连接到 MySQL 数据库，建立一张 `student` 表，插入一些基础数据，并用这些数据来练习各种查询语法和函数。

## 1. 基础查询语法

灵活组合以下各种查询条件，就可以应对日常开发中绝大多数的需求。

- **`where`**：查询基础条件。用于过滤符合条件的行记录，比如 `where id = 1`。
- **`as`**：别名定义。方便给列或表起一个更加直观短小的名字，比如 `select name as '姓名'`。
- **`and` / `or`**：逻辑连接词。用于连接多个条件，比如 `where age > 18 and score >= 60`。
- **`in` / `not in`**：集合精确查找。判断某个字段是否在给定的枚举列表里，比如 `where age in (18, 19, 20)`。
- **`between and`**：区间范围查找。比如 `where score between 60 and 100`（这会包含两端的边界值 60 和 100）。
- **`limit`**：分页与限制条数。常用于拉取指定页数数据，比如 `limit 0, 5` 表示从索引 0 开始取 5 条记录。
- **`order by`**：结果排序。可以指定先按哪个字段升序排、相等时再按哪一个降序排。比如 `order by score DESC, age ASC`。
- **`group by`**：分组。将具有相同字段值的行归为同一组，通常搭配聚合函数一起使用。比如 `group by grade` 查看每个年级有几个人。
- **`having`**：分组后的再过滤。`where` 是在分组前对原始行起作用的，而 `having` 专门用于对 `group by` 分集产生的结果之后进行过滤条件。如 `group by grade having avg(score) > 80`。
- **`distinct`**：去重修饰符。返回某列互不相同的值。

## 2. 常用内置函数

除了条件语法，MySQL 的 SQL 体系里提供了多如繁星的内置函数，可以完成非常精细的操作计算：

### 2.1 聚合函数

它们常与 `group by` 一同使用：

- **`avg()`**：求选定列的平均值。
- **`count()`**：计算总行数。
- **`sum()`**：对指定列做求和运算。
- **`min()` / `max()`**：求在所有组行中的最小值或最大值。

### 2.2 字符串函数

- **`concat(str1, str2, ...)`**：字符串首尾拼接。
- **`substr(str, pos, len)`**：截取指长子字符串。
- **`length(str)`**：返回字符串占据的字节长度。
- **`upper()` / `lower()`**：将整个字符串暴力转为大写 / 小写形式。

### 2.3 数值函数

- **`round(x, d)`**：对数字 `x` 四舍五入并保留 `d` 位的精度。
- **`ceil()` / `floor()`**：向上取整 / 向下取整。
- **`abs(x)`**：取该数值绝对值。
- **`mod(n, m)`**：取模（求余数运算）。

### 2.4 日期函数

- **`year()`, `month()`, `day()`**：从完整日期时间类型中分离抽取年、月、日整数。
- **`date()`, `time()`**：分别提取 `datetime` 字段上的日期部分或时刻部分。

### 2.5 条件函数

- **`if(expr1, expr2, expr3)`**：三元判断函数，若 expr1 成立返回 expr2，否则返回 expr3。
- **`case when ... then ... end`**：SQL 版的 `switch-case` 控制流，多重分支条件判定的首选。

### 2.6 系统函数

- **`version()`**：当前所在 MySQL 服务端的系统版本。
- **`database()`**：当前你连接命中的数据库名。
- **`user()`**：返回当前执行会话的操作授权用户名。

### 2.7 类型转换函数

- **`convert(expr, type)` / `cast(expr as type)`**：最基础泛用的强制类型转换函数。
- **`date_format(date, format)`**：按指定格式（如 `%Y-%m-%d`）从 date 解析出符合期望特征的文本结构。
- **`str_to_date(str, format)`**：根据预期的 format 把拥有相应格式的字符串反选为标准的 Date 数据结构形式去比对。

### 2.8 其他函数

- **`nullif(expr1, expr2)`**：如果 expr1 和 expr2 相等则返回 `NULL`，若不等则原样放行 expr1。
- **`coalesce(v1, v2, ...)`**：返回这一长串的引数列表中**第一个非 NULL** 的值，做默认兜底极其出彩。
- **`greatest(v1, ...)`, `least(v1, ...)`**：在一排入参中，通过横向对比直接甩出其中数值中的最大值或最小值。

灵活掌握以上这些查询语法和众多利器函数的综合编排，你就能够书写出千变万化且效能优良的业务查询语句了。
