# cwy007.github.io

## 项目启动

```bash

cd /Users/chanweiyan/github/cwy007.github.io

# blogs='bundle exec jekyll serve --watch'
bundle exec jekyll serve --watch

# http://localhost:4000/


```

## 部署到 github page

- 在 _posts 目录下添加新的文章
- git commit
- git push 到 github
- 等一会刷新 `cwy007.github.io` 页面就会看到新的文章

## github cwy007/pic_bed

![使用github仓库作为图床的图片地址](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/AOP%E6%89%A7%E8%A1%8C%E9%A1%BA%E5%BA%8F.jpg)

```txt

仓库用户名：你的GitHub昵称
仓库名称：pic-bed（你刚建的仓库名）
分支名：main
存储路径：images/ （图片自动存在这个文件夹）
Token：你刚才复制的GitHub令牌
自定义域名（关键！加速）：
https://cdn.jsdelivr.net/gh/用户名/仓库名@main

```

## refs

<https://jekyllrb.com/docs/structure/>
