'use strict';

const Arborist = require('@npmcli/arborist');
const ArboristLogger = require('./arborist_logger');
const PACKAGE_SERVICE = Symbol.for('packageService');
const ROOT_PACKAGE = Symbol.for('rootPackage');

class LocalResolver {
  constructor(ctx, options) {
    const { registry, force, legacyPeerDeps, strictPeerDeps } = options;
    this.ctx = ctx;
    this.options = options;
    this.installOptions = {
      registry,
      force,
      legacyPeerDeps,
      strictPeerDeps,
    };
  }

  async resolve() {
    console.time('[rapid] generate deps tree');
    const pkgLockJson = await this.generatePackageLockJson(this.ctx.pkg);
    console.timeEnd('[rapid] generate deps tree');
    return pkgLockJson;
  }

  async generatePackageLockJson(pkgJson) {
    const { registry, force, legacyPeerDeps, strictPeerDeps } = this.options;
    const arboristOptions = {
      nodeVersion: pkgJson.engines && pkgJson.engines.node,
      npmVersion: pkgJson.engines && pkgJson.engines.npm,
      // arborist 仍然会读取 cwd 下的 pkg.json 进行依赖计算
      path: this.ctx.cwd,
      cache: this.options.cacheDir,
      log: new ArboristLogger(),
      update: this.options.update,
      strictSSL: false,
      lockfileVersion: 3,
      force,
      registry,
      legacyPeerDeps,
      strictPeerDeps,
      ...this.options.arboristOptions,
      [PACKAGE_SERVICE]: this.packageService,
      [ROOT_PACKAGE]: pkgJson,
    };

    const arborist = new Arborist(arboristOptions);
    const idealTree = await arborist.buildIdealTree({});
    const meta = idealTree.meta;
    const res = meta.commit();
    return res;
  }
}

module.exports = LocalResolver;
