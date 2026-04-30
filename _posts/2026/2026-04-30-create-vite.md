---
layout: post
title: create-vite
subtitle: 一行命令拉起一个现代前端工程的脚手架
date: 2026-04-30 18:55:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - Vite
  - React
---

## 一句话理解

> **`create-vite` = Vite 官方维护的项目脚手架，作用是把一份"模板目录"复制到你本地、改改 `package.json` 的 name，然后让你 `npm install` 就能跑。**

它本身不是 Vite，是"生成 Vite 项目"的工具。和 `create-react-app`、`create-next-app` 是同一类东西，但更轻、更快、更通用——支持 Vanilla / Vue / React / Preact / Lit / Svelte / Solid / Qwik 等多种框架的模板。

## 一行命令上手

```bash
# 任选一种包管理器
npm  create vite@latest
pnpm create vite
yarn create vite
bun  create vite
```

> `npm create xxx` 是 `npm init xxx` 的别名，等价于执行 `npx create-xxx`。

带参数的非交互式写法：

```bash
npm create vite@latest my-app -- --template react-ts
```

- `my-app`：目标目录名
- `--template`：跳过模板选择，直接指定（注意 `--` 用来把参数透传给 `create-vite`，而不是 npm）

完整流程：

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

## 内置模板一览

| 模板             | 框架        | 语言       |
| ---------------- | ----------- | ---------- |
| `vanilla`        | 无框架      | JavaScript |
| `vanilla-ts`     | 无框架      | TypeScript |
| `vue`            | Vue 3       | JavaScript |
| `vue-ts`         | Vue 3       | TypeScript |
| `react`          | React       | JavaScript |
| `react-ts`       | React       | TypeScript |
| `react-swc`      | React + SWC | JavaScript |
| `react-swc-ts`   | React + SWC | TypeScript |
| `preact` / `-ts` | Preact      | JS / TS    |
| `lit` / `-ts`    | Lit         | JS / TS    |
| `svelte` / `-ts` | Svelte      | JS / TS    |
| `solid` / `-ts`  | Solid       | JS / TS    |
| `qwik` / `-ts`   | Qwik        | JS / TS    |

> **`react-swc`**：用 [SWC](https://swc.rs/) 替代 Babel 做 JSX 转译和 Fast Refresh，冷启动和 HMR 更快。新项目推荐直接选这个。

## 它是怎么工作的

`create-vite` 是一个非常薄的 Node CLI，整体逻辑只有几百行代码：

```text
1. 解析 CLI 参数（targetDir、--template）
2. prompts 交互：项目名 / 框架 / 变体（JS or TS / SWC）
3. 把 packages/create-vite/template-<name>/ 整个拷到目标目录
4. 改写 package.json 里的 name 字段
5. 处理 _gitignore → .gitignore（npm 发布时不能带 .gitignore，所以用下划线占位）
6. 打印"接下来跑这几条命令"提示
```

所以它**不会**自动给你装依赖，也**不会**自动 `git init`——这是有意设计：保持快、保持可预测、保持可被其他工具包装。

源码在 vite 仓库里：[`packages/create-vite`](https://github.com/vitejs/vite/tree/main/packages/create-vite)。

## 生成出来的工程长什么样

以 `react-ts` 为例：

```text
my-app/
├─ index.html              ← 入口在根目录，不是 public/
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json      ← 给 vite.config.ts 单独用的
├─ vite.config.ts
├─ public/                 ← 不会被打包处理的静态资源
│  └─ vite.svg
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ App.css
   ├─ index.css
   ├─ assets/
   └─ vite-env.d.ts        ← Vite 注入的全局类型
```

几个关键点：

- **`index.html` 在根目录**：Vite 把它当成模块入口，里面 `<script type="module" src="/src/main.tsx">` 直接引用源码
- **没有 webpack.config**：所有打包配置都在 `vite.config.ts`
- **`vite-env.d.ts`**：声明 `import.meta.env`、`*.svg?react` 之类的类型

`vite.config.ts` 的最小形态：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
})
```

## 常用 npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  }
}
```

