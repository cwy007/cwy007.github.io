---
layout: post
title: Nest providers 4种类别
subtitle: 使用多种 provider，灵活注入对象
date: 2026-04-26 15:38:00
author: "chanweiyan"
# header-img: "img/cwy/rails/ruby-on-rails-1.png"
catalog: true
tags:
  - NestJS
---

## providers

Nest 实现了 IoC 容器，会从入口模块开始扫描，分析 Module 之间的引用关系，对象之间的依赖关系，
自动把 provider 注入到目标对象

## 什么是provider

- 被 @Injectable() 修饰的 class
- 在 @Module() 的 providers 中声明
- 示例 AppService

![被 @Injectable() 修饰的 class](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/503ed384731f4ec2b3ffcd7398884917~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

![在 @Module() 的 providers 中声明](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/c6d42361e0b547ec848f337f674c27ec~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

## 1.useClass

上面是一种简写，完整的写法是通过 provide指定 token，通过 useClass 指定对象的类，nest 会自动对它做实例化后用来注入

![上面是一种简写，完整的写法是](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/97d89fe1295f4898b8efb818cbcf022e~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

## 2.useValue

除了指定 class 外，还可以指定一个值让 IoC 容器注入

```js
{
    provide: 'person',
    useValue: {
        name: 'cwy',
        age: 34
    }
}

```

在对象里注入

```js
@Inject('person') private readonly person: {name: string, age: number}

```

## 3.useFactory

1.provider 的值支持动态生成，使用 useFactory 动态创建一个对象

```js
{
  provide: 'person',
  useFactory() {
    return {
      name: 'cwy',
      age: 34
    }
  }
}

```

在对象里注入

```js
@Inject('person') private readonly person: {name: string, age: number}

```

2.useFactory 支持通过参数注入别的 provider

通过 inject 声明了两个 token，一个是字符串 token 的 person，一个是 class token 的 AppService。

```js

{
  provide: 'person',
  useFactory(person: { name: string }, appService: AppService) {
    return {
      name: person.name,
      desc: appService.getHello()
    }
  },
  inject: ['person', AppService]
}

```

3.useFactory 支持异步，nest 会等拿到异步方法的结果之后再注入，这样可以更灵活地创建对象

```js

{
  provide: 'person',
  async useFactory() {
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    return {
      name: 'cwy',
      desc: 'happy coding',
    }
  }
}

```

## 4.useExisting 指定别名

示例：给已有 person provider 命名一个新的 token 叫做 new_person_alias

```js
{
  provide: 'new_person_alias',
  useExisting: 'person',
}

```

## 2种注入方式

声明依赖后，nest会自动注入依赖

1.通过构造器参数注入

![构造器注入](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/eecb757fc96c43d9ad3bb166eeec2393~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

token 是字符串时

注入是要用 @Inject 手动指定注入对象的 token

![token 是字符串](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/fb6d3baa60634eb1845d6759e90c51c5~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)

2.通过属性注入

![属性注入](https://cdn.jsdelivr.net/gh/cwy007/pic_bed@main/images/10fad8a2e44c466999a1615b6b561166~tplv-k3u1fbpfcp-jj-mark%3A3024%3A0%3A0%3A0%3Aq75.awebp)
