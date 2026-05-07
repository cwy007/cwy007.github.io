# mysql

mysql -uroot -pCwy17824

select version();

show databases;
use rails_proj_development;

select @@profiling;
set @@profiling=1;

select * from users;

show profiles;
show profile;
show profile for query 7;

show tables;

## cli

在 MySQL 命令行（CLI）中，可以通过以下几种常用的方法来查看表的字段信息：

1. **使用 `DESCRIBE` 或 `DESC` 命令**（最常用）：
   ```sql
   DESC table_name;
   -- 或者
   DESCRIBE table_name;
   ```
   这将以表格形式列出字段名、数据类型、是否允许为 NULL、主键信息、默认值等。

2. **使用 `SHOW COLUMNS` 命令**：
   ```sql
   SHOW COLUMNS FROM table_name;
   ```
   输出结果与 `DESCRIBE` 基本一致。

3. **查看建表语句**（可以查看详细的字段定义、注释和索引）：
   ```sql
   SHOW CREATE TABLE table_name;
   ```
   如果觉得输出排版太乱，可以在最后加上 `\G` 以垂直格式显示：
   ```sql
   SHOW CREATE TABLE table_name \G
   ```
