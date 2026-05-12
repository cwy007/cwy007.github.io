---
layout: post
title: nestjs 短链服务
subtitle: 生成方案对比与核心代码实现
date: 2026-05-12 20:04:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

在营销短信、社交媒体分享以及二维码生成等场景中，经常需要将冗长的 URL 转换成简短的链接（类似于 `t.cn/xxxx` 或 `bit.ly/xxxx`）。这不仅能缩减字符数量，使得排版更加美观，还能通过短链服务器进行访问量（PV/UV）的埋点统计。

本文将深入探讨在 NestJS 中实现短链服务的几种主流方案，对比它们的优缺点，并提供最佳实践的代码实现。

## 短链服务的三大核心方案对比

短链的核心原理非常简单：**在数据库中建立“短码”到“长链接”的映射字典。当用户访问短码时，服务器查询出长链接，并返回 `302 Redirection` 让浏览器重定向过去。**

难点在于：**如何高效、唯一地生成这个“短码”？**

### 方案一：哈希算法（MurmurHash / MD5 + Base62）

将长链接直接丢进哈希算法（推荐使用计算速度极快的非加密哈希 `MurmurHash32`），把得到的一个 32 位数字转成 Base62 字符即可。

- **优点**：无需依赖中心化的 ID 生成器，算法简单。相同的长链接永远生成相同的短链，天然去重。
- **缺点**：哈希截断不可避免地会产生**哈希冲突（Hash Collision）**。如果两个不同的长链接算出了同一个短码，就需要加盐（加随机字符串）再次哈希，处理冲突的逻辑会随着数据量增大而变得极其复杂和低效。

### 方案二：随机字符串 + 唯一索引冲突重试

每次请求过来，使用代码随机生成一个长度为 6 的大小写字母+数字的组合，然后去数据库里 `INSERT`（依靠 `UNIQUE KEY` 保证不重复）。

- **优点**：极其简单，代码量最少；短码是无序的，竞争对手无法通过短码推算出你的业务单量。
- **缺点**：随着数据库里的数据越来越多，随机碰撞报错的概率会急剧上升。到了后期，可能生成生成十次都会遇到冲突，此时数据库的写入性能将出现严重瓶颈。

### 方案三：发号器（自增 ID） + Base62 进制转换（业界推荐 ⭐）

利用数据库的自增 ID（如 MySQL 的 `AUTO_INCREMENT`）或 Redis 的 `INCR` 命令，甚至 Snowflake 雪花算法，生成一个绝对不重复的全局唯一自增数字 10001, 10002...，然后将这个十进制数字转换为 **Base62（0-9, a-z, A-Z 共62个字符）**进制。

- **优点**：**绝对不会发生冲突**！生成效率极高，没有循环重试问题；且查询速度利用自增主键非常快。
- **缺点**：由于短码是连续自增的，很容易被遍历和暴力破解，同时容易暴露业务单量（通过昨天和今天的 ID 差值就能算出来）。
- **优化解法**：由于连续问题，业界通常会使用**洗牌算法**把这 62 个基础字符库进行乱序打乱，这样就算数字是连续的，生成的短码也是跳跃无规律的。

---

## 基于 NestJS 的代码实现（自增发号器方案）

我们将采用 **Redis 的 `INCR` + Base62 洗牌编码** 来实现这套系统。

### 1. Base62 进制转换工具

十进制数字转 Base62 本质上就是不断地对着 62 取余。

```typescript
// src/utils/base62.util.ts
// 这里的 CHARS 被我们故意打乱了顺序（洗牌），防止数字被轻易推算
const CHARS = 'qweRTYuiopASdfgHJKlzxCvbnM1234567890QWErtyUIOPasDFGhjkLZXcVBNm';
const BASE = CHARS.length;

export function encodeBase62(num: number): string {
  if (num === 0) return CHARS[0];
  let result = '';
  while (num > 0) {
    result = CHARS[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result;
}

export function decodeBase62(str: string): number {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    num = num * BASE + CHARS.indexOf(str[i]);
  }
  return num;
}
```

### 2. 短链 Service（生成与解析）

