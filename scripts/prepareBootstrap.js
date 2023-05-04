/**
 * rapid-mode/nydusd/fuse_mode&const import sub binding directly, copy
 * nydusd-bootstrap and index.node to ensure tests work fine in local
 * enviroments.
 */
const fsp = require('node:fs/promises');
const path = require('node:path');

const { arch, platform } = process;

const rootFolder = path.resolve(__dirname, '..');
const targetFolder = path.resolve(
  rootFolder,
  `packages/binding-${platform}-${arch}`
);

const bootstrapBinPath = path.resolve(rootFolder, 'target/release/bootstrap');
const targetBinPath = path.resolve(targetFolder, 'nydusd-bootstrap');

const nodeBindingPath = path.resolve(rootFolder, 'packages/binding/index.node');
const targetNodeBindingPath = path.resolve(targetFolder, 'index.node');

(async () => {
  try {
    await fsp.copyFile(bootstrapBinPath, targetBinPath);
    await fsp.copyFile(nodeBindingPath, targetNodeBindingPath);
  } catch (err) {
    console.warn('prepare nydus-bootstrap bin failed, nydusd mounting tests may fail');
  }
})();
