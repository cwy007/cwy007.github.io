---
layout:     post
title:      "浏览器站内搜索技巧"
subtitle:   "可以叠加使用下面的搜索技巧来搜索需要的内容"
date:       2020-07-14 00:04:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - 技巧
---

你遇到的所有问题中有80%都可以通过搜索找到答案，剩下的20%只要 re-search 就能解决！

## 示例

```bash
site:github.com react
"周星驰和吴孟达"
site:csdn.net +react
site:csdn.net -react
filetype:pdf rails
intitle:react
intext:React
allintext:React rails javascript
inurl:github.com rails
react|rails
```

## 浏览器站内搜索技巧

#### site

首先标准的头是 **site:<网站>**，网站里面不要头，只填域名，然后就会只搜索该域名下的内容

`site:github.com react`

#### 空格

要搜该网站里面的某个内容，例如作者指定某个人，所以打个空格继续输入搜索条件，支持多个搜索条件，**打空格继续输入关键词**即可

`site:github.com react rails`

`site:csdn.net react rails`

#### 引号 ""

"周星驰和吴孟达"

#### 过滤符号 +增的内容 -减的内容

`site:csdn.net +react`

`site:csdn.net -react`

#### 指定文件格式 filetype

filetype:文件格式+(添加空格分开点)关键字

`filetype:pdf rails`

#### 指定标题搜索 intitle

方法： intitle:关键词
功能： 要求查询的结果是在标题中的.

`intitle:react`

#### 指定范围的搜索 intext allintext inurl

方法： intext:关键词
**功能：**要求关键字出现在搜索网页结果的正文中包含这个关键字

方法： allintext:关键词 关键词 关键词……
**功能：**要求后面的所有关键词都要出现在正文中的查询结果

方法： inurl:网址
**功能：**只搜索这些网址结尾的网站中关于这个的内容

`intext:React`

`allintext:React rails javascript`

`inurl:github.com rails`

#### 或 ｜

`react|rails`

## 参考链接

* https://jingyan.baidu.com/article/60ccbceb8414c064cab19700.html
* https://blog.csdn.net/Stephen__Wu/article/details/80624749
* https://blog.csdn.net/qq_41529510/article/details/106568850