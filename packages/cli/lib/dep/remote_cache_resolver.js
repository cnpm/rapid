'use strict';

class RemoteCacheResolver {
  /**
   * @param {DepContext} ctx -
   * @param {Object} options -
   */
  constructor(ctx, options) {
    this.ctx = ctx;
    this.lockId = ctx.lockId;
  }

  async resolve() {
    throw new Error('remote cache resolver not implemented.');
  }
}

module.exports = RemoteCacheResolver;
