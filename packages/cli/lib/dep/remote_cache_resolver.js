'use strict';

class RemoteCacheResolver {
  /**
   * @param {DepContext} ctx -
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.lockId = ctx.lockId;
  }

  async resolve() {
    throw new Error('remote cache resolver not implemented.');
  }
}

module.exports = RemoteCacheResolver;
