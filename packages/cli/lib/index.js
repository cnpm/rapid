'use strict';

const fs = require('node:fs/promises');
const assert = require('node:assert');
const path = require('node:path');
const downloadDependency = require('./download_dependency');
const Scripts = require('./scripts').Scripts;
const {
  nydusdConfigFile,
  tarBucketsDir,
  NYDUS_TYPE,
} = require('./constants');
const util = require('./util');
const nydusd = require('./nydusd');
const nydusdApi = require('./nydusd/nydusd_api');
const { MirrorConfig } = require('binary-mirror-config');

// 有依赖树（package-lock.json）走 npm / npminstall 极速安装
exports.install = async options => {
  options.env = util.getEnv(options.env, options.args);

  if (!options.noPackageLock) {
    await util.generatePackageLock(options.cwd);
  }

  const { packageLock } = options.packageLock || (await util.readPackageLock(options.cwd));

  const currentMountInfo = await util.listMountInfo();

  const allPkgs = await util.getAllPkgPaths(options.cwd, options.pkg);

  for (const pkgPath of allPkgs) {
    const { baseDir, tarIndex, nodeModulesDir } = await util.getWorkdir(options.cwd, pkgPath);

    const mountedInfo = currentMountInfo.find(item => item.mountPoint === nodeModulesDir);

    if (mountedInfo) {
      console.time(`[rapid] ${nodeModulesDir} already mounted, try to clean`);
      await exports.clean({
        nydusMode: options.nydusMode,
        cwd: mountedInfo.mountPoint,
        pkg: options.pkg,
        force: true,
      });
      console.timeEnd(`[rapid] ${nodeModulesDir} already mounted, try to clean`);
    }

    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(path.dirname(tarIndex), { recursive: true });
  }

  await fs.mkdir(tarBucketsDir, { recursive: true });
  await util.createNydusdConfigFile(nydusdConfigFile);
  const mirrorConfig = new MirrorConfig({
    console: global.console,
  });
  await mirrorConfig.init();
  mirrorConfig.setEnvs(options);

  options.scripts = new Scripts(options);
  options.depsTree = packageLock;
  await downloadDependency.download(options);

  assert(Object.keys(packageLock).length, '[rapid] depsJSON invalid.');
  await nydusd.startNydusFs(options.nydusMode, options.cwd, options.pkg);


  await util.ensureAccess(options.cwd, packageLock);

  // 存放原始依赖树，用于 npm 二次更新依赖
  await util.storePackageLock(options.cwd, packageLock);

  console.time('[rapid] run lifecycle scripts');
  await options.scripts.runLifecycleScripts(mirrorConfig);
  console.timeEnd('[rapid] run lifecycle scripts');
};

exports.clean = async function clean({ nydusMode = NYDUS_TYPE.FUSE, cwd, force, pkg }) {
  const listInfo = await util.listMountInfo();
  if (!listInfo.length) {
    console.log('[rapid] no mount info found.');
    return;
  }

  if (cwd.endsWith('node_modules') || cwd.endsWith('node_modules/')) {
    cwd = path.dirname(cwd);
  }

  if (!pkg) {
    const pkgRes = await util.readPkgJSON(cwd);
    pkg = pkgRes.pkg;
  }

  await nydusd.endNydusFs(nydusMode, cwd, pkg, force);
};

exports.list = async () => {
  const running = await nydusdApi.isDaemonRunning();
  if (!running) {
    console.warn('[rapid] nydusd is not running, please run `rapid install` first.');
  }
  const listInfo = await util.listMountInfo();
  if (!listInfo.length) {
    console.log('[rapid] no mount info found.');
    return;
  }
  // 不展示 overlay 信息
  console.table(listInfo.filter(_ => _.mountPoint.endsWith('node_modules')));
};
