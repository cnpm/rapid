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

  // 需要串行 mount，并发创建时 nydusd 会出现问题
  for (const pkgPath of allPkgs) {
    const { dirname, bootstrap } = await getWorkdir(cwd, pkgPath);
    console.time(`[rapid] mount '/${dirname}' to nydusd daemon using socket api`);
    await nydusdApi.mount(`/${dirname}`, cwd, bootstrap);
    console.timeEnd(`[rapid] mount '/${dirname}' to nydusd daemon using socket api`);
  }
}

async function mountOverlay(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  for (const pkgPath of allPkgs) {

    const {
      upper,
      workdir,
      mnt,
      overlay,
      nodeModulesDir,
      volumeName,
      tmpDmg,
    } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.mkdir(overlay, { recursive: true });
    await fs.mkdir(mnt, { recursive: true });
    if (os.type() === 'Linux') {
      await execa.command(wrapSudo(`mount -t tmpfs tmpfs ${overlay}`));
    } else if (os.type() === 'Darwin') {
      // hdiutil create -size 512m -fs "APFS" -volname "NewAPFSDisk" -type SPARSE -layout NONE -imagekey diskimage-class=CRawDiskImage loopfile.dmg
      await fs.rm(tmpDmg, { force: true });
      await execa.command(`hdiutil create -size 512m -fs APFS -volname ${volumeName} -type SPARSE -layout NONE -imagekey diskimage-class=CRawDiskImage ${tmpDmg}`);
      await execa.command(`hdiutil attach -mountpoint ${overlay} ${tmpDmg}`);
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
    console.time('[rapid] overlay mounted.');
    await execa.command(shScript);
    console.timeEnd('[rapid] overlay mounted.');
  }
}

async function endNydusFs(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  for (const pkgPath of allPkgs) {
    const {
      dirname,
      overlay,
      baseDir,
      nodeModulesDir,
    } = await getWorkdir(cwd, pkgPath);
    if (os.type() === 'Darwin') {
      console.log(`[rapid] umount ${nodeModulesDir}`);
      await execa.command(`umount ${nodeModulesDir}`);
      // hdiutil detach
      await execa.command(`hdiutil detach ${overlay}`);
    } else {
      await execa.command(wrapSudo(`umount ${nodeModulesDir}`));
      await execa.command(wrapSudo(`umount ${overlay}`));
    }
    await nydusdApi.umount(`/${dirname}`);
    // 清除 nydus 相关目录
    await fs.rm(baseDir, { recursive: true, force: true });
  }
}

module.exports = {
  startNydusFs,
  endNydusFs,
};
