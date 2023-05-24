'use strict';

const {
  NYDUS_TYPE,
  nydusdMnt,
} = require('../constants');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const debug = require('node:util').debuglog('nydusd');
const runscript = require('runscript');
const util = require('../util');
const fuseMode = require('./fuse_mode');

const fsImplMap = {
  [NYDUS_TYPE.FUSE]: {
    start: fuseMode.startNydusFs,
    end: fuseMode.endNydusFs,
  },
};

/**
 * @param {string} mode -
 * @param {object} fsImpl - { start: (cwd: string, pkg: object) => Promise<void>, end: (cwd: string, pkg: object) => Promise<void> }
 */
exports.registerMode = function(mode, fsImpl) {
  fsImplMap[mode] = fsImpl;
};

exports.unregisterMode = function(mode) {
  fsImplMap[mode] = null;
};

exports.startNydusFs = async function(mode, cwd, pkg) {
  const impl = fsImplMap[mode];
  assert(impl, `can not find fs impl for mode: ${mode}`);
  await impl.start(cwd, pkg);
};

exports.endNydusFs = async function(mode, cwd, pkg) {
  if (mode === NYDUS_TYPE.NATIVE) return;
  const impl = fsImplMap[mode];
  assert(impl, `can not find fs impl for mode: ${mode}`);
  await impl.end(cwd, pkg);
};

exports.getNydusMode = async function(cwd) {
  if (cwd) {
    const installMode = await exports.getNydusInstallMode(cwd);
    if (installMode) return installMode;
  }
  try {
    await util.shouldFuseSupport();
    return NYDUS_TYPE.FUSE;
  } catch (_) {
    return NYDUS_TYPE.NATIVE;
  }
};

exports.getNydusInstallMode = async function(cwd) {
  const nmDir = path.join(cwd, 'node_modules');
  try {
    await fs.access(nmDir);
  } catch (_) {
    return null;
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
  return NYDUS_TYPE.NATIVE;
};
