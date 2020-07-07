---
layout:     post
title:      "su命令与用户名之间的减号`-`"
subtitle:   "su - linuxprobe 这意味着完全切换到新的用户"
date:       2020-07-07 15:53:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Linux
---

su命令可以解决切换用户身份的需求，使得当前用户在不退出登录的情况下，顺畅地切换到其他用户，比如从root管理员切换至普通用户：

```bash
[root@linuxprobe ~]# id
uid=0(root) gid=0(root) groups=0(root)
[root@linuxprobe ~]# su - linuxprobe
Last login: Wed Jan 4 01:17:25 EST 2017 on pts/0
[linuxprobe@linuxprobe ~]$ id
uid=1000(linuxprobe) gid=1000(linuxprobe) groups=1000(linuxprobe) context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023
```

细心的读者一定会发现，上面的su命令与用户名之间有一个减号（-），这意味着完全切换到新的用户，即把环境变量信息也变更为新用户的相应信息，而不是保留原始的信息。强烈建议在切换用户身份时添加这个减号（-）。

##### 参考链接

1. https://www.linuxprobe.com/chapter-05.html
