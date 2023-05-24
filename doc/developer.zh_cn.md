# 快速开始

## 前置准备
- nginx: 使用 nginx 来托管 tar 文件，提供给用例下载；
- npm: 请使用 9.x npm。

## 构建
```shell
# 安装依赖
npm i

# 环境准备，rust 构建与用例下载
npm run build
```

## node 单测
可以在 `packages/cli/test` 下添加用例，我们使用 mocha 对用例进行测试。

```shell
# 运行 lint 与单测
npm run test

# 仅运行单测
npm run test-only
```

## node 集成测试
可以在 `integration` 下添加用例，我们使用 mocha 对用例进行测试。

```shell
npm run test:integration
```

## rust 单测
```shell
npm run test:rust
```

## 发布

### 创建发布分支

```shell
git checkout -b 'release/${version}'

npm run version

git push -u origin 'release/${version}'
```

### 创建 PR
创建 PR 到 master 分支，等待 CI 测试通过。

### 触发发布
```shell
git push origin ${version}
```
