---
layout: post
title: nestjs mysql workbench
subtitle: MySQL Workbench GUI
date: 2026-05-03 11:33:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - SQL
---

## MySQL Workbench GUI

```sql

use `hello_mysql`;

-- DQL
SELECT * FROM `hello_mysql`.`students`;

-- 步骤1 - 创建 database - DDL
CREATE SCHEMA `hello_mysql` ;

-- 步骤2 - 创建 table - DDL
CREATE TABLE `hello_mysql`.`students` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `name` VARCHAR(45) NOT NULL COMMENT '姓名',
  `age` INT NULL COMMENT '年龄',
  `sex` INT NULL DEFAULT 0 COMMENT '性别',
  `email` VARCHAR(60) NULL COMMENT '邮箱',
  `created_at` DATETIME NOT NULL COMMENT '创建时间',
  `status` INT NULL DEFAULT 0 COMMENT '是否删除：0未删除，1已删除',
  PRIMARY KEY (`id`));

-- 步骤3 - 创建 record - DML
INSERT INTO `hello_mysql`.`students` (`name`, `age`, `sex`, `email`, `created_at`, `status`) VALUES ('cwy', '34', '0', 'chanweiyan007@gmail.com', '2026-05-03 12:03:00', '0');

INSERT INTO `hello_mysql`.`students` (`name`, `age`, `sex`, `email`, `created_at`, `status`) VALUES ('cwy1', '34', '0', 'chanweiyan007@gmail.com', '2026-05-03 12:03:00', '0');
INSERT INTO `hello_mysql`.`students` (`name`, `age`, `sex`, `email`, `created_at`, `status`) VALUES ('cwy2', '34', '0', 'chanweiyan007@gmail.com', '2026-05-03 12:03:00', '0');
INSERT INTO `hello_mysql`.`students` (`name`, `age`, `sex`, `email`, `created_at`, `status`) VALUES ('cwy3', '34', '0', 'chanweiyan007@gmail.com', '2026-05-03 12:03:00', '0');

-- 步骤4 - 修改 - DML
UPDATE `hello_mysql`.`students` SET `name` = 'cwy11' WHERE (`id` = '2');


-- 步骤5 - 删除 - DML
DELETE FROM `hello_mysql`.`students` WHERE (`id` = '7');

-- 步骤6 - 清空 table 数据的语句 - DDL
TRUNCATE `hello_mysql`.`students`;

-- 步骤6 - 删除 table 的语句 - DDL
DROP TABLE `hello_mysql`.`students`;

-- 步骤7 - 删除 database 的语句 - DDL
DROP DATABASE `hello_mysql`;

 ```

## 常用数据类型

- INT：存储整数

- VARCHAR(100): 存储变长字符串，可以指定长度

- CHAR：定长字符串，不够的自动在末尾填充空格

- DOUBLE：存储浮点数

- DATE：存储日期 2023-05-27

- TIME：存储时间 10:13

- DATETIME：存储日期和时间 2023-05-27 10:13

其余的类型用到再查也行。

这里还有个 TIMESTAMP 类型，它也是存储日期时间的，但是范围小一点，而且会转为中央时区 UTC 的时间来存储。

## 查询语句

```sql

SELECT * FROM hello_mysql.student;

SELECT
    `name`, `score`
FROM
    `hello_mysql`.`student`;

SELECT
    `name` AS '姓名', score AS '分数', age
FROM
    hello_mysql.student
WHERE
    age >= 19 AND score > 80;

SELECT
    *
FROM
    student
WHERE
    name LIKE '王%';

SELECT
    *
FROM
    student
WHERE
    class NOT IN ('一班' , '二班');

SELECT
    *
FROM
    student
WHERE
    age BETWEEN 18 AND 20;

SELECT
    *
FROM
    student
LIMIT 0 , 5;

SELECT
    *
FROM
    student
LIMIT 5;

SELECT
    *
FROM
    student
LIMIT 5 , 5;

SELECT
    name, score, age
FROM
    student
ORDER BY score ASC , age DESC;

select class as 班级, avg(score) as 平均成绩 from student group by class order by 平均成绩 desc;

select class, count(*) as count from student group by class;

select class, avg(score) as avg_score from student group by class having avg_score > 90;

SELECT
    class
FROM
    student;

SELECT DISTINCT
    class
FROM
    student;

select avg(score) as 平均成绩, count(*) as 人数, sum(score) as 总成绩, min(score) as 最低分, max(score) as 最高分 from student;

SELECT
    CONCAT('xx', name, 'yy'),
    SUBSTR(name, 2, 3),
    LENGTH(name),
    UPPER('aa'),
    LOWER('TT')
FROM
    student;

SELECT
    ROUND(1.234567, 2),
    CEIL(1.234567),
    FLOOR(1.234567),
    ABS(- 1.234567),
    MOD(5, 2);

SELECT
    YEAR('2026-05-03 15:09:33'),
    MONTH('2026-05-03 15:09:33'),
    DAY('2026-05-03 15:09:33'),
    DATE('2026-05-03 15:09:33'),
    TIME('2026-05-03 15:09:33');

select name, if(score >=60, '及格', '不及格') from student;

select name, score, case when score >= 90 then '优秀' when score >= 60 then '良好' else '差' end as '档次' from student;

select version(), database(), user();

select nullif(1,1), nullif(1,2);

select coalesce(null, 1), coalesce(null, null, 2);

select greatest(1,2,3), least(1,2,3,4);

select greatest(1, '123', 3);

select greatest(1, convert('123', signed), 3);

select greatest(1, cast('123' as signed), 3);

select date_format('2026-05-03', '%Y年%m月%d日');

select str_to_date('2026-05-03', '%Y-%m-%d');


```
