---
title: bundle-install-20230729
layout: default
hide-in-nav: true
---

# bundle-install-20230729

## error logs

```txt

Installing eventmachine 1.2.7 with native extensions
Gem::Ext::BuildError: ERROR: Failed to build gem native extension.


./project.h:119:10: fatal error: 'openssl/ssl.h' file not found
#include <openssl/ssl.h>
         ^~~~~~~~~~~~~~~
1 error generated.
make: *** [binder.o] Error 1

make failed, exit code 2

Gem files will remain installed in /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/eventmachine-1.2.7 for inspection.
Results logged to /Users/chanweiyan/.rvm/gems/ruby-3.0.0/extensions/arm64-darwin-22/3.0.0/eventmachine-1.2.7/gem_make.out

  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:90:in `run'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:42:in `block in make'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:34:in `each'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:34:in `make'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/ext_conf_builder.rb:64:in `block in build'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/tempfile.rb:317:in `open'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/ext_conf_builder.rb:28:in `build'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:156:in `build_extension'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:190:in `block in build_extensions'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:187:in `each'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/ext/builder.rb:187:in `build_extensions'
  /Users/chanweiyan/.rvm/rubies/ruby-3.0.0/lib/ruby/3.0.0/rubygems/installer.rb:821:in `build_extensions'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/rubygems_gem_installer.rb:66:in `build_extensions'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/rubygems_gem_installer.rb:26:in `install'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/source/rubygems.rb:199:in `install'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/installer/gem_installer.rb:54:in `install'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/installer/gem_installer.rb:16:in `install_from_spec'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/installer/parallel_installer.rb:186:in `do_install'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/installer/parallel_installer.rb:177:in `block in worker_pool'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/worker.rb:62:in `apply_func'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/worker.rb:57:in `block in process_queue'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/worker.rb:54:in `loop'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/worker.rb:54:in `process_queue'
  /Users/chanweiyan/.rvm/gems/ruby-3.0.0/gems/bundler-2.2.28/lib/bundler/worker.rb:91:in `block (2 levels) in create_threads'

An error occurred while installing eventmachine (1.2.7), and Bundler cannot continue.

In Gemfile:
  github-pages was resolved to 220, which depends on
    jekyll-avatar was resolved to 0.7.0, which depends on
      jekyll was resolved to 3.9.0, which depends on
        em-websocket was resolved to 0.5.2, which depends on
          eventmachine

```

## 解决方法

```bash

gem install eventmachine -v '1.2.7' -- --with-ldflags="-Wl,-undefined,dynamic_lookup"

```

## reference

- [Jekyll install - fatal error: ‘openssl/ssl.h’ file not found (macOS)](https://talk.jekyllrb.com/t/jekyll-install-fatal-error-openssl-ssl-h-file-not-found-macos/7660)
- [Fix: eventmachine gem failed to build on macOS Ventura with Ruby 2.7.6](https://www.jessesquires.com/blog/2023/01/18/eventmachine-failure-on-macos-ventura/)
- [Unable to load the EventMachine C extension, ruby 2.7.4, Mac OS 12.0.1 x86](https://github.com/eventmachine/eventmachine/issues/960)
