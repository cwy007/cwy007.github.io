---
layout:     post
title:      "Linux 操作系统：/etc/passwd"
subtitle:   "《Linux 操作系统》用户账号文件 passwd"
date:       2020-04-04 17:31:00
author:     "chanweiyan"
header-img: "img/cwy/post-bg/unix-linux.jpg"
catalog: true
tags:
  - Linux
  - Shell
---

#### 用户账号文件 /etc/passwd 文件的每一行

```bash
# 每一行保存一个用户的资料，用户数据按域以冒号 `:` 分隔
username:password:uid:gid:userinfo:home:shell

# eg:
webuser:x:500:500:webuser:/home/webuser:/bin/bash
```

#### 用户影子文件 /etc/shadow

```bash
# 9个不同的域用冒号 ":" 进行分隔
username:password:lastchg:min:max:warn:inactive:expire:flag
```

|username| 用户登录名|
|password| 加密的用户口令|
|lastchg| 从 1970-1-1 起到上次修改口令所经过的天数|
|min| 两次修改口令之间至少经过的天数|
|max| 口令还会有效的最大天数，如果是99999则表示永久不过期|
|warn| 口令失效前多少天内系统向用户发出警告|
|inactive| 禁止登录前用户名还有效的天数|
|expire| 用户被禁止登录的时间|
|flag| 保留域，暂未使用|


#### 用户组账号文件 /etc/group

```bash
group_name:group_password:group_id:group_members

# eg:
bin:x:1:root,bin,daemon
```

#### 用户组影子文件 /etc/gshadow

```bash
group_name:group_password:group_members
```

#### pwck 的作用

检验 /etc/passwd 和 /etc/shadow 每个域的格式及数据的正确性，并会对二者的一致性进行校验。

#### grpck 的作用

检验 /etc/group 和 /etc/gshadow 每个域的格式及数据的正确性，并会对二者的一致性进行校验。
