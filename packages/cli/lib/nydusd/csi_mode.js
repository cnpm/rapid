'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const execa = require('execa');
const constants = require('../constants');
const {
  wrapSudo,
  getWorkdir,
  getAllPkgPaths,
} = require('../util');

/**
 * @param {string} cwd current working dir
 * @param {object} pkg package.json
 * @return {Promise<void>} undefined
 * @return {Promise<void>}
 */
async function startNydusFs(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);

  console.time('[rapid] mv blob data');
  await moveBlobToData(cwd);
  console.timeEnd('[rapid] mv blob data');

  console.time('[rapid] generate bootstrap');
  await generateBootStrap(cwd, allPkgs);
  console.timeEnd('[rapid] generate bootstrap');

  console.time('[rapid] mount csi');
  await mount(cwd, allPkgs);
  console.timeEnd('[rapid] mount csi');

  console.time('[rapid] mount overlay');
  await linkToCurrent(cwd, allPkgs);
  console.timeEnd('[rapid] mount overlay');
}

/**
 * @param {string } cwd current working dir
 * @param {atring[]} allPkgs all package paths
 * @return {Promise<string[]>} mount id
 */
async function mount(cwd, allPkgs) {
  const socketPath = process.env[constants.NYDUS_CSI_SOCKET_ENV];
  const volumeId = process.env[constants.NYDUS_CSI_VOLUME_ID_ENV];

  await Promise.all(allPkgs.map(async pkgPath => {
    const { dirname, bootstrap, csiMountId } = await getWorkdir(cwd, pkgPath, constants.NYDUS_CSI_BLOB_ROOT);
    console.time(`[rapid] mount '/${dirname}' to nydusd daemon using socket api`);
    const {
      stderr,
    } = await execa.command(wrapSudo(`${process.execPath} ${path.join(__dirname, './csi_script.js')} ${path.basename(bootstrap)} ${volumeId} ${socketPath} ${csiMountId}`), {
      stdio: 'pipe',
    });

    if (stderr) {
      console.log(stderr.toString());
      const e = new Error('[rapid] mount nydus failed in csi mode');
      e.stderr = stderr;
      throw e;
    }
  }));
}

async function umount(mountId) {
  const socketPath = process.env[constants.NYDUS_CSI_SOCKET_ENV];
  const volumeId = process.env[constants.NYDUS_CSI_VOLUME_ID_ENV];

  const {
    stderr,
  } = await execa.command(wrapSudo(`${process.execPath} ${path.join(__dirname, './csi_umount_script.js')} ${volumeId} ${socketPath} ${mountId}`), {
    stdio: 'pipe',
  });

  if (stderr) {
    const e = new Error('[rapid] mount nydus failed in csi mode');
    e.stderr = stderr;
    throw e;
  }
}

async function generateBootStrap(cwd, allPkgs) {
  const tarBucketsDir = constants.NYDUS_CSI_BLOB_ROOT;
  await Promise.all(allPkgs.map(async pkgPath => {
    const { bootstrap, tarIndex } = await getWorkdir(cwd, pkgPath, constants.NYDUS_CSI_BLOB_ROOT);
    await execa.command(wrapSudo(`mkdir -p ${path.dirname(bootstrap)}`));
    await execa.command(`${constants.BOOTSTRAP_BIN} --stargz-config-path=${tarIndex} --stargz-dir=${tarBucketsDir} --bootstrap=${bootstrap}`);
  }));
}

async function moveBlobToData() {
  const blobDir = constants.NYDUS_CSI_BLOB_ROOT;
  // blob dir is root
  const mkdirp = wrapSudo(`mkdir -p ${blobDir}`);
  const chown = wrapSudo(`chown -R admin:admin ${blobDir}`);
  await execa.command(`${mkdirp} && ${chown}`);
  await execa.command(`mv ${constants.tarBucketsDir}/* ${blobDir}`);
}

async function linkToCurrent(cwd, allPkgs) {
  await Promise.all(allPkgs.map(async pkgPath => {
    // csi 的 overlay 功能还不对，手动挂载 overlay
    const nodeModulesDir = path.join(cwd, pkgPath, 'node_modules');
    const { csiMountId, overlay, upper, workdir } = await getWorkdir(cwd, pkgPath, constants.NYDUS_CSI_BLOB_ROOT);

    const mountId = (await fs.readFile(csiMountId, 'utf-8')).trim();
    if (!mountId) {
      throw new Error(`[rapid] mount nydus failed in csi mode, invalid path: ${pkgPath}`);
    }

    const nydusdMnt = path.join(process.env[constants.NYDUS_CSI_ROOT_ENV], mountId);
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.mkdir(overlay, { recursive: true });
    await execa.command(wrapSudo(`mount -t tmpfs tmpfs ${overlay}`));
    await fs.mkdir(upper, { recursive: true });
    await fs.mkdir(workdir, { recursive: true });


    const shScript = wrapSudo(`mount \
-t overlay overlay \
-o lowerdir=${nydusdMnt},upperdir=${upper},workdir=${workdir} \
${nodeModulesDir}`);
    console.info('[rapid] mountOverlay: `%s`', shScript);
    await execa.command(shScript);
    console.info('[rapid] overlay mounted.');
  }));
}

async function endNydusFs(cwd, pkg) {
  const allPkgs = await getAllPkgPaths(cwd, pkg);
  await Promise.all(allPkgs.map(async pkgPath => {
    const {
      overlay,
      nodeModulesDir,
      csiMountId,
    } = await getWorkdir(cwd, pkgPath, constants.NYDUS_CSI_BLOB_ROOT);

    const mountId = (await fs.readFile(csiMountId, 'utf-8')).trim();
    if (!mountId) {
      return;
    }
    // umount csi nydus
    // umount project node_modules
    // umount overlay
    try {
      await umount(mountId);
      await execa.command(wrapSudo(`umount ${nodeModulesDir}`));
      await execa.command(wrapSudo(`umount ${overlay}`));
    } catch (e) {
      e.message = '[rapid/csi] umount failed: ' + e.message;
      console.error(e);
      console.error(e.stderr && e.stderr.toString());
    }
  }));

}

module.exports = {
  startNydusFs,
  endNydusFs,
};
