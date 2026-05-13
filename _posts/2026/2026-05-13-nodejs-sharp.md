---
layout: post
title: nodejs + sharp 压缩图片和GIF
subtitle: 实现压缩图片的命令行工具，并提供 mac zsh 配置
date: 2026-05-13 17:10:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NodeJS
---

![demo](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/20260513175714474.png)

在日常开发和写博客时，我们经常需要压缩图片或者将图片转换为 `webp` 等高效格式，以加快网页的加载速度。虽然有很多在线压缩网站，但每次都去访问、上传、下载未免太繁琐。

借助于 Node.js 中性能极高的 `sharp` 库，我们可以自己动手写一个简单的命令行脚本程序，再配合 macOS 的 `zsh` 别名配置，实现**在终端里一行命令秒压图片**的极客开发体验。

## 为什么选择 Sharp？

在 Node.js 生态中，处理图片的库有很多（比如纯 JS 实现的 `jimp`）。但如果追求极致的解析和压缩性能，首选绝对是 [Sharp](https://sharp.pixelplumbing.com/)。
`sharp` 是基于 C/C++ 图像处理库 `libvips` 封装的二进制扩展。它的处理速度通常比 ImageMagick 等老牌工具快往往达数倍至几十倍，同时处理高分辨率图像时内存占用极低。

## 一、编写 Node.js 压缩脚本

首先，找一个合适的目录（例如 `~/workspace/scripts/`）作为一个独立的小项目来存放脚本，并安装所需依赖：

```bash
mkdir -p ~/workspace/scripts/image-compressor
cd ~/workspace/scripts/image-compressor
npm init -y
npm install sharp
```

接下来，在该目录下创建一个 `compress.js` 文件，写入以下代码。这段脚本的作用是接收传入的图片相对/绝对路径，使用 `sharp` 对其进行处理，并保留原有的图片格式输出一个压缩后的版本。

```javascript
#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 1. 获取命令行传入的文件路径参数 ( process.argv 的第3个元素 )
const inputPath = process.argv[2];

if (!inputPath) {
  console.error('❌ 请提供需要压缩的图片路径！例如: img-comp ./test.png');
  process.exit(1);
}

// 2. 解析为绝对路径，兼容在不同目录下执行的情况
const resolvedInput = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(resolvedInput)) {
  console.error(`❌ 指定的文件不存在: ${resolvedInput}`);
  process.exit(1);
}

// 3. 构造输出文件名 (原文件同目录追加 .min 标识，保留原有图片格式后缀)
const parsedPath = path.parse(resolvedInput);
const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.min${parsedPath.ext}`);

console.log(`⏳ 正在加载并压缩: ${parsedPath.base} ...`);

// 4. 执行 Sharp 转换流水线
const isGif = parsedPath.ext.toLowerCase() === '.gif';

let sharpInstance;
if (isGif) {
  // 对于 GIF 文件，保留所有动画帧并忽略像素大小限制，设置快速压缩
  sharpInstance = sharp(resolvedInput, {
      animated: true,
      limitInputPixels: false
    })
    // 优化1：限制最大宽度（如录屏 GIF 通常宽度极大，缩小分辨率能呈指数级降低处理时间）
    .resize({
      width: 1080,
      withoutEnlargement: true
    })
    .gif({
      effort: 1, // 最低计算强度（提速）
      colors: 10, // 色彩数（默认 256）。减少调色板颜色能显著减小体积
      // dither: 0.5 // 抖动比例。降低可减小体积，对屏幕录制非常有效
    });
} else {
  // 对于普通图片，sharp 会自动根据文件后缀进行推断压缩
  sharpInstance = sharp(resolvedInput);
}

// 简单的命令行加载动画 (Spinner)
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIndex = 0;
const loadingTimer = setInterval(() => {
  // \r 使光标回到行首，不停覆盖当前行内容
  process.stdout.write(`\r🔮 正在拼命压缩中，这可能需要一点时间... ${spinnerFrames[frameIndex]}  `);
  frameIndex = (frameIndex + 1) % spinnerFrames.length;
}, 80);

const startTime = Date.now(); // 记录开始时间

