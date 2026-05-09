# mysql

mysql -uroot -pCwy17824

select version();

show databases;
use rails_proj_development;

select @@profiling;
set @@profiling=1;

select \* from users;

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

停止 Mac 上的 MySQL 服务有几种常见的方法，取决于你是如何安装它的：

### 方法一：如果你是通过 Homebrew 安装的（最常见）

在终端中运行以下命令：

```bash
brew services stop mysql
```

_(注意：如果是指定版本的 mysql，比如 mysql@8.0，则运行 `brew services stop mysql@8.0`)_

### 方法二：如果你是通过官方安装包（.dmg）安装的

1. 点击屏幕左上角的苹果图标 ，选择 **系统设置...**（或系统偏好设置）。
2. 在左侧菜单栏的最底部（或偏好设置面板的底部），找到并点击 **MySQL**。
3. 点击 **Stop MySQL Server** 按钮即可。

### 方法三：使用 `mysqladmin` 命令行工具

如果你知道 root 密码，也可以直接用命令行把它关掉：

```bash
mysqladmin -u root -p shutdown
```

输入密码后服务就会停止。

### 方法四：如果你是用 Docker 运行的

如果你是在 Docker 容器里跑的 MySQL，可以使用：

```bash
docker stop <你的容器名或ID>
```
