tnpm
=======

> tnpm is the [private NPM registry](https://npm.alibaba-inc.com) client to replace `npm`

## Badges

[![TNPM version][tnpm-image]][tnpm-url]
[![TNPM downloads][tnpm-downloads-image]][tnpm-url]

[tnpm-image]: https://npm.alibaba-inc.com/badge/v/tnpm.svg
[tnpm-url]: https://npm.alibaba-inc.com/package/tnpm
[tnpm-downloads-image]: https://npm.alibaba-inc.com/badge/d/tnpm.svg

--------------------

## [中文文档](README.md)

## Getting Started

tnpm is recommended to be installed globally.

```bash
npm install tnpm -g --registry=https://registry.npm.alibaba-inc.com
```

If procedures described above failed, try:

```bash
npm i -g npminstall --registry=https://registry.npm.alibaba-inc.com
npminstall -g tnpm --registry=https://registry.npm.alibaba-inc.com
```

If that failed too, it's probably caused by `npm i -g` installation, during which `npm` tried to fix other globally installed modules, which in turn causes `npminstall` to fail.

In this situation, try install `npminstall` in the current directory, then install `tnpm`.

```bash
# To your home directory
cd ~
# Clear out global node modules
rm -rf node_modules
# Install NPM in your home directory
npm i npminstall --registry=https://registry.npm.alibaba-inc.com
# Use your home directory tnpm to install
./node_modules/.bin/npminstall -g tnpm --registry=https://registry.npm.alibaba-inc.com
# Use tnpm to install npminstall. It serves two purposes, one is to prevent tnpm from being deleted accidentally, the other is to use npminstall as a backup
tnpm i -g npminstall
# Remove the local node_modules and npminstall
rm -rf node_modules
```

## Usage

```bash
# Open tnpm website
$ tnpm web

# Check current dependencies version
$ tnpm check

# Commands are consistent with `npm`
$ tnpm info urllib

# Sync modules form `registry.npmjs.org`
$ tnpm sync connect mocha
$ tnpm sync #this will try to parse the package.json file, and sync package.name

# Sync public module from npmjs.org
$ tnpm sync connect

# Open module document page
$ tnpm doc hsf
```

### Publish to tnpm

Please see https://npm.alibaba-inc.com

### Install node with flag

You can install mainstream Node version by adding `install-node` flag like so:

> --install-node=4

`alinode` is available by adding `install-alinode` flag:

> --install-alinode=1.5.0

`nvs` is the recommended solution for installing multiple versions of Node.js in your environment. For further details, please see https://lark.alipay.com/alinode/handbook/env

```bash
$ tnpm install --install-node=4
$ tnpm install --install-node=4.4.1
$ tnpm install --install-node=6.0.0-rc.1
$ tnpm install --install-alinode=1.5.3
```

## Network troubleshooting

If you are experiencing slow network, run `$ tnpm network` to troubleshoot.
If such problem persists, please contact @suqian.yf on DingTalk.

```bash
$ tnpm network
```

## Internal proxy

For office environments where Internet access is limited, add `internal-proxy` flag to switch to internal proxy servers.

- **Note: this flag is not suitable for scenarios involving large downloads**

```bash
$ tnpm i --internal-proxy
```

Internal proxy servers are Nginx proxies to `registry.npm.alibaba-inc.com` in the `et2sqa` IDC. Here is a list of internal proxy domains and their Nginx configuration.

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

## FAQ

- Windows showing [Cannot read property 'emit' of null](https://github.com/npm/npm/issues/7767) error. Upgrade to node>=0.12.2 [#26](http://gitlab.alibaba-inc.com/node/tnpm/issues/26)
- [WebStorm, VSCode is really slow, what's wrong?](http://gitlab.alibaba-inc.com/node/tnpm/issues/130)
- [What do I do when I see EACCES(permission denied)](https://yuque.antfin.com/chair/tnpm/how-to-install#uRZwo)
- [tnpm install shows Response timeout](https://lark.alipay.com/alinode/handbook/tnpm-install-timeout)

## Upgrading from tnpm@2 to tnpm@4

tnpm@4 by default uses [npminstall](https://github.com/cnpm/npminstall) to install dependencies. There is no need to change your `package.json`, just upgrade tnpm. If you've encountered any problems, please leave a comment [here](https://gitlab.alibaba-inc.com/node/tnpm/issues/130).

## Installing `react-native` modules

`react-native` does not support soft-linked node_modules dependencies yet. In order to install this package, change your tnpm mode to `npm` like so:

```js
{
  "tnpm": {
    "mode": "npm"
  }
}
```

## Use npm for installation

There are certain packages that just won't work with tnpm because of their  [npminstall folder structure](https://github.com/cnpm/npminstall#node_modules-directory), so we provided a fallback solution with tnpm mode. By setting tnpm mode to `npm`, you're telling tnpm to install with npm.

**However, it's strongly advised against doing so** unless these modules can not be updated. For other scenarios, please contact @suqian.yf or @busi.hyy on DingTalk.

```js
{
  "tnpm": {
    "mode": "npm"
  }
}
```

### Use lockfile

**Note**: You need to be in `npm` or `yarn` mode.

If you have to use version lock, add `enable-lockfile` flag to keep `package-lock.json` and `yarn.lock` after installation.

```js
$ tnpm i --by=npm --enable-lockfile
```

Or make the following changes in your `package.json`

```js
{
  "tnpm": {
    "mode": "npm",
    "lockfile": "enable"
  }
}
```

You also can set mode by `tnpm config`，avoid change `package.json` manually.

```js
$ tnpm config set mode=npm
$ tnpm config set lockfile=enable
```

## Third-party npm module hotfix

If bugs from third-party module require hotfix, you can submit a pull request to [bug-versions](https://github.com/cnpm/bug-versions). For step-by-step detailed instruction, please see https://github.com/cnpm/bug-versions/pull/1.

After you've done that, please contact the administrators in DingDing Group 11766148 [Ali Node.js 工作组] to merge.

Afterwards, run `tnpm update` to reinstall the modules.

## Selective Version Resolutions

tnpm support [selective version resolutions](https://yarnpkg.com/en/docs/selective-version-resolutions) like yarn, which lets you define custom package versions inside your dependencies through the `resolutions` field in your `package.json` file.

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

When using resolutions, every `key` in the entry specified the dependency, every `value` in the entry specified the version(support semver or tag). Some common formats:

- `"debug": "3.2.0"`: equal to `"**/debug": "3.2.0"`, set all nested dependencies `debug`'s version to `3.2.0`
- `"koa/debug": "latest"`: set the direct dependency koa's dependency debug version to `latest`
- `"**/koa/debug": "^3.2.0"`: set all koa's dependency debug version to `^3.2.0`

Notice: `resolutions` don't take effect with direct dependency.

---

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
