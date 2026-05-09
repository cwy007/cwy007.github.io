# docker

redis
容器中挂载目录 /data

mysql
容器中挂载目录 /var/lib/mysql

从你提供的截图来看，主要有两个问题导致你无法连接到 MySQL：

1. **容器没有在运行**：截图右上角显示容器的状态是 **`Exited (1)`**。MySQL 容器如果没有配置基础的环境变量（如 `MYSQL_ROOT_PASSWORD`），会在启动后立刻报错退出。当数据库没有运行时，你是无法连接它的。
2. **连接方式使用了 Socket 而不是 TCP**：你在本地 Mac 终端运行 `mysql` 时，默认会去寻找本地的 `/tmp/mysql.sock` 文件来连接。但你的 MySQL是跑在 Docker 里的，必须通过网络端口（TCP）来连接。

以下是正确的启动和连接步骤：

### 第一步：正确启动 MySQL 容器
如果之前的容器启动失败了（Exited），你需要先删除它，或者用正确的环境变量重新启动一个。MySQL 镜像要求必须设置密码。你可以使用以下命令启动一个在后台运行、并且暴露 `3306` 端口的 MySQL 容器：

```bash
docker run --name my_mysql -e MYSQL_ROOT_PASSWORD=你的密码 -p 3306:3306 -d mysql:latest
```
*(将 `你的密码` 替换为你想要设置的 root 密码)*

你可以通过 `docker ps` 命令确认它的状态是 `Up`。

### 第二步：通过命令行连接

如果容器已经正常运行中，你有两种方式通过命令行连接它：

#### 方式 1：在你的本地 Mac 终端（宿主机）连接
你需要指定 Host 为 `127.0.0.1`，强制 MySQL 客户端通过 TCP/IP 连接，而不是使用本地 Socket。
```bash
mysql -h 127.0.0.1 -P 3306 -u root -p
```
输入后，终端会提示你输入密码，输入你在启动时设置的 `MYSQL_ROOT_PASSWORD` 即可。

#### 方式 2：进入 Docker 容器内部连接 (使用 docker exec)
你也可以直接调用在运行的容器内部的 mysql 客户端程序，这样就不需要在本地安装 mysql 客户端了：
```bash
docker exec -it my_mysql mysql -uroot -p
```
同样，按下回车后输入密码即可进入 MySQL 切面。

## docker compose

docker run -d -p 3306:3306 -v /Users/chanweiyan/Desktop/mysql-docker-data:/var/lib/mysql --name mysql-container mysql

docker run -d -p 6379:6379 -v /Users/chanweiyan/Desktop/redis-docker-data:/data --name redis-container redis

docker build -t docker_compose_test:ddd .

docker run -d -p 3000:3000 --name docker_compose_test docker_compose_test:ddd

## docker network

docker run -d --network common-network  -v /Users/chanweiyan/Desktop/mysql-docker-data:/var/lib/mysql --name mysql-container mysql

docker run -d --network common-network -v /Users/chanweiyan/Desktop/redis-docker-data:/data --name redis-container redis

docker build -t docker_compose_test:ddd .

docker run -d --network common-network -p 3000:3000 --name nest-container docker_compose_test:eee

docker stop mysql-container redis-container nest-container

docker rm mysql-container redis-container nest-container

docker compose down --rmi all

docker network create common-network
docker network ls
docker network -h
