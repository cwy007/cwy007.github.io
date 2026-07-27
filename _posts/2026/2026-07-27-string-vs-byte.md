---
layout: post
title: 字符串与字节的关系
subtitle: 字符串：人读得懂的文本，比如 "admin@example.com"。字节：机器存储和传输数据的原始单位，比如一串 0 到 255 的数
date: 2026-07-27 23:28:00
author: "chanweiyan"
catalog: true
tags:
  - AIAgent
---

## 1.字符串与字节的关系

字符串和字节不是一回事。

可以先这样理解：

- 字符串：人读得懂的文本，比如 `"admin@example.com"`
- 字节：机器存储和传输数据的原始单位，比如一串 `0` 到 `255` 的数

关键点在于，计算机里字符串最终也必须落成字节，但“怎么把字符变成字节”要靠编码规则。

最常见的编码规则就是 UTF-8。比如：

- 字符 `"A"` 用 UTF-8 编码后是 1 个字节：`65`
- 字符 `"中"` 用 UTF-8 编码后是 3 个字节
- 字符 `"😀"` 用 UTF-8 编码后是 4 个字节

所以：

- “字符数”不等于“字节数”
- 一个字符串占多少字节，取决于编码方式和内容

放到你这个项目的 jwt.ts 里，这段代码：

```ts
const encoder = new TextEncoder()

function toSecret(secret: string): Uint8Array {
  return encoder.encode(secret)
}
```

做的事情就是把“字符串 secret”转成“字节数组”。

为什么要这么做？因为加密签名算法处理的不是“人类文本”这个概念，而是二进制数据。`jose` 在 Worker 里更贴近 Web Crypto，所以它更希望你给它 `Uint8Array` 这种明确的字节表示，而不是模糊的字符串。

你可以把它理解成两层：

1. 业务层看到的是字符串
   比如环境变量里的 JWT secret：`"my-super-secret"`

2. 加密层需要的是字节
   所以要通过 UTF-8 之类的编码，把字符串变成：
   `Uint8Array([109, 121, 45, ...])`

再直白一点：

- 字符串是“文本意义”
- 字节是“存储/计算形式”
- 编码是两者之间的桥

如果你愿意，我可以继续用你这个 JWT 文件举例，

## 2.具体解释 `TextEncoder`、`Uint8Array`、`Buffer` 三者的区别

可以把这三个东西放在同一条链路里理解：

- `TextEncoder`：负责“编码”，把字符串变成字节
- `Uint8Array`：负责“装字节”，是通用的字节数组类型
- `Buffer`：Node.js 提供的、更强的字节容器，本质上是 `Uint8Array` 的扩展版

先分别看。

**TextEncoder**

`TextEncoder` 不是用来存数据的，它是一个“工具”。

它的职责只有一个：把字符串按 UTF-8 编码成字节。

```ts
const encoder = new TextEncoder()
const bytes = encoder.encode('abc')
```

这里 `bytes` 得到的是：

```ts
Uint8Array [97, 98, 99]
```

所以 `TextEncoder` 解决的是：

- 输入：字符串
- 输出：字节序列

在 jwt.ts 里：

```ts
function toSecret(secret: string): Uint8Array {
  return encoder.encode(secret)
}
```

就是把 JWT secret 从文本变成可用于签名算法的字节。

**Uint8Array**

`Uint8Array` 是 JavaScript 标准里的“无符号 8 位整数数组”。

名字可以拆开看：

- `Uint`：unsigned integer，无符号整数
- `8`：8 位，也就是 1 个字节
- `Array`：数组

它里面每个元素都只能是 `0` 到 `255`。

```ts
const bytes = new Uint8Array([72, 101, 108, 108, 111])
```

这表示的是一串原始字节，不自带“这是文本”还是“这是图片”还是“这是密钥”的语义。

所以 `Uint8Array` 是“数据容器”，不是“编码器”。

它常用于：

- 加密输入输出
- 二进制协议
- 文件内容
- Web Crypto
- 浏览器 / Worker / 标准 Web API

在 Worker 环境里，它是最通用、最标准的二进制表示。

**Buffer**

`Buffer` 是 Node.js 提供的二进制类型。

它和 `Uint8Array` 很像，而且现在本质上就是继承/扩展自 `Uint8Array`。也就是说：

- `Buffer` 能做 `Uint8Array` 能做的大部分事
- 但 `Buffer` 额外带了很多 Node 风格的方便方法

例如：

```ts
const buf = Buffer.from('hello', 'utf8')
console.log(buf)
```

你会得到一个 `Buffer`，它内部也是字节。

`Buffer` 常见附加能力有：

- 字符串和字节互转更方便
- base64 / hex 编解码方便
- 更偏 Node 生态
- 很多旧库默认直接吃 `Buffer`

**三者的核心区别**

最重要的区别不是“都能不能表示字节”，而是“角色不同”。

1. `TextEncoder` 是工具
   它负责把文本编码成字节。

2. `Uint8Array` 是标准字节容器
   它是浏览器、Worker、Web Crypto 通用的二进制表示。

3. `Buffer` 是 Node 专用增强字节容器
   它更方便，但更偏 Node 运行时，不是所有环境都天然有。

**一个完整例子**

```ts
const text = 'admin'
const encoder = new TextEncoder()
const bytes = encoder.encode(text)
```

这里：

- `text` 是字符串
- `encoder` 是编码工具
- `bytes` 是 `Uint8Array`

如果在 Node 里，你也可以写：

```ts
const buf = Buffer.from('admin', 'utf8')
```

这里：

- `Buffer.from(...)` 同时做了编码和容器创建
- 得到的是 `Buffer`

所以：

- `TextEncoder + Uint8Array` 更偏 Web 标准
- `Buffer.from(...)` 更偏 Node 写法

**为什么这个项目里更常见 `TextEncoder + Uint8Array`**

因为你的 API 跑在 Cloudflare Worker，不是传统 Node 服务。

Worker 环境更自然支持：

- `TextEncoder`
- `Uint8Array`
- `crypto.subtle`

而不是围绕 `Buffer` 设计。

所以在 jwt.ts 里写成：

```ts
const encoder = new TextEncoder()

function toSecret(secret: string): Uint8Array {
  return encoder.encode(secret)
}
```

这是更贴合 Worker 的写法。它表达得也更清楚：

- secret 原本是字符串
- 现在显式编码成 UTF-8 字节
- 再交给 `jose` 做签名/验签

**一句话对比**

- `TextEncoder`：把“字”变成“字节”
- `Uint8Array`：存“字节”
- `Buffer`：Node 版、更强功能的“字节容器”