| 脚本           | 作用                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `vite`         | 启动开发服务器（默认端口 5173），基于 ESM + 浏览器原生 import        |
| `vite build`   | 用 Rollup 做生产构建，输出到 `dist/`                                 |
| `vite preview` | 本地起一个静态服务器预览 `dist/`，**只用来验证构建产物，不是部署用** |

## create-vite vs 其它脚手架

| 维度       | create-react-app | create-next-app | **create-vite**                     |
| ---------- | ---------------- | --------------- | ----------------------------------- |
| 维护状态   | 已停止维护       | 活跃            | 活跃                                |
| 底层       | Webpack          | Next.js (Turbo) | Vite (esbuild + Rollup)             |
| 框架范围   | 仅 React         | 仅 Next.js      | **多框架**（Vue/React/Svelte/...）  |
| 冷启动     | 慢（全量打包）   | 中              | **快**（按需编译 + 浏览器原生 ESM） |
| 配置灵活度 | 低（需要 eject） | 中              | 高（直接改 `vite.config.ts`）       |
| 是否装依赖 | 自动             | 自动            | **不自动**                          |

## 进阶用法

### 1. 用社区模板（community templates）

`create-vite` 自身**只支持内置模板**。要拉取社区模板（比如 `vite-plugin-ssr` 官方模板），用 [`degit`](https://github.com/Rich-Harris/degit)：

```bash
npx degit user/repo/path my-app
cd my-app && npm install
```

`degit` 比 `git clone` 快，因为它只下载最新一次 commit 的 tarball，不带 `.git` 历史。

### 2. 离线 / 内网环境

把 `packages/create-vite/template-react-ts/` 整个目录抄到内网的脚手架仓库即可——它就是一份普通文件夹，没有任何运行时魔法。

### 3. monorepo 里追加子包

```bash
# 假设根目录有 pnpm-workspace.yaml
cd packages
pnpm create vite admin --template vue-ts
```

生成完别忘了：

- 把子包加进 workspace（pnpm 默认 `packages/*` 会自动识别）
- 子包的 `name` 改成 `@scope/admin` 形式
- 共用依赖（react、typescript）提到根目录

## 常见坑

1. **`npm create vite` 命中了缓存的旧版本**
   解决：加 `@latest`，强制走最新——`npm create vite@latest`。

2. **`--template` 没生效**
   忘了 `--` 把参数透传给 `create-vite`：
   ```bash
   # ❌ 这里 --template 被 npm 自己吃掉了
   npm create vite my-app --template react-ts
   # ✅
   npm create vite@latest my-app -- --template react-ts
   ```

3. **生成后 `npm run dev` 报 `Cannot find module 'react'`**
   忘了进目录后 `npm install`。`create-vite` 不会替你装。

4. **`.gitignore` 没有 / 是 `_gitignore`**
   极少数旧版本有这个 bug，手动重命名即可。新版（>=5）已经修复。

5. **TypeScript 的严格模式**
   模板里默认 `"strict": true`，新项目建议保留；不喜欢可以临时关，不要直接删 `tsconfig.json` 里整段。

## 一图流总结

```text
┌────────────────────────────────────────────────────────┐
│  npm create vite@latest my-app -- --template react-ts  │
└────────────────────────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  create-vite (CLI)   │
            │  · 解析参数          │
            │  · prompts 交互      │
            │  · 拷贝模板目录       │
            │  · 改写 package.json │
            └──────────┬───────────┘
                       ▼
        ┌──────────────────────────────┐
        │ my-app/                      │
        │  index.html  vite.config.ts  │
        │  src/  public/  package.json │
        └──────────────┬───────────────┘
                       ▼
              npm install && npm run dev
                       ▼
                 http://localhost:5173
```

## QA

<!-- #region 展开/折叠 -->

<details markdown="1">

<summary><h4>QA: <code>import.meta.env</code> 是什么？</h4>💬点击展开/收起</summary>

`import.meta` 是 ES2020 标准提供的、**模块自身的元信息对象**（只在 ESM 里有）。Vite 在它上面挂了一份 `env`，作为**项目的环境变量入口**，用来替代 webpack 时代的 `process.env.XXX`。

```typescript
console.log(import.meta.env.MODE)         // 'development' | 'production'
console.log(import.meta.env.DEV)          // boolean，开发模式
console.log(import.meta.env.PROD)         // boolean，生产模式
console.log(import.meta.env.SSR)          // boolean，是否 SSR 构建
console.log(import.meta.env.BASE_URL)     // 部署基础路径，对应 vite 的 base 配置
console.log(import.meta.env.VITE_API)     // 自定义变量（必须 VITE_ 前缀）
```

### 1. 为什么不用 `process.env`

- `process` 是 Node.js 的全局对象，浏览器里没有
- Vite 直接走浏览器原生 ESM，不会塞一个 `process` polyfill 给你
- `import.meta` 是浏览器和 Node 都支持的标准 API，更干净

### 2. 内置变量

| 变量                       | 含义                                                |
| -------------------------- | --------------------------------------------------- |
| `import.meta.env.MODE`     | 当前模式字符串（默认 `development` / `production`） |
| `import.meta.env.DEV`      | 是否开发模式（`MODE !== 'production'`）             |
| `import.meta.env.PROD`     | 是否生产模式                                        |
| `import.meta.env.SSR`      | 是否在 SSR 构建中                                   |
| `import.meta.env.BASE_URL` | 资源公共路径，对应 `vite.config.ts` 的 `base` 字段  |

### 3. 自定义变量：必须以 `VITE_` 开头

放在项目根目录的 `.env` 文件里：

```bash
# .env
VITE_API_BASE=https://api.example.com
SECRET_KEY=只有Node能看见的，不会暴露给浏览器
```

```typescript
// 仅 VITE_ 前缀的会被注入到 import.meta.env，并可在浏览器代码里访问
fetch(import.meta.env.VITE_API_BASE + '/users')
```

> **安全提醒**：`VITE_` 前缀的变量会**硬编码到打包产物里**，浏览器可见。**绝不要**把密钥、token 写进 `VITE_*`。

### 4. 环境文件加载顺序

| 文件                | 加载时机                              |
| ------------------- | ------------------------------------- |
| `.env`              | 所有情况                              |
| `.env.local`        | 所有情况，**会被 git 忽略**           |
| `.env.[mode]`       | 指定 mode 时（如 `.env.development`） |
| `.env.[mode].local` | 指定 mode 时，**会被 git 忽略**       |

后加载的覆盖先加载的。`.local` 用来放本地机密变量，配套 `.gitignore`。

### 5. TypeScript 类型补全

模板生成的 `src/vite-env.d.ts` 已经引用了 Vite 内置类型：

```typescript
/// <reference types="vite/client" />
```

要给自定义变量加类型，扩展 `ImportMetaEnv`：

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_FEATURE_FLAG: 'on' | 'off'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 6. 它是怎么工作的

构建期，Vite 用**字符串静态替换**把 `import.meta.env.VITE_FOO` 替换成对应字面量：

```typescript
// 源码
if (import.meta.env.PROD) console.log(import.meta.env.VITE_API_BASE)

// 构建后
if (true) console.log("https://api.example.com")
```

所以它不是运行时读的环境变量，而是**编译期注入**——这也意味着改 `.env` 后必须重启 dev server。

</details>

<!-- #endregion -->

## 参考

- 官方文档：<https://vite.dev/guide/#scaffolding-your-first-vite-project>
- 源码：<https://github.com/vitejs/vite/tree/main/packages/create-vite>
- 社区模板汇总（Awesome Vite）：<https://github.com/vitejs/awesome-vite#templates>
