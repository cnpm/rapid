'use strict';

const {
  NYDUS_CSI_ROOT_ENV,
  NYDUS_TYPE,
  nydusdMnt,
} = require('../constants');
const path = require('node:path');
const fs = require('node:fs/promises');
const debug = require('debug')('nydusd');
const runscript = require('runscript');
const util = require('../util');
const fuseMode = require('./fuse_mode');
const csiMode = require('./csi_mode');

exports.startNydusFs = async function (mode, cwd, pkg) {
  switch (mode) {
    case NYDUS_TYPE.FUSE: {
      await fuseMode.startNydusFs(cwd, pkg);
      return;
    }
    case NYDUS_TYPE.CSI: {
      await csiMode.startNydusFs(cwd, pkg);
      return;
    }
    default: {
      throw new Error('not support nydusd');
    }
  }
};

exports.endNydusFs = async function (mode, cwd, pkg) {
  debug('endNydusFs, mode: %s, cwd: %s', mode, cwd);
  switch (mode) {
    case NYDUS_TYPE.CSI: {
      await csiMode.endNydusFs(cwd, pkg);
      return;
    }
    case NYDUS_TYPE.FUSE:
      await fuseMode.endNydusFs(cwd, pkg);
      return;
    default:
      return;
  }
};

exports.getNydusMode = async function (cwd) {
  if (cwd) {
    const installMode = await exports.getNydusInstallMode(cwd);
    if (installMode) return installMode;
  }
  if (process.env[NYDUS_CSI_ROOT_ENV]) {
    return NYDUS_TYPE.CSI;
  }
  try {
    await util.shouldFuseSupport();
    return NYDUS_TYPE.FUSE;
  } catch (_) {
    return NYDUS_TYPE.NONE;
  }
};

exports.getNydusInstallMode = async function (cwd) {
  const nmDir = path.join(cwd, 'node_modules');
  try {
    await fs.access(nmDir);
  } catch (_) {
    return NYDUS_TYPE.NONE;
  }
  const stdio = await runscript('mount', {
    stdio: 'pipe',
  });
  const stdout = stdio.stdout.toString();
  const hasNmDirOverlay = stdout.indexOf(nmDir) >= 0;
  const hasMntFuse = stdout.indexOf(nydusdMnt) >= 0;
  debug('stdout: %s', stdout);
  debug('nmDir: %s, nydusdMnt: %s', nmDir, nydusdMnt);
  debug('hasNmDirOverlay: %s, hasMntFuse: %s', hasNmDirOverlay, hasMntFuse);
  if (hasMntFuse && hasNmDirOverlay) {
    return NYDUS_TYPE.FUSE;
  }
  if (hasNmDirOverlay) {
    return NYDUS_TYPE.CSI;
  }
  return NYDUS_TYPE.NONE;
};
