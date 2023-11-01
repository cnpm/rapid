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
const { Bar } = require('../logger');

async function startNydusFs(cwd, pkg) {
  await nydusdApi.initDaemon();

  console.log('[rapid] generate bootstrap');
  await generateBootstrapFile(cwd, pkg);

  console.log('[rapid] mount nydusd');
  await mountNydus(cwd, pkg);

  console.log('[rapid] mount overlay, it may take a few seconds');
  await mountOverlay(cwd, pkg);
}

async function generateBootstrapFile(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const bar = new Bar({ type: 'bootstrap', total: allPkgs.length });
  await Promise.all(allPkgs.map(async pkgPath => {
    const { bootstrap, tarIndex, nodeModulesDir } = await getWorkdir(cwd, pkgPath);
    await fs.mkdir(path.dirname(bootstrap), { recursive: true });
    await execa.command(`${BOOTSTRAP_BIN} --stargz-config-path=${tarIndex} --stargz-dir=${tarBucketsDir} --bootstrap=${bootstrap}`);
    bar.update(nodeModulesDir);
  }));
  bar.stop();
}

async function mountNydus(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);

  const bar = new Bar({
    type: 'mount',
    total: allPkgs.length,
  });

  // 需要串行 mount，并发创建时 nydusd 会出现问题
  for (const pkgPath of allPkgs) {
    const { dirname, bootstrap } = await getWorkdir(cwd, pkgPath);
    await nydusdApi.mount(`/${dirname}`, cwd, bootstrap);
    bar.update(dirname);
  }
  bar.stop();
}

async function mountOverlay(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  const bar = new Bar({
    type: 'overlay',
    total: allPkgs.length,
  });
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
    // console.info('[rapid] mountOverlay: `%s`', shScript);
    await execa.command(shScript);
    bar.update(nodeModulesDir);
  }));
  bar.stop();
}

async function endNydusFs(cwd, pkg, force = true) {
  await nydusdApi.initDaemon();
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
            console.log(`[rapid] use fallback umount -f ${overlay}`);
            await execa.command(`umount -f ${overlay}`);
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
