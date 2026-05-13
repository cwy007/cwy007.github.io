---
layout: post
title: nestjs 大文件流式下载
subtitle: 告别内存溢出，使用 StreamableFile 优雅处理海量数据分发
date: 2026-05-13 18:54:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

在 Web 后端开发中，文件下载是一个非常基础的功能。当文件比较小（几 MB）的时候，我们通常可以毫无顾忌地将文件全部读取到内存中，然后一次性响应给客户端。

但是，如果我们需要向客户端发送一个 1GB 甚至几个 GB 的大型安装包或视频文件，继续使用 `fs.readFileSync(path)` 就会导致极其严重的后果：Node.js V8 引擎的默认堆内存上限（通常约为 1.4GB）会被迅速撑爆，直接抛出 `JavaScript heap out of memory` 致命错误，导致整个服务宕机。

为了解决这个问题，我们需要引入**流（Stream）**的概念。

## 核心原理：使用 Stream 管道

流（Stream）的核心思想是：**切分数据，像流水一样一点一滴地传输**。
与其把 1GB 的水先全部装进一个固定大小的内存大水桶里再倒出去，不如接一根连接硬盘和网络的“水管”，硬盘读出一点，网络就发送一点，这样在内存中同一时刻驻留的数据只有极少量的高速缓冲块（Buffer）。

## 在 NestJS 中的最佳实践：`StreamableFile`

NestJS 从 v8 版本开始，引入了一个非常优雅的核心类：`StreamableFile`。它屏蔽了底层 Express 和 Fastify 框架实现流式传输的区别，并自动处理了管道连接和流的中断清理工作。

下面是一个完整的高性能大文件下载 Controller 实现：

```typescript
import { Controller, Get, StreamableFile, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';

@Controller('download')
export class DownloadController {
  @Get('large-file')
  getFile(@Res({ passthrough: true }) res: Response): StreamableFile {
    // 1. 获取文件绝对路径
    const filePath = join(process.cwd(), 'files/big-video.mp4');

    if (!existsSync(filePath)) {
      // 可以在此处直接抛出 NotFoundException
      throw new Error('文件未找到');
    }

    // 2. 读取文件的状态信息，尤其是文件大小 (size)
    const stat = statSync(filePath);

    // 3. 设置响应头
    // passthrough: true 选项允许我们在注入 @Res() 的同时，依然把底层的发送工作交还给 NestJS (让它能接收 return StreamableFile)
    res.set({
      'Content-Type': 'video/mp4', // 可根据文件类型动态设置 mimetype
      'Content-Disposition': 'attachment; filename="big-video.mp4"', // attachment 提示浏览器弹出下载框
      'Content-Length': stat.size, // 👉 核心：告诉浏览器文件的总大小
    });

    // 4. 创建一根直接指向该文件的文件读取流 (ReadStream)
    const fileStream = createReadStream(filePath);

    // 5. 将该流包装进 StreamableFile 并返回
    return new StreamableFile(fileStream);
  }
}
```

## 关键技术点解析

1. **`createReadStream`**：
   通过 `fs.createReadStream()` 创建的是一个基于事件的流对象，相比于 `fs.readFile`，它默认只会以 64KB 的 chunk（块）将数据加载到内存，只要下游持续消费，它才会继续读取，达到了严格控制内存占用的目的。
2. **`@Res({ passthrough: true })`**：
   在早期的 NestJS 中，如果你要在方法参数里写了 `@Res() res: Response`，NestJS 就会认为你打算**全权接管**响应操作，它就不再理会你的 `return` 返回值了。加上 `passthrough: true` 标识，我们就能做到“既可以修改 Header 头，又可以让 NestJS 帮你去接管剩余的内容发送”（即识别你返回的 `StreamableFile` 并自动执行 `pipe(res)`）。
3. **`Content-Length` 响应头不可忽视**：
   流式下载的特点是源源不断，如果缺了 `Content-Length` 头，浏览器依然可以下载文件，但由于它不知道总共有多少数据要接收，下载面板里就**无法显示剩余时间评估和百分比进度条**。这对用户体验是毁灭性的打击。加入完整的文件大小后，浏览器就能完美绘制下载进度条了。

---

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 原生的纯 Node.js 或 Express 是怎么写这套逻辑的？</h4>💬点击展开/收起</summary>

在没有 NestJS 包装的传统 Express 应用里，是通过直接把读取流 `pipe` 到原生响应实体流里面实现的：

```javascript
app.get('/download', (req, res) => {
  const filePath = '/path/to/large/file.zip';
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="file.zip"',
    'Content-Length': stat.size
  });

  const readStream = fs.createReadStream(filePath);
  // 直接利用了管道连接，将数据的上游和下游驳接
  readStream.pipe(res);

  // 最佳实践：必须监听关闭事件，以防客户端中途主动断开网络导致服务端流泄漏挂起
  req.on('close', () => {
    if (!readStream.destroyed) {
      readStream.destroy();
    }
  });
});
```

可以看到，原生写法还要手动去监听请求连接断开（比如网络不好掉线了或者用户点击了取消下载），然后跑去手动销毁并关闭文件读取句柄 `readStream.destroy()`，否则就会造成内存与句柄严重泄漏。
而 NestJS 的 `StreamableFile` 底层不仅封装了 `pipe()`，还非常贴心地帮你把这些异常断开情况下的句柄清理工作全包圆了，让开发者极其省心！

</details>

<!-- #endregion -->
