---
layout:     post
title:      "webpack 4.43.0: TypeError: CleanWebpackPlugin is not a constructor"
subtitle:   "new CleanWebpackPlugin()  // 清除文件"
date:       2020-07-14 22:27:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - webpack
---

TypeError: CleanWebpackPlugin is not a constructor

## 错误信息

```bash
/Users/chanweiyan/jd/react-redux/react-hello-world/webpack.config.js:36
    new CleanWebpackPlugin(["dist"])  // 清除文件
    ^

TypeError: CleanWebpackPlugin is not a constructor
    at Object.<anonymous> (/Users/chanweiyan/jd/react-redux/react-hello-world/webpack.config.js:36:5)
    at Module._compile (internal/modules/cjs/loader.js:1176:30)
    at O
```

## 原因分析

根据官方文档的解释，clean-webpack-plugin插件将会默认移除webpack的output.path目录下的所有文件，以及每次构建之后所有未使用的webpack资源。如果你使用webpack版本高于4，那么意味着在`<PROJECT_DIR>/dist/`目录下的所有文件会被默认清除，当然你可以使用cleanOnceBeforeBuildPatterns来重写这一行为。例如：

```js
new CleanWebpackPlugin({
    // 默认： ['**/*'],cleanOnceBeforeBuildPatterns模式是相对于webpack的output.path。
    // 如果output.path之外使用绝对路径path.join(process.cwd(), 'build/**/*')
    // 需要首先运行dry: true来确保删除没有任何意外
    cleanOnceBeforeBuildPatterns: ['**/*', '!static-files*']
})
```

**原因1: 导入语句书写有误，应该是：**

```js
// es modules
import { CleanWebpackPlugin} from 'clean-webpack-plugin';

// common js
const { CleanWebpackPlugin} = require('clean-webpack-plugin');
```

**原因2: 在于CleanWebpackPlugin选项的参数传入错误**

如果和默认删除目录不同时才需要传入路径，且需要通过选项cleanOnceBeforeBuildPatterns来传入。

## 正确的写法 webpack.config.js

```js
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

{
// ...
  plugins: [   // 拓展Webpack功能
    new HtmlWebpackPlugin({  // 生成HTML文件
      template: "index.html",
      // favicon: "favicon.ico",
      inject: true,
      sourceMap: true,
      chunksSortMode: "dependency"
    }),
    new CleanWebpackPlugin()  // 清除文件
  ]
};
```

## 参考链接

* https://blog.csdn.net/benben_2015/article/details/96476780
* https://github.com/johnagan/clean-webpack-plugin#options-and-defaults-optional
* https://github.com/cwy007/react-hello-world
