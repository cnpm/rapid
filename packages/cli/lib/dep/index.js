'use strict';

const DepContext = require('./dep_context');
const RemoteCacheResolver = require('./remote_cache_resolver');
const RemoteResolver = require('./remote_resolver');
const LocalResolver = require('./local_resolver');
const LocalCacheResolver = require('./local_cache_resolver');

// 依赖树解析优先级：
// 0. 指定的 lockId
// 1. 指定的本地依赖
// 2. 服务端生成依赖
class DepResolver {
  /**
   * @param {object} options -
   * @param {string} options.cwd - 当前目录
   * @param {string} [options.cacheDir] - pacote cacheDir
   * @param {string} [options.registry] - pacote registry
   * @param {string} [options.experimentalLocalResolver] - 实验性本地依赖解析器
   * @param {string} [options.downloader] - LocalResolver 预下载用
   * @param {string} options.pkg - 当前项目 package.json
   * @param {string} options.lockId - 指定 lockId 来获取依赖树
   * @param {string} options.depsTreePath - 本地依赖树缓存路径
   * @param {object} options.update: 对比 package.json 是否有变化，更新依赖树
   * @param {boolean} options.all: 更新全部依赖，默认 false
   * @param {Array<string>} options.names: 更新指定依赖
   */
  constructor(options) {
    this.options = options;
    this.ctx = new DepContext(options);
  }

  async resolve() {
    if (this.ctx.lockId) {
      // 本地安装时，直接通过 npm 执行安装和更新依赖树逻辑
      if (this.options.experimentalLocalResolver) {
        console.log('[rapid] use local resolver to update deps tree');
        const resolver = new LocalResolver(this.ctx, this.options);
        return resolver.resolve();
      }
      // rapid i lodash.has --lockId=xx 或者 node_modules/.lock-id.txt 存在
      // 在对应 lockId 的基础上进行依赖树的更新
      if (this.ctx.modifyDeps || this.ctx.updateLockfile) {
        console.log('[rapid] use remote resolver to update deps tree');
        const resolver = new RemoteResolver(this.ctx, this.options);
        return resolver.resolve();
      }
      // 根据 lockId 去读取服务端的依赖树
      try {
        console.log(`[rapid] use remote cache resolver to resolve lockId: ${this.ctx.lockId}`);
        const resolver = new RemoteCacheResolver(this.ctx, this.options);
        return await resolver.resolve();
      } catch (e) {
        e.message = `resolve with lockId: ${this.ctx.lockId} failed: ` + e.message;
        console.warn(e);
      }
    }
    // 本地依赖树缓存存在 直接读取本地文件
    if (this.ctx.depsTreePath) {
      try {
        console.log(`[rapid] use local cache resolver to resolve deps tree: ${this.ctx.depsTreePath}`);
        const resolver = new LocalCacheResolver(this.ctx, this.options);
        return await resolver.resolve();
      } catch (e) {
        e.message = `resolve with package-lock.json: ${this.ctx.depsTreePath} failed: ` + e.message;
        console.warn(e);
      }
    }
    let resolver;
    if (this.options.experimentalLocalResolver) {
      // 在本地通过 http 接口生成依赖树
      console.log('[rapid] use local resolver to generate deps tree');
      resolver = new LocalResolver(this.ctx, this.options);
    } else {
      // 在服务端生成依赖树
      console.log('[rapid] use remote resolver to generate deps tree');
      resolver = new RemoteResolver(this.ctx, this.options);
    }
    return await resolver.resolve();
  }
}

module.exports = DepResolver;
