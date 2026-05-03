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
