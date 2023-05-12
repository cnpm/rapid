'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const execa = require('execa');
const {
  tarBucketsDir,
  unionfs,
  BOOTSTRAP_BIN,
} = require('../constants');
const {
  wrapSudo,
  getWorkdir,
  getAllPkgPaths,
} = require('../util');
const nydusdApi = require('./nydusd_api');

async function startNydusFs(cwd, pkg) {
  await Promise.all([
    nydusdApi.initDaemon(),
    generateBootstrapFile(cwd, pkg),
  ]);

  await mountNydus(cwd, pkg);

  console.time('[rapid] mount overlay');
  await mountOverlay(cwd, pkg);
  console.timeEnd('[rapid] mount overlay');
}

async function generateBootstrapFile(cwd, pkg) {
  console.time('[rapid] generate bootstrap');
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const { bootstrap, tarIndex } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(path.dirname(bootstrap), { recursive: true });
    await execa.command(`${BOOTSTRAP_BIN} --stargz-config-path=${tarIndex} --stargz-dir=${tarBucketsDir} --bootstrap=${bootstrap}`);
  }));
  console.timeEnd('[rapid] generate bootstrap');
}

async function mountNydus(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const { dirname, bootstrap } = await getWorkdir(cwd, pkgPath);
    console.time(`[rapid] mount '/${dirname}' to nydusd daemon using socket api`);
    await nydusdApi.mount(`/${dirname}`, cwd, bootstrap);
    console.timeEnd(`[rapid] mount '/${dirname}' to nydusd daemon using socket api`);
  }));
}

async function mountOverlay(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {

    const {
      upper,
      workdir,
      mnt,
      overlay,
      nodeModulesDir,
    } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.mkdir(overlay, { recursive: true });
    if (os.type() === 'Linux') {
      await execa.command(wrapSudo(`mount -t tmpfs tmpfs ${overlay}`));
    } else if (os.type() === 'Darwin') {
      await execa.command(wrapSudo(`mount_tmpfs -o union -e ${overlay}`));
    }
    await fs.mkdir(upper, { recursive: true });
    await fs.mkdir(workdir, { recursive: true });

    let shScript = wrapSudo(`mount \
-t overlay overlay \
-o lowerdir=${mnt},upperdir=${upper},workdir=${workdir} \
${nodeModulesDir}`);

    if (os.type() === 'Darwin') {
      shScript = `${unionfs} \
-o cow,max_files=32768 \
-o allow_other,use_ino,suid,dev \
${upper}=RW:${mnt}=RO \
${nodeModulesDir}`;
    }
    console.info('[rapid] mountOverlay: `%s`', shScript);
    await execa.command(shScript);
    console.info('[rapid] overlay mounted.');
  }));
}

async function endNydusFs(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {

    const {
      dirname,
      overlay,
      baseDir,
      nodeModulesDir,
    } = await getWorkdir(cwd, pkgPath);
    await execa.command(wrapSudo(`umount ${nodeModulesDir}`));
    await execa.command(wrapSudo(`umount ${overlay}`));
    await nydusdApi.umount(`/${dirname}`);
    // 清除 nydus 相关目录
    await fs.rm(baseDir, { recursive: true, force: true });
  }));
}

module.exports = {
  startNydusFs,
  endNydusFs,
};
