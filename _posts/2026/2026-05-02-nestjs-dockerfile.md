---
layout: post
title: nestjs Dockerfile 技巧
subtitle: 最佳实践：构建极小、极快、安全的 NestJS 生产级镜像
date: 2026-05-02 20:25:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - Docker
---

在上一篇文章中，我们了解了 Docker 的基本概念。对于一个 Node.js/NestJS 开发者来说，真正上手遇到的第一关就是写出一个合格的 `Dockerfile`。

如果你只是简单粗暴地把代码拉进去跑 `npm run start:prod`，你可能会得到一个体积超过 1GB、每次构建都要等半天、且用 root 权限裸奔的“毒药”镜像。本文介绍 NestJS 镜像打包的最佳实践。

## 1. 必不可少的 .dockerignore

和 `.gitignore` 类似，千万不要把本地开发生成的垃圾目录也打包进镜像里。特别是本地的 `node_modules`，不同操作系统的原生依赖（如 `bcrypt`、`sharp` 等 c++ 原生插件）可能不一样，直接拷贝进 Linux 容器会导致报错。

在项目根目录新建 `.dockerignore`：

```text
.git
.gitignore
node_modules/
dist/
npm-debug.log
```

## 2. 依赖缓存魔法（善用镜像分层）

Dockerfile 的每一行指令都会生成一个新的缓存层。**代码的变动频率远高于依赖文件**。
错误的做法是先 `COPY . .` 然后 `npm install`。正确的做法是先拷 `package.json` 并安装依赖：

```dockerfile
# ✅ 正确示范
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

这样只要 `package.json` 不变，`npm ci` 这一层就会直接命中缓存（CACHED），极大地节约了流水线部署构建的时间。

## 3. 多阶段构建（Multi-stage Builds）

NestJS 是基于 TypeScript 的，它有很重的开发依赖包（devDependencies），比如 TS 编译器核心以及各类 `@types/xxx`。但在生产环境中跑 Node.js，我们只需要编译好的纯 JS 产物 `dist/` 和运行必须的 `dependencies`。

通过 **多阶段构建**，我们可以用一个“庞大”的镜像来编译业务逻辑，并在第二阶段把纯瘦干净的 `dist/` 复制到一个只有运行态依赖环境的极简“小”镜像中发布。

## 4. 极致安全：非 Root 运行

Docker 容器默认以最高权 `root` 用户运行。这种设计如果在生产服暴露，黑客拿下服务 Shell 或代码存在越权读取等注入，顺势就用 root 破坏整体主机的底层挂载。
Node.js 官方镜像贴心地内置了一个被限制权限的用户——名为 `node`。我们切换即可：`USER node`。

## 5. 终极可抄模板（Production Ready）

结合以上技巧，这里给出一份可以直接在生产环境中使用的优雅的 NestJS Dockerfile：

```dockerfile
# -----------------------------
# 阶段 1：Builder 编译阶段
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 1. 优先只把 package 文件塞进去下载核心，以利用 layer 高速缓存
COPY package*.json ./

# 2. 安装全部依赖（包含 devDependencies，用来给 ts 打基础）
RUN npm ci

# 3. 拷贝源码并打包 -> 生成真正的应用文件夹 /app/dist
COPY . .
RUN npm run build


# -----------------------------
# 阶段 2：Production 运行阶段
# -----------------------------
FROM node:20-alpine AS production

WORKDIR /app

# 1. 同样的包名但这次加了 --omit=dev，绝不携带有害负担包
COPY package*.json ./
RUN npm ci --omit=dev

# 2. 最关键：从 builder 镜像内抽取打好的包，其余 builder 的破烂全都丢弃
COPY --from=builder /app/dist ./dist

# 3. 降权！使用官方安全的非 root 受限账户接管命令操作
USER node

# 4. 声明暴露端口定义最终起点
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
```

## 效果对比

| 指标           | 裸写单阶段                               | 多阶段 + Alpine                  |
| -------------- | ---------------------------------------- | -------------------------------- |
| **体积包大小** | ~1.2 GB                                  | **~150 MB 甚至更少**             |
| **增量层构建** | 每次动哪怕一行代码也要苦等几十秒 `npm i` | **分层后秒过（全中 CACHE）**     |
| **运行时安全** | root 用户随时高危风险裸奔受牵连          | **受限安全沙箱机制 (USER node)** |

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 为什么要用 npm ci 而不是 npm install？</h4>💬点击展开/收起</summary>

在 Docker 镜像构建这种对**“幂等性 / 绝对一致性”**极度敏感的 CI/CD 场景中，`npm ci`（Clean Install）才是最佳实践：

1. **绝对锁定**：`npm ci` 严格根据本地的 `package-lock.json` 版本进行安装，哪怕 `package.json` 中的 semver 指定了可以小幅更新的版本（例如 `^1.0.0`），也会被锁死。它保证了“我本地这台电脑经过测试通过的是哪个小版本，部署的容器里就一定是哪个小版本”。
2. **强制清理与隔离**：它甚至会强制删除已有的 `node_modules` 重新做个崭新的存粹安装过程，隔绝脏包问题。
3. **更顺畅省时**：不再动态走访整个公网计算树校验，节省非常多计算与回包的时间，常常大福提升打包时长效率！

_提醒：如果你使用 `npm ci` 的前提是，你本地必须先跑一次正常的 `npm install` 产生它，并用 Git 把 `package-lock.json` 忠诚老实地提交入仓库并放入到构建 Docker 层之内部。_

</details>

<details markdown="1">

<summary><h4>QA: 如何使用 ARG 和 ENV 增加构建灵活性？</h4>💬点击展开/收起</summary>

使用 `ARG` 可以增加构建时的灵活性。`ARG` 可以在 `docker build` 时通过 `--build-arg xxx=yyy` 传入并在 Dockerfile 中生效，从而使构建过程更加灵活。

如果是想定义**运行时**可以访问的环境变量，可以通过 `ENV` 定义，并使用 `ARG` 传入它的值：

```dockerfile
ARG APP_PORT=3000
ENV PORT=${APP_PORT}
```

这样既维持了构建时的灵活性，也保障了运行时环境变量的留存。

</details>

<details markdown="1">

<summary><h4>QA: CMD 和 ENTRYPOINT 有什么区别？</h4>💬点击展开/收起</summary>

它们都可以指定容器跑起来之后运行的命令，最大的区别在于：

- `CMD` 提供的命令或参数**可以被覆盖**（在 `docker run` 时追加其他命令即可）。
- `ENTRYPOINT` 设置的入口点**不可以被覆盖**（除非传入特殊的 `--entrypoint` 参数），追加在 `docker run` 后的内容会作为参数传给它。

两者结合使用可以实现参数默认值的功能：

```dockerfile
ENTRYPOINT ["node", "dist/main.js"]
CMD ["--help"]
```

默认跑出帮助文档，如果在运行时跑 `docker run my-image --port 3000` 则会将原 CMD 覆盖为传入的参，实际产生 `node dist/main.js --port 3000`。

</details>

<details markdown="1">

<summary><h4>QA: ADD 和 COPY 都能复制文件，应该用哪个？</h4>💬点击展开/收起</summary>

`ADD` 和 `COPY` 都可以复制本地文件到容器内。
区别是：在处理特殊压缩包文件（如 `tar.gz`）时，`ADD` 会附带一个**自动解压**的额外动作。

因为 `COPY` 语义非常干净透明（只做一次直接的搬运），除非你有解压到某目录的具体需求，通常最佳规范中**推荐总是使用 `COPY`**。

</details>

<!-- #endregion -->
