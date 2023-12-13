# 🚀 rapid
[中文版本](./README.zh-CN.md)
> The *fastest* way to install npm packages.

[![Node CI Linux](https://github.com/cnpm/rapid/actions/workflows/ci.yml/badge.svg)](https://github.com/cnpm/rapid/actions/workflows/linux-ci.yml) [![Rust TEST Linux](https://github.com/cnpm/rapid/actions/workflows/rust-test.yml/badge.svg)](https://github.com/cnpm/rapid/actions/workflows/rust-test.yml)

- 🏗️ Follow `package-lock.json`, no private configuration
- ♻️ Global dist cache, extremely fast reinstallation
- ⛑️ Safe project dependency isolation
- 🛠️ Supports integration for any package manager

## Getting Started

### Independent Client
```bash
$ npm i @cnpmjs/rapid --registry=https://registry.npmmirror.com
$ rapid install
```

### Integration
```javascript
const rapid = require('@cnpmjs/rapid');
await rapid.install({
  cwd,
});
```

## Help
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

## Notice

* plz do not directly `rm -rf node_modules`` to manage dependencies.
* You can use `rapid clean`` instead.

# 🎁 Acknowledgements
- [fuse-t](https://github.com/macos-fuse-t/fuse-t) Thanks fuse-t for kext-less implementation of FUSE.
