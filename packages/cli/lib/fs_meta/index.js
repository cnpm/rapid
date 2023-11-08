'use strict';

// 在 rust 中统一处理不同的 fsMeta 差异
const { FsMetaBuilder } = require('@cnpmjs/binding');

class FsMeta {
  constructor() {
    // 传入一个比较纯粹的 BlobInfo 序列化结构
    // 在 rust 中进行相关逻辑处理
    this.builder = new FsMetaBuilder();

    return this.builder;
  }

  async generate(pkgLockJson, pkgPath = '') {
    return await this.builder.generate(pkgLockJson, pkgPath);
  }

}

module.exports = FsMeta;
