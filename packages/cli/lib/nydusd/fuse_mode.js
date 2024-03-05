'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const execa = require('execa');
const {
  tarBucketsDir,
  unionfs,
  BOOTSTRAP_BIN,
  socketPath,
  nydusdMnt,
} = require('../constants');
const {
  wrapSudo,
  getWorkdir,
  getAllPkgPaths,
  wrapRetry,
  // listMountInfo,
} = require('../util');
const nydusdApi = require('./nydusd_api');
const { Bar } = require('../logger');
const { delProject, initDeamon } = require('../deamon');

const getProjectName = cwd => {
  const folderName = path.basename(cwd);
  const hash = crypto.createHash('md5').update(folderName).digest('hex');
  const hashedFolderName = `${folderName}_${hash}`;

  return hashedFolderName;
};

async function startNydusFs(cwd, pkg, daemon) {
  await nydusdApi.initDaemon();

  if (daemon) {
    await initDeamon();
  }

  const deamonConfig = {
    projectName: getProjectName(cwd),
    projectPath: cwd,
  };

  console.log('[rapid] generate bootstrap');
  await generateBootstrapFile(cwd, pkg, deamonConfig);

  if (os.type() === 'Darwin') {
    console.log('[rapid] init overlay, it may take a few seconds');
    await macosOverlayInit(cwd, pkg, deamonConfig);
  }

  console.log('[rapid] mount nydusd');
  await mountNydus(cwd, pkg, deamonConfig);

  if (os.type() === 'Linux') {
    console.log('[rapid] mount overlay, it may take a few seconds');
    await mountOverlay(cwd, pkg, deamonConfig);
  }

  return deamonConfig;
}

async function generateBootstrapFile(cwd, pkg, config) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const bar = new Bar({ type: 'bootstrap', total: allPkgs.length });
  const bootstraps = [];
  await Promise.all(allPkgs.map(async pkgPath => {
    const { bootstrap, tarIndex, nodeModulesDir } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(path.dirname(bootstrap), { recursive: true });
    await execa.command(`${BOOTSTRAP_BIN} --stargz-config-path=${tarIndex} --stargz-dir=${tarBucketsDir} --bootstrap=${bootstrap}`);
    bootstraps.push({
      bootstrapBin: BOOTSTRAP_BIN,
      stargzConfigPath: tarIndex,
      stargzDir: tarBucketsDir,
      bootstrap,
    });
    bar.update(nodeModulesDir);
  }));
  bar.stop();
  config.bootstraps = bootstraps;
}

async function mountNydus(cwd, pkg, config) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);

  const mounts = [];

  const bar = new Bar({
    type: 'mount',
    total: allPkgs.length,
  });

  // 需要串行 mount，并发创建时 nydusd 会出现问题
  for (const pkgPath of allPkgs) {
    const { dirname, bootstrap, nodeModulesDir } = await getWorkdir(cwd, pkgPath);

    const nydusdConfig = await nydusdApi.mount(`/${dirname}`, cwd, bootstrap);
    mounts.push({
      mountpoint: `${dirname}`,
      socketPath,
      bootstrap,
      nydusdConfig: JSON.parse(nydusdConfig),
      nodeModulesDir,
    });
    if (os.type() === 'Darwin') {
      await execa.command(`ln -s ${path.join(nydusdMnt, dirname)} ${nodeModulesDir}`);
    }
    bar.update(dirname);
  }
  bar.stop();
  config.nydusdApiMount = mounts;
}

async function macosOverlayInit(cwd, pkg, config) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const bar = new Bar({
    type: 'overlay',
    total: allPkgs.length,
  });
  const overlays = [];
  await Promise.all(allPkgs.map(async pkgPath => {
    const {
      upper,
      workdir,
      mnt,
      overlay,
      nodeModulesDir,
    } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(overlay, { recursive: true });
    await fs.mkdir(upper, { recursive: true });
    await fs.mkdir(workdir, { recursive: true });
    await fs.chmod(upper, 0o777);
    await fs.chmod(workdir, 0o777);
    const overlayConfig = {
      unionfs,
      upper,
      mnt,
      nodeModulesDir,
      overlay,
      workdir,
    };
    bar.update(nodeModulesDir);
    overlays.push(overlayConfig);
  }));
  bar.stop();
  config.overlays = overlays;
}

async function mountOverlay(cwd, pkg, config) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const bar = new Bar({
    type: 'overlay',
    total: allPkgs.length,
  });
  const overlays = [];
  await Promise.all(allPkgs.map(async pkgPath => {
    const {
      upper,
      workdir,
      mnt,
      overlay,
      nodeModulesDir,
      // volumeName,
      tmpDmg,
    } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.mkdir(overlay, { recursive: true });
    await fs.mkdir(mnt, { recursive: true });
    await wrapRetry({
      cmd: async () =>
        await execa.command(wrapSudo(`mount -t tmpfs tmpfs ${overlay}`)),
      title: 'mount tnpmfs',
    });
    await fs.mkdir(upper, { recursive: true });
    await fs.mkdir(workdir, { recursive: true });
    let overlayConfig = {};
    const shScript = wrapSudo(`mount \
-t overlay overlay \
-o lowerdir=${mnt},upperdir=${upper},workdir=${workdir} \
${nodeModulesDir}`);
    overlayConfig = {
      workdir,
      upper,
      mnt,
      nodeModulesDir,
      tmpDmg,
      overlay,
    };

    // console.log('[rapid] mountOverlay: `%s`', shScript);
    await execa.command(shScript);
    bar.update(nodeModulesDir);
    overlays.push(overlayConfig);
  }));
  bar.stop();
  config.overlays = overlays;
}

async function endNydusFs(cwd, pkg, force = true, daemon) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const umountCmd = force ? 'umount -f' : 'umount';
  if (daemon) {
    await delProject(getProjectName(cwd));
  }
  await Promise.all(allPkgs.map(async pkgPath => {
    const { dirname, overlay, baseDir, nodeModulesDir } = await getWorkdir(
      cwd,
      pkgPath
    );
    if (os.type() === 'Darwin') {
      await fs.rm(nodeModulesDir, { recursive: true, force: true });
    } else {
      await wrapRetry({
        cmd: () => execa.command(wrapSudo(`${umountCmd} ${nodeModulesDir}`)),
        title: 'umount node_modules',
      });
      await wrapRetry({
        cmd: () => execa.command(wrapSudo(`${umountCmd} ${overlay}`)),
        title: 'umount node_modules',
      });
    }
    await nydusdApi.umount(`/${dirname}`);
    // 清除 nydus 相关目录
    await fs.rm(baseDir, { recursive: true, force: true });
  }));
}

module.exports = {
  startNydusFs,
  endNydusFs,
};
