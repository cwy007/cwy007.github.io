---
layout:     post
title:      "Shell中的 exit 0 与 exit 1 的区别"
subtitle:   "echo $? 为 0 表示程序正常退出，非 0 表示程序异常"
date:       2020-07-06 10:55:00
author:     "chanweiyan"
header-style: text
catalog: false
tags:
  - Shell
  - Linux
---

`exit 0` 正常运行程序并退出程序；
`exit 0` 非正常运行导致退出程序；

exit 0 可以告知你的程序的使用者：你的程序是正常结束的。如果 exit 非 0 值，那么你的程序的使用者通常会认为你的程序产生了一个错误。

在 shell 中调用完你的程序之后，用 echo $? 命令就可以看到你的程序的 exit 值。在 shell 脚本中，通常会根据上一个命令的 $? 值来进行一些流程控制。

```shell
[root@linuxprobe ~]# vim chkhost.sh
#!/bin/bash
ping -c 3 -i 0.2 -W 3 $1 &> /dev/null
if [ $? -eq 0 ]
then
echo "Host $1 is On-line."
else
echo "Host $1 is Off-line."
fi
```

##### 参考链接

1. https://blog.csdn.net/super_gnu/article/details/77099395
2. https://www.linuxprobe.com/chapter-04.html