```typescript
// src/short-url/short-url.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { encodeBase62 } from '../utils/base62.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShortUrlEntity } from './entities/short-url.entity';

@Injectable()
export class ShortUrlService {
  private readonly REDIS_COUNTER_KEY = 'short_url:id_counter';

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(ShortUrlEntity) private readonly repo: Repository<ShortUrlEntity>
  ) {}

  /**
   * 将长链接生成短码并落库
   */
  async generateShortUrl(originalUrl: string): Promise<string> {
    // 1. 发号器：利用 Redis 的 INCR 原子操作拿到唯一递增 ID
    const uniqueId = await this.redis.incr(this.REDIS_COUNTER_KEY);

    // 2. 将此 ID 进行进制转换得到短码
    const shortCode = encodeBase62(uniqueId);

    // 3. 落库绑定关系
    const entity = new ShortUrlEntity();
    entity.id = uniqueId;
    entity.shortCode = shortCode;
    entity.originalUrl = originalUrl;
    await this.repo.save(entity);

    return shortCode;
  }

  /**
   * 解析短码获取真实地址
   */
  async getOriginalUrl(shortCode: string): Promise<string | null> {
    // 最佳实践：这里必定会先查询 Redis 缓存层，若无再查 MySQL。此处略写
    const entity = await this.repo.findOneBy({ shortCode });
    return entity ? entity.originalUrl : null;
  }
}
```

### 3. 跳转 Controller 拦截

当用户在浏览器访问 `http://你的域名/J7o` 时，NestJS 捕获动态路由并将请求重定向至源网站：

```typescript
// src/short-url/short-url.controller.ts
import { Controller, Get, Post, Body, Param, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ShortUrlService } from './short-url.service';

@Controller('s')
export class ShortUrlController {
  constructor(private readonly shortUrlService: ShortUrlService) {}

  // 接口：生成短链
  @Post('generate')
  async create(@Body('url') url: string) {
    const code = await this.shortUrlService.generateShortUrl(url);
    // 返回带域名的完整短链地址
    return { shortUrl: `http://localhost:3000/s/${code}` };
  }

  // 服务出口：访问短链接，进行 302 重定向
  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const originalUrl = await this.shortUrlService.getOriginalUrl(code);

    if (!originalUrl) {
      // 如果没找到，可以跳制自己做的一个 404 前端页
      return res.status(HttpStatus.NOT_FOUND).send('短链接已失效或不存在');
    }

    // 核心代码：发起 302 临时重定向交出控制权
    return res.redirect(HttpStatus.FOUND, originalUrl);
  }
}
```

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 为了缩短链接长度，为什么用 Base62 代替普遍的 Base64 编码呢？</h4>💬点击展开/收起</summary>

Base64 包含了 `A-Z`, `a-z`, `0-9` 再加上 `+` 和 `/` 这两个特殊字符。问题就出在这两个特殊字符上：
在 HTTP URL 标准中，`+` 号会被引擎当成空格解析处理掉，而 `/` 本身就是 URL 路径的目录分割符参数，会导致原本作为变量的参数受到破坏，从而引发框架路由解析崩溃 404。

虽然有替换为 `-` 和 `_` 的 Base64 URL 变种（UrlSafe），但是其显示效果不如纯字母和数字来得清晰直觉，很多文本编辑器识别出来的超链接甚至容易截断。所以去掉这俩麻烦精，仅仅用 62 个数字字母组合的 Base62 是业界一致选定的黄金标准方案。

</details>

<!-- #endregion -->

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 访问短链进行跳转时，用 301 重定向还是用 302 重定向？</h4>💬点击展开/收起</summary>

毫无疑问，推荐使用 **302 Found（临时重定向）**。

- **301 永久重定向**：如果使用 301，当用户的浏览器第一次拿到源地址后，就会在本地死死地“缓存”掉这条映射规则（强缓存）。下一次这个用户再点击短链，浏览器甚至不会再去请求你的短链服务器，而是直接自己跳转到长链了。这样你会完完全全丢失他后续的 PV/UV 访问统计请求。
- **302 临时重定向**：每次用户点击短链都会必然先打在短链服务器上。这让服务器有机会在网关处留下他的请求日志，做各种访问次数统计、拦截管控分析、判断链接是否过期甚至修改替换其长链接的指向，这是数据统计埋点不可或缺的一环。

> 当然，302 的代价是服务器每次都要承受并发连接的压力。所以短链重定向往往都会采用 Redis 将热点映射进行极为极致的缓存。

</details>

<!-- #endregion -->
