---
layout:     post
title:      "sudo ls /root"
subtitle:   "谁可以使用  允许使用的主机=（以谁的身份）  可执行命令的列表"
date:       2020-07-07 16:18:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Linux
---

sudo命令用于给普通用户提供额外的权限来完成原本root管理员才能完成的任务，格式为“sudo [参数] 命令名称”。

总结来说，sudo命令具有如下功能：
* 限制用户执行指定的命令：
* 记录用户执行的每一条命令；
* 配置文件（/etc/sudoers）提供集中的用户管理、权限与主机等参数；
* 验证密码的后5分钟内（默认值）无须再让用户再次验证密码。

```bash
[root@linuxprobe ~]# visudo
 96 ##
 97 ## Allow root to run any commands anywhere
 98 root ALL=(ALL) ALL
 99 linuxprobe ALL=(ALL) ALL
```

##### 参考链接

1. https://www.linuxprobe.com/chapter-05.html
