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
  wrapRetry,
  listMountInfo,
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
  await Promise.all(allPkgs.map(async pkgPath => {
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
      await wrapRetry({
        cmd: async () =>
          await execa.command(wrapSudo(`mount -t tmpfs tmpfs ${overlay}`)),
      });
    } else if (os.type() === 'Darwin') {
      // hdiutil create -size 512m -fs "APFS" -volname "NewAPFSDisk" -type SPARSE -layout NONE -imagekey diskimage-class=CRawDiskImage loopfile.dmg
      await fs.rm(tmpDmg, { force: true });
      await wrapRetry({
        cmd: async () =>
          await execa.command(
            `hdiutil create -size 512m -fs APFS -volname ${volumeName} -type SPARSE -layout NONE -imagekey diskimage-class=CRawDiskImage ${tmpDmg}`
          ),
      });
      await wrapRetry({
        cmd: async () => await execa.command(`hdiutil attach -mountpoint ${overlay} ${tmpDmg}`),
      });
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
    console.time(`[rapid] overlay ${overlay} mounted.`);
    await execa.command(shScript);
    console.timeEnd(`[rapid] overlay ${overlay} mounted.`);
  }));
}

async function endNydusFs(cwd, pkg, force = false) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const umountCmd = force ? 'umount -f' : 'umount';
  await Promise.all(allPkgs.map(async pkgPath => {
    const { dirname, overlay, baseDir, nodeModulesDir } = await getWorkdir(
      cwd,
      pkgPath
    );
    if (os.type() === 'Darwin') {
      await wrapRetry({
        cmd: async () => {
          const currentMountInfo = await listMountInfo();
          const mounted = currentMountInfo.find(
            item => item.mountPoint === nodeModulesDir
          );
          if (!mounted) {
            console.log(`[rapid] ${nodeModulesDir} is unmounted, skip`);
            return;
          }
          await execa.command(`umount ${nodeModulesDir}`);
        },
        fallback: force
          ? async () => {
            // force 模式再次尝试
            await execa.command(`umount -f ${nodeModulesDir}`);
          }
          : undefined,
      });

      await wrapRetry({
        cmd: async () => {
          const listInfo = await execa.command(
            `hdiutil info | grep ${overlay} || echo ""`,
            {
              shell: true,
            }
          );
          if (!listInfo.stdout) {
            return;
          }
          await execa.command(`hdiutil detach ${overlay}`);
        },
        fallback: force
          ? async () => {
            await execa.command(`hdiutil detach -force ${overlay}`);
          }
          : undefined,
      });
    } else {
      await wrapRetry({
        cmd: () => execa.command(wrapSudo(`${umountCmd} ${nodeModulesDir}`)),
      });
      await wrapRetry({
        cmd: () => execa.command(wrapSudo(`${umountCmd} ${overlay}`)),
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
