# 🚀 rapid
[English Version](./README.md)
> The *fastest* way to install npm packages.

[![Node CI Linux](https://github.com/cnpm/rapid/actions/workflows/ci.yml/badge.svg)](https://github.com/cnpm/rapid/actions/workflows/linux-ci.yml) [![Rust TEST Linux](https://github.com/cnpm/rapid/actions/workflows/rust-test.yml/badge.svg)](https://github.com/cnpm/rapid/actions/workflows/rust-test.yml)

- 🏗️ 基于 package-lock.json ，无任何私有配置
- ♻️ 统一的全局产物缓存，极快的二次安装
- ⛑️ 安全的项目依赖隔离方案
- 🛠️ 支持二次集成开发，支持任意 npm 包管理器

## 快速开始

### 独立客户端
```bash
$ npm i @cnpmjs/rapid --registry=https://registry.npmmirror.com
$ npm i --package-lock-only --registry=https://registry.npmmirror.com
$ rapid install
```

### npm 包集成
```javascript
const rapid = require('@cnpmjs/rapid');
await rapid.install({
  cwd,
});
```

## 帮助说明
```bash
rapid [command]

Commands:
  rapid install       Install dependencies                      [aliases: i, ii]
  rapid clean [path]  Clean up the project      [aliases: c, unmount, uninstall]
  rapid list          List rapid mount info                         [aliases: l]

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

## 特别注意

* 请勿直接 `rm -rf node_modules` 进行依赖管理
* 可以通过 `rapid clean` 进行替代

# 🎁 特别感谢
- [fuse-t](https://github.com/macos-fuse-t/fuse-t) Thanks fuse-t for kext-less implementation of FUSE.
