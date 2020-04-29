---
layout:     post
title:      "MySQL: show index && explain select ..."
subtitle:   "用 explain 语句判断select查询是否使用了索引"
date:       2020-04-29 18:35:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - MySQL
---


#### 远程登录 mysql

mysql -hrm-abcdefghijkl.mysql.rds.aliyuncs.com \
-uusername -ppassword -Ddatabase_name

#### 显示索引信息

```bash
mysql> SHOW INDEX FROM table_name;
```

<https://www.runoob.com/mysql/mysql-index.html>

#### 判断select查询是否使用了索引

```bash
mysql> explain select * from zje;
```

<https://blog.csdn.net/u014453898/article/details/55004193>
