---
layout: post
title: Docker 基本概念
subtitle: 镜像、容器、仓库、数据卷与网络，一文搞懂容器化核心
date: 2026-05-01 23:12:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - Docker
  - NestJS
---

## 一句话理解

> **Docker = 代码的集装箱。**

把你的代码、运行环境（Node.js）、配置文件、甚至整套 Linux 底层依赖，全部打包到一个箱子里。不管这个箱子拉到开发机、测试服、还是生产环境的集群部署，**它的表现绝对一致**，彻底消灭 "It works on my machine"（在我电脑上好好的，怎么上去就挂了）。

## 三大核心概念

这三个概念构成了 Docker 的生命周期。

### 1. 镜像 (Image) —— "面向对象中的 Class"

镜像是一个**只读的模板**，里面包含了精简的操作系统和你的应用代码。

- 它是由一层一层的文件系统压缩包叠加而成的（见 QA 详述）。
- 比如：一个包含了 Node.js 20 运行环境和 NestJS 编译产物的综合产物。
- **操作**：通过 `docker build` 从 Dockerfile 制作出来。

### 2. 容器 (Container) —— "面向对象中的实例 Object"

容器是镜像的**运行态**。

- 它本质上是一个隔离的 Linux 进程（利用 namespace 和 cgroups 技术做环境隔离和资源限制）。
- 它在只读的镜像之上，加了一层临时的"可写层"。
- **操作**：通过 `docker run` 基于镜像启动容器。容器可以被启动、停止、重启、删除。

### 3. 仓库 (Registry) —— "代码有 GitHub，镜像有 Docker Hub"

集中存放各路神仙镜像的地方。

- 最大的公共仓库是 **Docker Hub**。你也可以自建私有仓库（Harbor / 阿里云 ACR 等）。
- **操作**：用 `docker push` 把本地制作好的镜像推到云端，用 `docker pull` 从云端拉取下来。

## 四个进阶概念

### 1. Dockerfile（镜像配方）

它是一个文本文件，里面是一条条指令，告诉 Docker 怎么一步步构建出这个镜像。
一个标准的 NestJS `Dockerfile` 示例（含多阶段构建）：

```dockerfile
# 阶段 1：构建环境（完整的 Node 镜像，用于编译）
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段 2：生产运行环境（精简镜像，只留必需品）
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
# 只把第一阶段里的打包产物拿过来
COPY --from=builder /app/dist ./dist

# 声明暴露端口并启动
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 2. 数据卷 (Volume) —— 数据持久化

容器是**无状态且阅后即焚的**，一旦容器被删了，里面随时产生的文件（比如数据库的存盘数据、用户上传的图片）就全灰飞烟灭了。
**Volume** 是绕过容器内部联合文件系统的机制，直接把宿主物理机的某个目录"挂载"进容器内部。

```bash
# 把主机的 /my/host/data 挂载到容器内部的 /var/lib/mysql
docker run -v /my/host/data:/var/lib/mysql mysql:8
```

这样即使整个 MySQL 容器全被扬了，你的核心数据还稳稳存在宿主机的磁盘上。

### 3. 网络 (Network) —— 容器间通信

默认情况下，容器之间互相处于孤岛状态。要让你的 NestJS 容器连上同一台机器上的 Redis 容器，我们需要"网络"。

- **Bridge (桥接网络)**：默认模式，你可以把容器全塞进同一个网桥里。同一桥接网络下的容器，可以通过**容器名**当作域名，互相解析出内网 IP（Docker 内部自带 DNS）。
- **Host (主机网络)**：让容器彻底放弃网络隔离，直接使用宿主机的网卡和端口（主要在原生 Linux 上生效）。

```bash
docker network create my-net
# 启动 redis，塞入 my-net 网络
docker run --network my-net --name my-redis -d redis
# 启动 nest，也塞进 my-net，这时代码里只要连 host 为 'my-redis' 即可
docker run --network my-net --name my-nest -e REDIS_HOST=my-redis -d my-nest-app
```

### 4. Docker Compose —— 编排多容器大礼包

每次敲五六条这么长的 `docker run` 命令太折磨人。我们可以用 `docker-compose.yml` 声明一整套服务矩阵（如 Web + DB + Redis），一键统管。

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

只需运行 `docker compose up -d`，所有应用就会按顺序拉取、编译、启动，并且自动分配在同一个隔离的自建局域网里。

## 虚拟机 (VM) vs 容器 (Docker)

面试经典题：为什么 Docker 比 VM 轻量那么多？

| 维度     | 虚拟机 (VMware / ESXi / Parallels)                    | 容器 (Docker)                                         |
| -------- | ----------------------------------------------------- | ----------------------------------------------------- |
| 隔离级别 | **硬件级 + 全量操作系统**隔离                         | **进程级**隔离                                        |
| OS 依赖  | 需要 Hypervisor 层，每个 VM 必须完整跑一套独立 Kernel | **直通共用宿主机操作系统的 Kernel**                   |
| 镜像体积 | 几个 GB 到几十 GB（动辄装一个 Win10 等）              | 几十 MB 到几百 MB（只装必需底层依赖包）               |
| 启动速度 | 慢（分钟级，等于模拟了一次主板通电到系统开机）        | **极快**（毫秒 / 秒级，等于操作系统里新开了一个进程） |

> **注**：Docker 并不是真正的"虚拟机"，它只是把普通进程关进了一个"看不见外界的其他沙盒"里。所以如果是 macOS/Windows，它们不带 Linux Kernel，那底层的 Docker Desktop 其实是偷偷帮你先起了一个极致优化的 Linux 虚拟机，再在这个虚拟机里跑容器的。

## 一图流总结

```text
┌─────────────────┐       docker push        ┌──────────────────┐
│   开发小哥/CI    │ ───────────────────────► │                  │
│                 │                          │   Registry(仓库) │
│  Dockerfile     │                          │   (Docker Hub)   │
│      │          │                          │                  │
│ docker build    │                          └───────┬──────────┘
│      ▼          │                                  │
│  [  Image  ]    │                                  │ docker pull
└─────────────────┘                                  ▼
                                             ┌──────────────────┐
