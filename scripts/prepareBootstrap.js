/**
 * rapid-mode/nydusd/fuse_mode&const import sub binding directly, copy
 * nydusd-bootstrap and index.node to ensure tests work fine in local
 * enviroments.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');
const util = require('node:util');

const rootFolder = path.resolve(__dirname, '..');
const targetFolder = path.resolve(
  rootFolder,
  util.format('packages/binding/npm/binding-%s-%s', process.platform, process.arch),
);

const bootstrapBinPath = path.resolve(rootFolder, 'target/release/bootstrap');
const targetBinPath = path.resolve(targetFolder, 'nydusd-bootstrap');

const nodeBindingPath = path.resolve(rootFolder, 'packages/binding/index.node');
const targetNodeBindingPath = path.resolve(targetFolder, 'index.node');

(async () => {
  try {
    await fs.copyFile(bootstrapBinPath, targetBinPath);
    await fs.copyFile(nodeBindingPath, targetNodeBindingPath);
  } catch (err) {
    console.warn('prepare nydus-bootstrap bin failed, nydusd mounting tests may fail');
  }
})();
