'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert');
const {
  install,
  clean,
} = require('@cnpmjs/rapid');
const {
  exitDaemon,
  forceExitDaemon,
} = require('@cnpmjs/rapid/lib/nydusd/nydusd_api');

describe('test/workspaces.test.js', () => {
  let cwd;

  it('should install lodash successfully', async () => {
    cwd = path.join(__dirname, './fixtures/workspaces');
    await clean(cwd);
    await install({
      cwd,
      pkg: require(path.join(cwd, 'package.json')),
      depsTreePath: path.join(cwd, 'package-lock.json'),
    });
    // FIXME macos 上 sleep 了 1 秒才能读取到文件
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/lodash/package.json')));
      await assert.rejects(fs.readFile(path.join(cwd, 'packages/lodash-1/node_modules/lodash')));
      await assert.doesNotReject(fs.stat(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
      const lodash1 = JSON.parse(await fs.readFile(path.join(cwd, 'node_modules/lodash/package.json')));
      const lodash2 = JSON.parse(await fs.readFile(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
      assert(lodash1.version.startsWith('1.'));
      assert(lodash2.version.startsWith('2.'));
    } finally {
      await clean(cwd);
      if (process.platform === 'darwin') {
        await forceExitDaemon();
      } else {
        await exitDaemon();
      }
    }


    await assert.rejects(fs.readFile(path.join(cwd, 'node_modules/lodash/package.json')));
    await assert.rejects(fs.readFile(path.join(cwd, 'packages/lodash-1/node_modules/lodash/package.json')));
    await assert.rejects(fs.readFile(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
  });
});
