---
layout:     post
title:      "CSS: calc() and line-height"
subtitle:   "CSS的单位及css3的calc()及line-height百分比"
date:       2020-10-05 21:42:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - CSS
---

## calc()

calc()语法非常简单，就像我们小时候学加 （+）、减（-）、乘（*）、除（/）一样，使用数学表达式来表示：

```css
.haorooms {
  width: calc(expression);
}

.haorooms{
  width: calc(100% - 20px);  //注：减号前后要有空格，否则很可能不生效！！
}

```

## line-height

line-height百分比在面试中可能经常问到。例如你知道line-height:120%和line-height:1.2的区别吗？

现在就说一下行高带单位和不带单位的区别，例如下面的例子：

```css
line-height:26px; 表示行高为26个像素
line-heigth:120%;表示行高为当前字体大小的120%
line-height:2.6em; 表示行高为当前字体大小的2.6倍
```

带单位的行高都有继承性，其子元素继承的是计算值，如父元素的字体大小为14px，定义行高line-height:2em;则计算值为 28px，不会因其子元素改变字体尺寸而改变行高。(例如：父元素14px，子元素12px,那么行高就是28px，子元素虽然字体是12px，行高还是父元素的行高)

```css
line-height:2.6;表示行高为当前字体大小的2.6倍
```

不带单位的行高是直接继承，而不是计算值，如父元素字体尺寸为14px，行高line-height:2;子元素字体为12px，不需要再定义行高，他默认的行高为24px。（例如：子元素12px，他的行高是24px,不会继承父元素的28px）

## 参考

1. <https://www.haorooms.com/post/css_unit_calc>
