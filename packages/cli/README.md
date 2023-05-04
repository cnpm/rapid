tnpm
=======

[阿里私有 npm registry](https://npm.alibaba-inc.com) 客户端，可以替换默认的 npm 客户端。

赞助 tnpm 一杯喜茶

![赞助 tnpm 一杯喜茶](https://heyteapay.alipay.com/api/qr/1700001)

## Badges

[![TNPM version][tnpm-image]][tnpm-url]
[![TNPM downloads][tnpm-downloads-image]][tnpm-url]
![node >= 14.18.3](https://duing.alibaba-inc.com/img/label?key=node&value=%3E%3D%2014.8.3&keyBgColor=505050&valueBgColor=51CA2A&size=12)

[tnpm-image]: https://npm.alibaba-inc.com/badge/v/tnpm.svg
[tnpm-url]: https://npm.alibaba-inc.com/package/tnpm
[tnpm-downloads-image]: https://npm.alibaba-inc.com/badge/d/tnpm.svg

--------------------

## [For English Documentation](README-en.md)

## 用户手册

https://yuque.antfin.com/chair/tnpm


--------------------

## Install

建议全局安装。

```bash
npm install tnpm -g --registry=https://registry.npm.alibaba-inc.com
```

如果你使用 npm 的方式无论如何都无法安装 tnpm，那么我只能教你终极解决方案，还是安装不了的话，请钉钉@苏千 来打脸。

```bash
npm i -g npminstall --registry=https://registry.npm.alibaba-inc.com
npminstall -g tnpm --registry=https://registry.npm.alibaba-inc.com
```

好吧，如果你还是失败，那就是真的厉害了，估计是 npm i -g 的时候，npm 自动去修复其他全局安装的模块导致 npminstall 安装也失败了。
那么我只能教你最后一个终极方案了，就是将 npminstall 安装到当前目录，然后通过当前目录的 npminstall 来安装 tnpm。

```bash
# 回到你自己的老家，免得删除错了文件
cd ~
# 先清理干净，确保当前目录没有 node_modules
rm -rf node_modules

npm i npminstall --registry=https://registry.npm.alibaba-inc.com
# 使用当前目录安装好的 npminstall 来安装，它肯定 OK 的
./node_modules/.bin/npminstall -g tnpm --registry=https://registry.npm.alibaba-inc.com
# 使用 tnpm 来将 npminstall 安装好，避免 tnpm 被意外删除，还可以使用 npminstall 来兜底
tnpm i -g npminstall
# 当然，最后要将刚才本地安装的 npminstall 删除了，打扫干净
rm -rf node_modules
```

## Usage

```bash
# Open tnpm website
$ tnpm web

# Check current dependencies version
$ tnpm check

# Just like using `npm`
$ tnpm info urllib

# Sync modules form `registry.npmjs.org`
$ tnpm sync connect mocha
$ tnpm sync #this will try to parse the package.json file, and sync package.name

# Sync public module from npmjs.org
$ tnpm sync connect

# Open module document page
$ tnpm doc hsf

# Exec npm package or binary
$ tnpm exec node -v
$ tnpm exec semver 1.2.4-beta.0 -i prerelease
```

### tnpm 发包说明

请查看 https://npm.alibaba-inc.com

## 指定参数下载特定版本的 node

通过 `--install-node=8` 下载 node v8 最新版本，同时支持 `--install-alinode=1.5.0` 下载 alinode 1.5.3。
还能安装 node rc 版本，如 6.0.0-rc.1。

```bash
$ tnpm install --install-node=4
$ tnpm install --install-node=10.1.0
$ tnpm install --install-node=6.0.0-rc.1
$ tnpm install --install-alinode=1.5.3
```

## 排查网络问题

如果你怀疑 tnpm 访问很慢，你可以先自行通过 `$ tnpm network` 命令排查。
如果还是觉得 tnpm 有问题，请将 network 的结果截图发送给 @苏千，打他脸。

```bash
$ tnpm network
```

## 内网代理

有一些环境无法访问公网，或者网络访问公网网速非常慢（如广州 UC 内网），
可以通过 `--internal-proxy` 参数走内部代理来下载文件。

- **注意：由于是代理模式，所以超大流量的场景，并不适用**

```bash
$ tnpm i --internal-proxy
```

内网代理服务器目前就是 `registry.npm.alibaba-inc.com` 所在的 et2sqa 机房服务器，通过 nginx 代理实现：

- newoss.npm.alibaba-inc.com CNAME => registry.npm.alibaba-inc.com
- oss.npm.alibaba-inc.com CNAME => registry.npm.alibaba-inc.com
- taobao-npm-oss.npm.alibaba-inc.com CNAME => registry.npm.alibaba-inc.com

```ini
server {
    listen 80;
    server_name oss.npm.alibaba-inc.com;

    location / {
        proxy_pass https://cn-hangzhou.oss.aliyun-inc.com;
        proxy_set_header Host cn-hangzhou.oss.aliyun-inc.com;
    }
}

server {
    listen 80;
    server_name newoss.npm.alibaba-inc.com;

    location / {
        proxy_pass https://alinpm.oss-cn-shanghai.aliyuncs.com;
        proxy_set_header Host alinpm.oss-cn-shanghai.aliyuncs.com;
    }
}

server {
    listen 80;
    server_name taobao-npm-oss.npm.alibaba-inc.com;

    location / {
        proxy_pass https://tnpm-hz.oss-cn-hangzhou.aliyuncs.com;
        proxy_set_header Host tnpm-hz.oss-cn-hangzhou.aliyuncs.com;
    }
}
```

## 常见问题

- Windows 下出现 [Cannot read property 'emit' of null](https://github.com/npm/npm/issues/7767) 异常的话，
升级一下 node>=0.12.2 [#26](https://gitlab.alibaba-inc.com/node/tnpm/issues/26)
- [WebStorm, VSCode 编辑器好卡，怎么办？](https://gitlab.alibaba-inc.com/node/tnpm/issues/130)
- [遇到 EACCES(permission denied) 异常提示怎么办？](https://yuque.antfin.com/chair/tnpm/how-to-install#uRZwo)
- [tnpm install 出现 Response timeout](https://lark.alipay.com/alinode/handbook/tnpm-install-timeout)

## tnpm@2 到 tnpm@4 的升级说明

tnpm@4 默认会使用 [npminstall](https://github.com/cnpm/npminstall) 进行模块依赖安装，
从此不会再有模块安装速度慢的吐槽了。

使用者无需做任何配置变更，只需要重新安装一下 tnpm 即可升级到最新版本。

如遇到任何问题，请反馈到[tnpm@4 升级问题收集](https://gitlab.alibaba-inc.com/node/tnpm/issues/130)。

## 使用 npm 安装支持 react-native 项目

由于 react-native 目前还不支持 link 方式依赖文件，所以我们提供了通过配置方式指定 npm 进行模块安装。

在 `package.json` 增加 `tnpm.mode = 'npm'` 的配置，即可告诉 tnpm 切换到 npm 模式进行安装。

```js
{
  "tnpm": {
    "mode": "npm"
  }
}
```

## 强制使用 npm 进行安装

当然，还有一些项目无法在 [npminstall 目录结构](https://github.com/cnpm/npminstall#node_modules-directory)正常工作，于是我们提供了兼容方案。
在 `package.json` 增加 `tnpm.mode = 'npm'` 的配置，即可告诉 tnpm 切换到 npm 模式进行安装。

```js
{
  "tnpm": {
    "mode": "npm"
  }
}
```

**注意**：非常不建议你的 node 应用这么做，除非你的应用真的无法升级，其他正常情况下遇到兼容问题，都可以找 @苏千 @不四 解决。

### 开启 package-lock.json 或者 yarn.lock

**注意**：前提是要在 npm 或者 yarn 安装模式下进行。

如果你非常清楚你需要开启 lockfile，那么可以通过 `--enable-lockfile` 参数保留 `package-lock.json` 和 `yarn.lock` 文件。

```js
$ tnpm i --by=npm --enable-lockfile
```

或者在 `package.json` 增加 `tnpm.lockfile = 'enable'` 的配置，即可告诉 tnpm 保留 lockfile 文件。

```js
{
  "tnpm": {
    "mode": "npm",
    "lockfile": "enable"
  }
}
```

也可以通过 `tnpm config` 进行设置，避免每次手动配置 `package.json`

```js
$ tnpm config set mode=npm
$ tnpm config set lockfile=enable
```

## 第三方 npm 模块紧急修复

如果你发现有第三方 npm 模块的版本出现 bug，并且需要立即回滚修复，可以给 [bug-versions](https://github.com/cnpm/bug-versions) 提交 PR 来马上修复。

具体 PR 操作步骤，可以参考 https://github.com/cnpm/bug-versions/pull/1 的过程。

并到「Ali Node.js 工作组」钉钉群联系管理员合并代码发布版本。

然后重新通过 `tnpm update` 就可以修复有问题的模块版本了。

## 覆盖子依赖版本

tnpm 和 yarn 一样支持 [selective version resolutions](https://yarnpkg.com/zh-Hans/docs/selective-version-resolutions)，通过 `package.json` 中的 `resolutions` 字段，覆盖子依赖的版本。

```json
{
  "name": "project",
  "version": "1.0.0",
  "dependencies": {
    "left-pad": "1.0.0",
    "c": "file:../c-1",
    "d2": "file:../d2-1"
  },
  "resolutions": {
    "d2/left-pad": "1.1.1",
    "c/**/left-pad": "1.1.2"
  }
}
```

使用时，每一个 resolutions 中的条目的 `key` 用于指定哪个模块，`value` 用于指定版本（支持 semver 和 tag）。常用的格式：

- `"debug": "3.2.0"`: 等价于 `"**/debug": "3.2.0"`，将所有子依赖的 `debug` 版本都设置为 `3.2.0`
- `"koa/debug": "latest"`: 将直接依赖的 koa 所依赖的 debug 版本设置为 `latest`
- `"**/koa/debug": "^3.2.0"`: 将项目依赖中所有的 koa 所依赖的 debug 版本设置为 `^3.2.0`

注意：`resolutions` 对直接依赖不生效，需要直接修改 `dependencies`。

## DEF、Aone 和 雨燕 构建环境下载静态安装的 tnpm 包

https://yuque.antfin.com/chair/tnpm/bk6igo

## 内部开源

非常欢迎大家来参与内部开源，贡献你想要的新特性！https://yuque.antfin.com/chair/tnpm/join-us

欢迎打赏一杯喜茶~

![赞助 tnpm 一杯喜茶](https://heyteapay.alipay.com/api/qr/1700001)

## Contributors(30)

Ordered by date of first contribution, by [ali-contributors](https://gitlab.alibaba-inc.com/node/ali-contributors).

- <a target="_blank" href="https://fengmk2.com"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/43624.40x40.xz.jpg"> @苏千</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=fengmk2"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 苏千</a>
- <a target="_blank" href="http://deadhorse.me"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/52624.40x40.xz.jpg"> @不四</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=deadhorse"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 不四</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/65840"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/65840.40x40.xz.jpg"> @唐瞻立</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E5%94%90%E7%9E%BB%E7%AB%8B"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E5%94%90%E7%9E%BB%E7%AB%8B&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="http://chuo.me"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/28761.40x40.xz.jpg"> @贯高</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=popomore"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 贯高 🎩</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/79744"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/79744.40x40.xz.jpg"> @潘旻琦</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E6%BD%98%E6%97%BB%E7%90%A6"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E6%BD%98%E6%97%BB%E7%90%A6&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/29865"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/29865.40x40.xz.jpg"> @渐飞</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=dearadam"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 渐飞</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/search?keywords=%E9%9B%A8%E7%BB%B4&type=person&offset=0&tabIndex=1"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/404.30x30.jpg"> @雨维</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E9%9B%A8%E7%BB%B4"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E9%9B%A8%E7%BB%B4&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/68955"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/68955.40x40.xz.jpg"> @宗羽</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E5%AE%97%E7%BE%BD"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E5%AE%97%E7%BE%BD&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/105338"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/105338.40x40.xz.jpg"> @明永华</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E6%98%8E%E6%B0%B8%E5%8D%8E"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E6%98%8E%E6%B0%B8%E5%8D%8E&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/79696"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/79696.40x40.xz.jpg"> @慕陶</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=etlx8r9"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 慕陶</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/143993"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/143993.40x40.xz.jpg"> @整型</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=zr37fdk"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 整型 👍</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/165715"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/165715.40x40.xz.jpg"> @桑绿</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=angelawang1605"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 桑绿</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/64637"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/64637.40x40.xz.jpg"> @弘树</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=dickeylth"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 弘树</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/111208"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/111208.40x40.xz.jpg"> @问號</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=viko16"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 文浩💯</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/search?keywords=JacksonTian&type=person&offset=0&tabIndex=1"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/404.30x30.jpg"> @JacksonTian</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=JacksonTian"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=JacksonTian&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/103765"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/103765.40x40.xz.jpg"> @楚怀</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E6%A5%9A%E6%80%80"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E6%A5%9A%E6%80%80&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/66518"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/66518.40x40.xz.jpg"> @叁儿</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E5%8F%81%E5%84%BF"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E5%8F%81%E5%84%BF&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/61392"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/61392.40x40.xz.jpg"> @七念</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E4%B8%83%E5%BF%B5"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E4%B8%83%E5%BF%B5&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/89488"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/89488.40x40.xz.jpg"> @天筑</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=atian25"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 天猪(天筑)</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/150550"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/150550.40x40.xz.jpg"> @死月</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E6%AD%BB%E6%9C%88"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E6%AD%BB%E6%9C%88&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/238884"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/238884.40x40.xz.jpg"> @昭朗</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=legendecas"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 吞吞</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/121758"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/121758.40x40.xz.jpg"> @芃程</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=yuyang041060120"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 芃(peng)程</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/157028"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/157028.40x40.xz.jpg"> @零弌</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=mx53epm"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 零弌(yī)</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/208715"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/208715.40x40.xz.jpg"> @宫城</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=grjy039"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 宫城</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/149198"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/149198.40x40.xz.jpg"> @天玎</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=gemwuu"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 吴珂-天玎</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/270950"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/270950.40x40.xz.jpg"> @理夫</a> <a target="_blank" href="http://amos.im.alisoft.com/msg.aw?v=2&site=cntaobao&s=2&charset=utf-8&uid=%E7%90%86%E5%A4%AB"><img style="vertical-align: middle;" width="20" src="http://amos.alicdn.com/online.aw?v=2&uid=%E7%90%86%E5%A4%AB&site=cntaobao&s=1&charset=utf-8"></a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/324903"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/324903.40x40.xz.jpg"> @阿藍</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=qiuyudongjlu"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 阿藍</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/336809"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/336809.40x40.xz.jpg"> @莽原</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=4w1_7o59y20r"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 莽原</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/193478"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/193478.40x40.xz.jpg"> @冬鸫</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=tiancaigaohua"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 冬鸫</a>
- <a target="_blank" href="https://work.alibaba-inc.com/work/u/149448"><img style="vertical-align: middle;" width="20" src="https://work.alibaba-inc.com/photo/149448.40x40.xz.jpg"> @梅霖</a> <a target="_blank" href="dingtalk://dingtalkclient/action/sendmsg?dingtalk_id=goxw37p"><img style="vertical-align: middle;" width="20" src="https://img.alicdn.com/tfs/TB18HtyiyqAXuNjy1XdXXaYcVXa-24-24.svg"> 梅霖</a>

--------------------
