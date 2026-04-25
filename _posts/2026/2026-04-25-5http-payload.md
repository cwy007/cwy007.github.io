---
layout:     post
title:      5种 HTTP 数据传输方式
subtitle:   给接口传递参数的5种方式
date:       2026-04-25 21:04:00
author:     "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NodeJS
  - NestJS
---

## url param - 路径中参数

将参数写在 url 中

```bash
/users/:id

# /users/1

```

## query string

通过 url 中 ?，后面的用 & 分隔的字符串传递数据

```bash

/users?name=cwy007&age=34

```

[query-string](https://www.npmjs.com/package/query-string)

## form-urlencoded

直接用 form 表单提交数据就是这种，和 query 字符串的区别是值放在了 body 里，然后，指定
Content-Type 为 application/x-www-form-urlencoded

![form-urlencoded](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425211319310.png)

- 表单的 get 提交是将数据拼成 query string 放在 url 后面
- 表单的 post 提交，直接用相同的方式把数据放在 body 里

通过 & 分隔的 form-urlencoded 的方式需要对内容做 url encode，如果传递大量的数据，比如上传
文件的时候，就不是很合适了，因为文件 encode 一遍太慢了，这时候可以用 form-data

## form-data

form-data 分割线是 `------------------加数字`

![form-data-boundary](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425211945381.png)

form-data 需要指定 Content-Type 为 multipart/form-data，然后，指定 boundary 分割线。
body 里面就是要哪个 boundary 分隔符分割的内容。
这种方式适合传输文件，而且可以传输多个文件。
但是多了一些只是用来分隔的 boundary，所以请求体会增大。

## json

- form-urlencoded 需要对内容做 url encode
- form-data 需要加很长的 boundary

上面2中方式都有一些缺点，如果只传 json 数据，不需要用这两种。

可以直接指定 Content-Type 为 application/json就行：

![application/json](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260425212754672.png)

## nestjs 中相关的装饰器

- @Param()
- @Query()
- @Body()
- @UseInterceptors()
- @AnyFilesInterceptor()
- @UploadedFiles
