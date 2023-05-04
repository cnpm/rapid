'use strict';

const Arborist = require('@npmcli/arborist');
const urllib = require('urllib');
const fs = require('node:fs/promises');
const path = require('node:path');
const debug = require('debug')('resolver');
const PackageService = require('./package_service');
const ArboristLogger = require('./arborist_logger');
const PACKAGE_SERVICE = Symbol.for('packageService');
const ROOT_PACKAGE = Symbol.for('rootPackage');

class LocalResolver {
  constructor(ctx, options) {
    const { registry, force, legacyPeerDeps, strictPeerDeps } = options;
    this.ctx = ctx;
    this.options = options;
    this.packageService = new PackageService(options);
    this.installOptions = {
      registry,
      force,
      legacyPeerDeps,
      strictPeerDeps,
    };
  }

  async storePackageLock(pkgLockJson) {
    try {
      const res = await urllib.request(
        // TODO 后续需要替换为 /submit
        `${this.ctx.npmcoreTreeURL}/debug`,
        {
          method: 'POST',
          timeout: 1000 * 60,
          retry: 3,
          dataType: 'json',
          contentType: 'json',
          data: {
            project: this.ctx.pkg,
            tree: pkgLockJson,
            installOptions: this.installOptions,
          },
        }
      );
      debug('[rapid] upload res', res.data);
      if (!res?.data?.success) {
        console.log('[rapid] upload faied, traceId: ', res?.headers?.['request-id']);
        throw new Error('upload package lock failed');
      }

      const treeId = res?.data?.data?.treeId;
      this.ctx.lockId = treeId;
      console.info('[rapid] 生成依赖树成功 treeId：%s，在线地址：%s', treeId, `${this.ctx.npmcoreTreeURL}/${treeId}`);
    } catch (e) {
      console.log('[rapid] upload package lock failed, skip');
    }
  }

  async resolve() {
    console.time('[rapid] generate deps tree');
    const pkgLockJson = await this.generatePackageLockJson(this.ctx.pkg);
    console.timeEnd('[rapid] generate deps tree');
    await this.storePackageLock(pkgLockJson);
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
    this.packageService.preload(pkgJson, true);
    const idealTree = await arborist.buildIdealTree({});
    const meta = idealTree.meta;
    const res = meta.commit();
    return res;
  }
}

module.exports = LocalResolver;
