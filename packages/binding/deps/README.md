# 依赖描述

由于 rapid-binding 中使用了 reqwest, 默认 openssl 采用动态链接的方式，而不同镜像中 opensll 很可能是不同版本的，会导致运行时失败，因此需要采用静态链接的方式。
而目前 CI 镜像中使用的 openssl 是 openssl-1.0.2k 版本，无法编译成功。因为采用手动编译 openssl-1.1.0p 的方式来支持。

## 编译方式
```shell
tar -xzf openssl-1.1.1p.tar.gz
cd openssl-1.1.1p
./config --prefix=/usr/local/ssl --openssldir=/usr/local/ssl shared zlib
make
make test
make install
```

## 打包
```shell
tar -czf openssl-1.1.1.tgz -C /usr/local/ssl .
```