┌─────────────────────────────────┐   run    │    [  Image  ]   │
│  宿主机 (Linux / 云服务器)       │ ◄────────│                  │
│                                 │          │   目标机器        │
│  [ Container ]   [ Container ]  │          └──────────────────┘
│    (NestJS)         (Redis)     │
│       │                │        │
│       └── docker network ───────┘
│                                 │
│  /var/lib/docker/volumes (数据卷)│
└─────────────────────────────────┘
```

## QA

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: Docker 镜像的“分层 (Layer)”与构建缓存机制是怎样的？</h4>💬点击展开/收起</summary>

Docker 的镜像不是一个单体的巨大文件压缩包，而是由**一层一层的文件系统增量**（基于 UnionFS 技术）像洋葱一样叠盖起来的。

在 `Dockerfile` 里，每一个改变文件系统的指令（如 `RUN`, `COPY`, `ADD`）都会往下夯实，生成一个不可篡改的新层 (Layer)。

```dockerfile
FROM node:20-alpine     # 底层层层叠加 (Alpine 系统 + Node 环境)
WORKDIR /app            # 只改环境变量，不改变系统文件，不新建增量层
COPY package*.json ./   # 盖上一层 A：内容仅有 package.json
RUN npm ci              # 盖上一层 B：运行新增的几百M node_modules 目录
COPY . .                # 盖上一层 C：大堆业务源码
```

### 1. 为什么要做分层复用设计？

- **复用存储与带宽**：假设你机器上有 10 个跑 Node.js 微服务的镜像，它们第一行全部写着 `FROM node:20-alpine`。
  这就意味着，那 100M+ 的底层操作系统包在宿主机盘上，以及拉取、Push 时，**永远只存/只传一份**！复用效率极高，如果远端已经拥有了这一层哈希的镜像，就直接秒杀跳过（显示 `Already exists`）。

### 2. 也是极速构建缓存的基础

- 执行 `docker build` 时，Docker 一步步往下走。只要当前指令的内容及它依赖的"上一层文件的哈希值"没变，Docker 就**直接秒用缓存（CACHED）**，不运算直接去下一行。
- 这就完美解释了为什么 Nest 教程里：**必定把 `COPY package.json` 放在 `COPY . .` 前面单独拿出来拉写！**
  如果代码全放一起 COPY，无论你是加了一个标点符号，这一层的代码区就变了 → 缓存全部失效倒塌 → 接着执行重新龟速 `npm install`。
  先抽离 package 等它装好，只要你不改依赖库版本内容，后面几百次修改页面 `npm ci` 那一层长长久久的层级永远是 `CACHED` 秒过！

### 3. 什么是 Copy-on-Write (写时复制)？

当用某个镜像启动成实际的**容器**跑着时，Docker 会在原有所有铁板一块的"只读层"最外头顶上铺薄薄的一层**"可写层"**。

- **读数据：**从上往下看穿透洋葱找最新文件读。
- **写数据：**如果容器试图要修改下面只读层的一份原系统旧文件，系统不会直接修改底层，而是**先把该文件拷贝拷贝上浮到最顶端的可写层**，在可写层里大修魔改。镜像本身的原始文件结构至死不会遭到任何破坏。这就是为什么停止销毁后这层薄膜丢失，状态也会全部还原（除非你用了上面提的数据挂载）。

</details>

<!-- #endregion -->

## 参考

- Docker 官方文档：<https://docs.docker.com/get-started/overview/>
- Dockerfile 最佳实践：<https://docs.docker.com/develop/develop-images/dockerfile_best-practices/>
- Docker Compose 编排文档：<https://docs.docker.com/compose/>
