'use strict';

const assert = require('node:assert');
const NpmFsBuilder = require('./npm_fs_builder');
const TnpmFsBuilder = require('./tnpm_fs_builder');
const { NpmFsMode } = require('../constants');
const { Bar } = require('../logger');

class NpmFs {
  /**
   * @param {NpmBlobManager} blobManager -
   * @param {object} [options] -
   * @param {string} [options.mode] -
   * @param {number} [options.uid] -
   * @param {number} [options.gid] -
   */
  constructor(blobManager, options) {
    this.blobManager = blobManager;
    this.bar = new Bar({
      type: 'FsMeta',
      total: Object.keys(options.depsTree.packages).length,
    });

    this.options = Object.assign({
      uid: process.getuid(),
      gid: process.getgid(),
      mode: NpmFsMode.NPM,
      entryListener: entry => {
        this.bar.update(entry);
      },
    }, options);
  }

  get mode() {
    return this.options.mode;
  }

  async getFsMeta(pkgLockJson, pkgPath = '') {
    const builderClazz = this._getFsMetaBuilder();
    const builder = new builderClazz(this.blobManager, this.options);
    return await builder.generateFsMeta(pkgLockJson, pkgPath);
  }

  _getFsMetaBuilder() {
    switch (this.mode) {
      case NpmFsMode.NPM:
        return NpmFsBuilder;
      case NpmFsMode.NPMINSTALL:
        return TnpmFsBuilder;
      default:
        assert.fail(`npm fs mode: ${this.mode} not impl`);
    }
  }
}

module.exports = NpmFs;
