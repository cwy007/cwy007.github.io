---
layout:     post
title:      "Ruby 中的 require 和 加载路径 $LOAD_PATH"
date:       2019-01-11 11:18:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - Ruby
---

#### 目录结构
```bash
# /Users/bparanj
$ tree
.
└── projects
    └── geme
        ├── a.rb
        └── b.rb
```

`require` 是 Ruby 中的一个内核 Kernel 方法。在本文中，我们将会看到 Ruby 是如何知道去哪里
找文件。你能否在同一个目录中 `require` 一个 ruby 文件？让我们创建两个文件：第一个是 `a.rb`
文件。
```ruby
# /Users/bparanj/projects/geme/a.rb
puts 'a'
```

第二个文件 `b.rb`:
```ruby
# /Users/bparanj/projects/geme/b.rb
require 'a'
```

这会有用吗？让我们运行 `b.rb` 文件：
```bash
$ ruby b.rb
`require': cannot load such file -- a (LoadError)
```

我们得到一个报错。我们可以修改文件 `b.rb` 来解决这个问题：
```ruby
# /Users/bparanj/projects/geme/b.rb
require './a'
```

现在，代码可以运行了:
```bash
$ ruby b.rb
a
```

在 `require` 方法中指定可以找到 `a.rb` 文件的目录是有问题的。因为如果我们向上回退一个目录并运行
文件 `b.rb`，指令会失败，并给出相同的错误信息。
```bash
cd ..
$ ruby geme/b.rb
`require': cannot load such file -- a (LoadError)
```

指令 `ruby geme/b.rb` 失败是因为点 `.` 指 Ruby 进程的当前工作目录，并非源文件 `b.rb` 所在的目录。
所以，在我的示例中，Ruby 会在文件夹 `/Users/bparanj/projects` 中查找文件 `a.rb`，这是 Ruby 进程
运行的目录。但是文件 `a.rb` 是在`/Users/bparanj/projects/geme`目录里。我们可以用内核 Kernel
方法 `require_relative` 解决这个问题。`require_relative` 方法相对于源文件来指定要加载的文件路径，
而不会依赖 Ruby 进程所在的目录。

#### 加载路径
看一下 ruby 指令的帮助信息：
```bash
$ ruby --help
Usage: ruby [switches] [--] [programfile] [arguments]
  -0[octal]       specify record separator (\0, if no argument)
  -a              autosplit mode with -n or -p (splits $_ into $F)
  -c              check syntax only
  -Cdirectory     cd to directory before executing your script
  -d, --debug     set debugging flags (set $DEBUG to true)
  -e 'command'    one line of script. Several -e's allowed. Omit [programfile]
  -Eex[:in], --encoding=ex[:in]
                  specify the default external and internal character encodings
  -Fpattern       split() pattern for autosplit (-a)
  -i[extension]   edit ARGV files in place (make backup if extension supplied)
  -Idirectory     specify $LOAD_PATH directory (may be used more than once)
  -l              enable line ending processing
  -n              assume 'while gets(); ... end' loop around your script
  -p              assume loop like -n but print line also like sed
  -rlibrary       require the library before executing your script
  -s              enable some switch parsing for switches after script name
  -S              look for the script using PATH environment variable
  -T[level=1]     turn on tainting checks
  -v, --verbose   print version number, then turn on verbose mode
  -w              turn warnings on for your script
  -W[level=2]     set warning level; 0=silence, 1=medium, 2=verbose
  -x[directory]   strip off text before #!ruby line and perhaps cd to directory
  --copyright     print the copyright
  --enable=feature[,...], --disable=feature[,...]
                  enable or disable features
  --external-encoding=encoding, --internal-encoding=encoding
                  specify the default external or internal character encoding
  --version       print the version
  --help          show this message, -h for short message
Features:
  gems            rubygems (default: enabled)
  rubyopt         RUBYOPT environment variable (default: enabled)
```

`-I` 标志 flag 指定加载路径目录。所以，如果我们将文件 `b.rb` 中 `require` 方法的参数改回为 `a`:
```ruby
# /Users/bparanj/projects/geme/b.rb
require 'a'
```

并用 `-I` 标志传递当前目录，指令 `ruby -I . b.rb` 应该能够运行。
```bash
$ ruby -I . b.rb
a
```

