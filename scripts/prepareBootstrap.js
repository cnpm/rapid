/**
 * rapid-mode/nydusd/fuse_mode&const import sub binding directly, copy
 * nydusd-bootstrap and index.node to ensure tests work fine in local
 * enviroments.
 */
const fs = require('node:fs/promises');
const osInfo = require('node:os');
const path = require('node:path');
const process = require('node:process');
const util = require('node:util');
let os = process.env.BUILD_OS || osInfo.platform().toLowerCase();
const arch = process.env.BUILD_ARCH || osInfo.arch();

if (os === 'macos') {
  os = 'darwin';
}

const rootFolder = path.resolve(__dirname, '..');
const targetFolder = path.resolve(
  rootFolder,
  util.format('bindings/binding-%s-%s', os, arch)
);

console.log('target folder: ', targetFolder);
console.log('root folder: ', rootFolder);

const bootstrapBinPath = process.env.CARGO_BUILD_TARGET ? path.resolve(rootFolder, 'target', process.env.CARGO_BUILD_TARGET, 'release/bootstrap') : path.resolve(rootFolder, 'target/release/bootstrap');
const targetBinPath = path.resolve(targetFolder, 'nydusd-bootstrap');

const nodeBindingPath = path.resolve(rootFolder, 'packages/binding/index.node');
const targetNodeBindingPath = path.resolve(targetFolder, 'index.node');

(async () => {
  try {
    console.log(`mv ${bootstrapBinPath} to ${targetBinPath}`);
    await fs.rename(bootstrapBinPath, targetBinPath);
    console.log(`mv ${nodeBindingPath} to ${targetNodeBindingPath}`);
    await fs.rename(nodeBindingPath, targetNodeBindingPath);
  } catch (err) {
    console.warn('prepare nydus-bootstrap bin failed, nydusd mounting tests may fail', err);
    process.exit(1);
  }
})();