sharpInstance
  .toFile(outputPath)
  .then(info => {
    clearInterval(loadingTimer);
    process.stdout.write('\r\x1b[K'); // 执行成功后，清理掉动画占用的那一行

    const endTime = Date.now(); // 记录结束时间
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // 计算耗时(秒)

    const originalSize = (fs.statSync(resolvedInput).size / 1024).toFixed(2);
    const newSize = (info.size / 1024).toFixed(2);
    const ratio = (((originalSize - newSize) / originalSize) * 100).toFixed(2);

    console.log(`✅ 压缩执行成功!`);
    console.log(`📦 保存至: ${outputPath}`);
    console.log(`📉 体积变化: ${originalSize} KB -> ${newSize} KB （锐减了 ${ratio}%）`);
    console.log(`⏱️  耗时: ${timeTaken} 秒`);
    process.exit(0);
  })
  .catch(err => {
    clearInterval(loadingTimer);
    process.stdout.write('\r\x1b[K'); // 甚至报错也要清理掉动画行

    console.error('❌ 压缩过程发生严重异常:', err.message);
    process.exit(1);
  }).finally(() => {
    console.log('⏹️ 压缩流程已结束。');
  });
```

为了良好的习惯，给这个脚本加上可执行权限：

```bash
chmod +x compress.js
```

## 二、配置 MacOS Zsh 快捷命令

脚本虽然写好了，但目前只能在所在的工作目录下通过 `node compress.js xxx` 来执行，每次敲绝对路径显然不够方便。我们需要利用别名机制（`alias`），将它配置成系统任何地方都能调用的短命令。

在终端编辑由于 MacOS 自带而普及的 `zsh` 全局配置文件：

```bash
# 打开 zshrc 配置
vim ~/.zshrc
```

在文件末尾随便找个空白的地方，添加如下这行 `alias`。这相当于起了一个叫 `img-comp` 的快捷键：

```bash
# --- 自定义图片压缩 CLI 工具 ---
alias img-comp="node ~/workspace/scripts/image-compressor/compress.js"


vim ~/.zsh_aliases
alias imagecompress="node /Users/chanweiyan/workspace/noder/image_compressor/compress.js"
omz reload

```

保存并退出，最后一步刷新 zsh 的环境变量使其立刻生效即可：

```bash
source ~/.zshrc
```

## 三、愉快地使用

现在，无论你所处的当前终端终端在哪个工作区里（甚至是在下载目录下）。只要打出别名命令加上你要处理的图片，它就能光速秒出一个压缩过的高清小体积副本。

```bash
cd ~/Downloads
img-comp 封面原画.jpg

# 输出控制台内容：
# ⏳ 正在加载并压缩: 封面原画.jpg ...
# ✅ 压缩执行成功!
# 📦 保存至: /Users/chanweiyan/Downloads/封面原画.min.jpg
# 📉 体积变化: 3452.33 KB -> 190.25 KB （锐减了 94.48%）
```

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: 为什么不用全局环境变量 PATH，而是用 alias 别名关联？</h4>💬点击展开/收起</summary>

如果你强行在这个 `image-compressor` 目录下执行了全局暴露，把包所在目录加入 `export PATH="$PATH:$HOME/workspace/scripts/image-compressor"` 当然也没毛病。

但那种做法会把你项目文件夹里的其它有的没的（甚至是不小心写废的其它执行文件）都统统暴露在系统的环境之中，容易带来奇怪的冲突。而依靠直接写在 `alias` 的映射，足够做到精准打击。只需要修改前面这个随意拼写自己觉得顺手的指令前缀名（比如 `img-comp` 甚至可以就叫 `yp` 压图），也能防止命令和其他底层系统库冲撞重名。

</details>

<!-- #endregion -->

[https://juejin.cn/book/7226988578700525605/section/7256628255568953359?enter_from=course_center&utm_source=course_center](https://juejin.cn/book/7226988578700525605/section/7256628255568953359?enter_from=course_center&utm_source=course_center)

[https://github.com/cwy007/image_compressor](https://github.com/cwy007/image_compressor)
