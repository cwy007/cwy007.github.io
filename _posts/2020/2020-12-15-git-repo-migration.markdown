---
layout:     post
title:      "Git仓库迁移，包括所有的分支、标签、日志"
subtitle:   "仅三行命令即可完成"
date:       2020-12-15 02:28:00
author:     "chanweiyan"
catalog: true
tags:
  - Git
---


## 操作

```bash
git clone --bare http://域名/分组/仓库名称.git

cd 仓库名称.git

git push --mirror http://新域名/新分组/新仓库名称.git

```

* `git branch -a` 查看所有分支
* `git branch -r` 查看所有远程分支

## 参考

* [Git仓库迁移，包括所有的分支、标签、日志](https://blog.csdn.net/jingcheng345413/article/details/82759329?utm_medium=distribute.pc_relevant.none-task-blog-BlogCommendFromMachineLearnPai2-1.control&depth_1-utm_source=distribute.pc_relevant.none-task-blog-BlogCommendFromMachineLearnPai2-1.control)
