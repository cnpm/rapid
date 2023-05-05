'use strict';

class RemoteResolver {
  /**
   * @param {DepContext} ctx -
   * @param {Object} options -
   */
  constructor(ctx, options) {
    this.ctx = ctx;
    this.pkg = ctx.pkg;
  }

  async resolve() {
    throw new Error('remote resolver not implemented.');
  }
}

module.exports = RemoteResolver;
