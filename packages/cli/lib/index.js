'use strict';

const fs = require('node:fs/promises');
const assert = require('node:assert');
const path = require('node:path');
const downloadDependency = require('./download_dependency');
const Scripts = require('./scripts').Scripts;
const DepResolver = require('./dep');
const {
  nydusdConfigFile,
  tarBucketsDir,
  NYDUS_TYPE,
} = require('./constants');
const {
  createNydusdConfigFile,
  shouldFuseSupport,
  getEnv,
} = require('./util');
const util = require('./util');
const nydusd = require('./nydusd');
const { MirrorConfig } = require('binary-mirror-config');

// 有依赖树（package-lock.json）走 npm / npminstall 极速安装
exports.install = async options => {
  if (options.update) {
    await exports.clean(options.cwd);
  }
  // set args to npm_config_xx env
  options.env = getEnv(options.env, options.args);
  const nydusMode = await nydusd.getNydusMode();
  if (nydusMode === NYDUS_TYPE.NONE) {
    await shouldFuseSupport();
  }

  const resolver = new DepResolver(options);
  const depsJSON = await resolver.resolve();
  if (options.packageLockOnly) {
    await util.saveLockFile(options.cwd, depsJSON, resolver.ctx.lockId);
    return;
  }

  const allPkgs = await util.getAllPkgPaths(options.cwd, options.pkg);
  await Promise.all(allPkgs.map(pkgPath => async () => {
    const { baseDir, tarIndex } = await util.getWorkdir(options.cwd, pkgPath);
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(path.dirname(tarIndex), { recursive: true });
  }));
  await fs.mkdir(tarBucketsDir, { recursive: true });
  await createNydusdConfigFile(nydusdConfigFile);
  const mirrorConfig = new MirrorConfig({
    console: global.console,
  });
  await mirrorConfig.init();
  mirrorConfig.setEnvs(options);

  options.scripts = new Scripts(options);
  options.depsTree = depsJSON;
  await downloadDependency.download(options);

  assert(Object.keys(depsJSON).length, '[rapid] depsJSON invalid.');
  await nydusd.startNydusFs(nydusMode, options.cwd, options.pkg);

  // 执行 lifecycle scripts
  console.time('[rapid] run lifecycle scripts');
  await options.scripts.runLifecycleScripts(mirrorConfig);
  console.timeEnd('[rapid] run lifecycle scripts');
  // 写入依赖树缓存
  const { depsJSONPath } = await util.getWorkdir(options.cwd);
  await fs.writeFile(depsJSONPath, JSON.stringify(depsJSON), 'utf8');
};

exports.clean = async function clean(cwd) {
  const mode = await nydusd.getNydusMode(cwd);
  await nydusd.endNydusFs(mode, cwd, readPkgJSON(cwd).pkg);
}
