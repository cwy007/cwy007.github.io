---
layout: post
title: Nest项目断点调试
subtitle: 查看代码整个执行路线 - 作用域，调用栈 - 通过单步执行查看变量变化
date: 2026-04-26 12:16:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
  - vscode
---

## 在 VSCode 里边写代码边调试

> 最方便调试 nest 项目的方式

VSCode 实现了 Debugger 客户端

创建 .vscode/launch.json 文件

![create-a-launch.json-file](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260426122946329.png)

![launch.json](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260426123208748.png)

然后，输入node快速创建一个 node 调试配置

![node launch](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260426123319825.png)

stopOnEntry 是在首行断住，和 --inspect-brk 一样的效果。

![stopOnEntry](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/022601d2f94b4bb6a971ad223a76dd16~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

调试过程中修改了代码，点击重新调试，可以马上看到改动之后的效果

![重新调试](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/be09f4fc43d34bc495017b1772f754fb~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

创建 nest scripts 的调试配置

.vscode/launch.json

```json
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "name": "debug nest",
      "request": "launch",
      "type": "node",
      "runtimeExecutable": "npm",           // 执行什么命令
      "args": ["run", "start:dev"],         // 传递参数
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"。     // 用 vscode 内置终端来打印日志。默认用 debug console（没有颜色）
    }
  ]
}

```

和在命令行执行 npm run start:dev 效果一样

![npm script](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260426124013348.png)

启动调试模式

![启动调试模式](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/0a5fab63d75b4cf6beafeddaf7afc597~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

然后浏览器访问 [http://localhost:3000](http://localhost:3000)

![浏览器访问](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/b152079795134165bd9c0acc235eb38f~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

代码会在断点处断住

## 3个常用的断点类型

### 1.logpoint

只想打印日志，不想断住，不想加 console.log 污染代码，可以右键选择 logpoint

![logpoint](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/344268ffabc14dd49d3c7aa0c2cc1fce~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

输入打印信息，变量用 `{}` 包住

![打印信息中的变量](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/f583cc4130264d31a6712b2c1e04106d~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

代码执行到这里就会打印

![打印内容](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/4aea40c7ad2944fea65bc19c6470d1da~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

### 2.条件断点 Conditional Breakpoint

表达式成立才会断住

![条件断点](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/ae6ba8c9fefa4224a0885080fb8e67b7~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![表达式成立才会断住](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/26d3656eae6843968d9b92e174f77467~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

### 3.异常断点 Uncaught Exceptions

在没有处理的异常处自动断住

![Uncaught Exceptions](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/2dca459750454907969d3c9ec2343b07~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

## 其他

node 代码可以加上 `--inspect` 或者 `--inspect-brk` 启动调试 ws 服务，然后，用 Chrome DevTools
或者 vscode debugger 连上来调试。

[chrome://inspect/#devices](chrome://inspect/#devices)

nest 项目的调试也是 node 调试，可以用 `nest start --debug` 启动 ws 服务，然后，在 vscode 里
attach 上了调试，也可以添加一个调试配置来运行 `npm run start:dev`。

因为 --inspect 并不会和 --inspect-brk 一样在首行断住。加个 `debugger`

![debugger](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/0d7bc6bb0ccc4e379d93da1a21567742~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)