奏效了！标志 `-I` 后面的点 `.` 指定 `require` 方法可以找到文件的目录。在这个示例中是指当前
目录 `/Users/bparanj/projects/geme`。Ruby 中的加载路径是什么？在 Ruby 中以 `$` 符号开头的
标识符是一个全局变量，如果我们运行交互式 Ruby `$ irb`，我们可以看到加载路径 `$LOAD_PATH` 变量
所包含的默认值。
```bash
$ irb
> $LOAD_PATH
 => ["/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/site_ruby/2.2.0",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/site_ruby/2.2.0/x86_64-darwin14",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/site_ruby",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/vendor_ruby/2.2.0",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/vendor_ruby/2.2.0/x86_64-darwin14",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/vendor_ruby",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/2.2.0",
 "/Users/bparanj/.rvm/rubies/ruby-2.2.3/lib/ruby/2.2.0/x86_64-darwin14"]
```

#### 旁注
看着这个输出，我对 `site_ruby` 和 `vendor_ruby` 目录感到了好奇。我在 Ruby 邮件列表中发现
`Ammar` 对此作出的一个好的解释。

>其原理是，你或你的管理员所安装的东西会进到 `site_ruby` 目录中，因为他们特定于（机器，服务器等）
站点。由发行版（例如：MRI, jruby, 等）所安装的东西会进到 `vendor_ruby` 目录中，他们特定于
发行版的供应商。每个目录下都有特定于体系结构的目录，例如 `site_ruby/1.9.1/i686-linux` 或
`vendor_ruby/1.9.1/i386-darwin`，其中包含特定于该机器体系结构的模块。如果你看一下默认加载
路径（p $:) 中的内容，你会发现站点目录 `site_ruby` 位于供应商目录 `vendor_ruby` 的前面，
这会允许你用安装在站点 `site_ruby` 目录中的模块覆盖掉特定的位于供应商目录 `vendor_ruby` 中
的模块。顺便说一下，这并不是 Ruby 语言所特有的。perl, python, php 和其他的语言也有相同的安排。
-- Ammar (Ruby 邮件列表)

回到我们手头上的主题，加载路径（$:) 是一个由绝对路径所组成的数组。所以，让我们在文件 `b.rb` 中将
包含文件 `a.rb` 的目录添加到加载路径 `$LOAD_PATH` 中。在当前的示例中，我们可以在 `require`
语句前将当前目录添加到加载路径中。
```bash
$LOAD_PATH.unshift('.')
require 'a'
```

现在，在没有加载路径修饰符标志的情况下，ruby 知道去哪里找到文件 `a.rb`。
```bash
$ ruby b.rb
a
```

奏效了。方法 `Array#unshift` 会将参数放到数组的前面。这里是一个简单的示例：
```bash
$ irb
> [1,2].unshift(0)
 => [0, 1, 2]
```

但是，当从其他目录运行文件 `b.rb` 中的程序时，仍然会有相同的问题。
```bash
$ cd ..
projects bparanj$ ruby geme/b.rb
 `require': cannot load such file -- a (LoadError)
```

我们可以像下面这样解决这个问题：
```ruby
# /Users/bparanj/projects/geme/b.rb
folder = File.expand_path('.', __dir__)
$:.unshift(folder) unless $:.include?(folder)

require 'a'
```

代码解释：
```ruby
File.expand_path('.', __dir__)
```

上面的这行代码会返回文件 `b.rb` 所在目录的扩展路径。在我的示例中这个路径是
`/Users/bparanj/projects/geme`。现在，我们可以从任何目录运行这个程序，
例如，我可以向上回退一个目录：
```bash
$ cd ..
projects bparanj$ ruby geme/b.rb
a
```

奏效了。甚至从我的主 `home` 目录：
```bash
$ ruby projects/geme/b.rb
a
```

指令仍然奏效！所以，Ruby 会串联文件夹和文件 `a.rb` 以找到 `a.rb` 所在的位置，并将这个文件
读取到内存中，然后从上至下地执行文件中的代码。在本文中，你学习了 `require` 和 加载路径 `$LOAD_PATH`
在 Ruby 中是如何运行的，以及你如何用 `require` 方法，从任意目录运行一个 ruby 程序。

#### 原文链接
https://rubyplus.com/articles/4661-The-require-and-load-path-in-Ruby