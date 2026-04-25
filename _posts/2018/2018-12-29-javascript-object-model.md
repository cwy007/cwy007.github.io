---
layout: post
title: "JavaScript 对象模型"
subtitle: '对象模型：基于类 class VS 基于原型 prototype'
author: "chanweiyan"
header-style: text
tags:
- JavaScript
---

阅读过的介绍 javascript 对象模型的文章的链接

---

JavaScript 的对象模型是基于原型的，与C++、Java 中基于类的对象模型有着很大的区别，特别是在对象属性与方法的继承机制上。

基于类的对象模型中，两个最重要的概念是类（class）与实例（instance）：

- class 定义了类中的所有属性与方法，可以看做该类所有实例的一个集合。
- instance 是 class 的一个实例，该实例所具有的属性与方法由所属的类严格决定，不多不少。

而基于原型的对象模型中，没有 class 与 instance 的概念，所有东西都是 object。object 可以分为用作“模板”的 prototypical object，以及基于这些 prototypical object 使用 new 关键字创建的其他对象。对象的属性既可以在创建时指定，也可以在运行时指定。任何对象都可以作为其他对象的原型，让其他对象来“共享”该对象的属性。

---
基于原型的对象系统意味着 JavaScript 中并没有专门的“类”的概念，而是将一部分对象作为原型（函数也是对象），来派生其他的对象。属性继承与初始化则需要通过原型链的方式来进行。同时，可以运行时添加属性，也给代码带来了更大的灵活性。

另外插一句，JavaScript 基于原型的对象模型给代码的自动补全（Auto complete）造成了一定的麻烦。SublimeText 似乎只提示当前打开的文档中已有的字符串，使用不太熟悉的 API 时很不方便。而 WebStorm 和 Brackets 在 JavaScript 的自动补全能覆盖所有的属性和方法。

---
原文链接：
1. [JavaScript 对象模型](https://blog.jonslow.com/javascript-object-model/)