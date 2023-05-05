'use strict';

/**
 * 依赖计算上下文
 */
class DepContext {
  /**
   * @param {object} options -
   * @param {string} options.cwd - 当前目录
   * @param {string} options.cwd - 当前项目 package.json
   * @param {string} options.lockId - 指定 lockId 来获取依赖树
   * @param {string} options.depsTreePath - 本地依赖树缓存路径
   * @param {object} options.update: 对比 package.json 是否有变化，更新依赖树
   * @param {boolean} options.all: 更新全部依赖，默认 false
   * @param {Array<string>} options.names: 更新指定依赖
   * @param {Array<string>} options.deps 安装新依赖
   * @param {string} options.registry: 指定 registry
   * @param {boolean} options.updateLockfile: 更新依赖树
   */
  constructor(options) {
    this.cwd = options.cwd;
    this.lockId = options.lockId;
    this.depsTreePath = options.depsTreePath;
    this.pkg = options.pkg;
    this.update = options.update || {
      all: false,
      names: options.names?.length > 0 ? options.names : [],
    };

    this.arboristOptions = {
      registry: options.registry || 'https://registry.npmjs.org',
      force: options.force,
      legacyPeerDeps: options.legacyPeerDeps,
      strictPeerDeps: options.strictPeerDeps,
    };

    this.modifyDeps = options.modifyDeps;
    this.updateLockfile = options.updateLockfile;
  }
}

module.exports = DepContext;
