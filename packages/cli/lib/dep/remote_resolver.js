'use strict';

class RemoteResolver {
  /**
   * @param {DepContext} ctx -
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.pkg = ctx.pkg;
  }

  async resolve() {
    throw new Error('remote resolver not implemented.');
  }
}

module.exports = RemoteResolver;
