'use strict';

const util = require('node:util');

class RemoteCacheResolver {
  /**
   * @param {DepContext} ctx -
   * @param {Object} options -
   */
  constructor(ctx, options) {
    this.ctx = ctx;
    this.lockId = ctx.lockId;
    this.httpclient = options.httpclient;
  }

  async resolve() {
    console.time('[rapid] resolve cached deps tree');
    const res = await this.httpclient.request(this.ctx.depsTreeURL, {
      method: 'GET',
      dataType: 'json',
      timeout: 120000,
    });
    console.timeEnd('[rapid] resolve cached deps tree');
    // TODO 打印 traceId
    if (res.status !== 200) {
      throw new Error(`get dep tree ${this.lockId} from npmcore failed status code ${res.status}`);
    }
    const depsResult = res && res.data || {};
    if (!depsResult.success || !depsResult.data || !depsResult.data.tree) {
      const msg = util.format('get tree %s failed %j', this.lockId, depsResult.error);
      throw new Error(msg);
    }
    console.info('[rapid] 读取缓存依赖树成功，treeId：%s, 在线地址：%s', this.lockId, `${this.ctx.depsTreeURL}`);
    return depsResult.data.tree;
  }
}

module.exports = RemoteCacheResolver;
