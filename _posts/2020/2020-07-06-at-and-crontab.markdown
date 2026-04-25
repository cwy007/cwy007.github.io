---
layout:     post
title:      "linux 计划任务 at 和 crontab"
subtitle:   "at 一次性计划任务；crontab 周期性计划任务"
date:       2020-07-06 11:43:00
author:     "chanweiyan"
header-style: text
catalog: false
tags:
  - Linux
---


##### at 一次性计划任务

`at -l` 查看已经设置的任务
`atrm 任务序号` 删除

```bash
[root@linuxprobe ~]# at 23:30
at > systemctl restart httpd
at > 此处请同时按下Ctrl+d来结束编写计划任务
job 3 at Mon Apr 27 23:30:00 2015
[root@linuxprobe ~]# at -l
3 Mon Apr 27 23:30:00 2016 a root

[root@linuxprobe ~]# echo "systemctl restart httpd" | at 23:30
job 4 at Mon Apr 27 23:30:00 2015
[root@linuxprobe ~]# at -l
3 Mon Apr 27 23:30:00 2016 a root
4 Mon Apr 27 23:30:00 2016 a root

[root@linuxprobe ~]# atrm 3
[root@linuxprobe ~]# at -l
4 Mon Apr 27 23:30:00 2016 a root
```

##### crontab 周期性任务

`分、时、日、月、星期 命令`
`* * * * * cmd`

```txt
字段  说明
分钟  取值为0～59的整数
小时  取值为0～23的任意整数
日期  取值为1～31的任意整数
月份  取值为1～12的任意整数
星期  取值为0～7的任意整数，其中0与7均为星期日
命令  要执行的命令或程序脚本
```

创建、编辑计划任务的命令为 `crontab -e`
查看当前计划任务的命令为 `crontab -l`
删除某条计划任务的命令为 `crontab -r`

```bash
[root@linuxprobe ~]# crontab -l
25 3 * * 1,3,5 /usr/bin/tar -czvf backup.tar.gz /home/wwwroot
```

需要说明的是，除了用逗号（,）来分别表示多个时间段，例如“8,9,12”表示8月、9月和12月。
还可以用减号（-）来表示一段连续的时间周期（例如字段“日”的取值为“12-15”，则表示每月的12～15日）。
以及用除号（/）表示执行任务的间隔时间（例如“*/2”表示每隔2分钟执行一次任务）。

```bash
# 每周一至周五的凌晨1点钟自动清空/tmp目录内的所有文件
[root@linuxprobe ~]# crontab -l
25 3 * * 1,3,5 /usr/bin/tar -czvf backup.tar.gz /home/wwwroot
0 1 * * 1-5 /usr/bin/rm -rf /tmp/*
```

>在crond服务的配置参数中，可以像Shell脚本那样以#号开头写上注释信息
>
>计划任务中的“分”字段必须有数值，绝对不能为空或是*号

##### 参考链接

1. https://www.linuxprobe.com/chapter-04.html
