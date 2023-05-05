'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert');
const {
  install,
  clean,
} = require('@cnpmjs/rapid');

describe('test/install-workspace.test.js', () => {
  let cwd;

  it('should install lodash successfully', async () => {
    cwd = path.join(__dirname, './fixtures/workspace');
    await clean(cwd);
    await install({
      cwd,
    });

    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/lodash/package.json')));
    await assert.rejects(fs.stat(path.join(cwd, 'packages/lodash-1/node_modules/lodash/package.json')));
    await assert.doesNotReject(fs.stat(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    const lodash1 = JSON.parse(await fs.readFile(path.join(cwd, 'node_modules/lodash/package.json')));
    const lodash2 = JSON.parse(await fs.readFile(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    assert(lodash1.version.startsWith('1.'));
    assert(lodash2.version.startsWith('2.'));

    await clean(cwd);
    await assert.rejects(fs.stat(path.join(cwd, 'node_modules/lodash')));
    await assert.rejects(fs.stat(path.join(cwd, 'packages/lodash-1/node_modules/lodash')));
    await assert.rejects(fs.stat(path.join(cwd, 'packages/lodash-2/node_modules/lodash')));
  });

  it('should clean all node_modules', async () => {
    cwd = path.join(__dirname, './fixtures/workspace');

    await clean(cwd);
    await install({
      cwd,
    });
    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/lodash/package.json')));
    await assert.rejects(fs.stat(path.join(cwd, 'packages/lodash-1/node_modules/lodash/package.json')));
    await assert.doesNotReject(fs.stat(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    const lodash1 = JSON.parse(await fs.readFile(path.join(cwd, 'node_modules/lodash/package.json')));
    const lodash2 = JSON.parse(await fs.readFile(path.join(cwd, 'packages/lodash-2/node_modules/lodash/package.json')));
    assert(lodash1.version.startsWith('1.'));
    assert(lodash2.version.startsWith('2.'));

    await clean(cwd);
    await assert.rejects(fs.stat(path.join(cwd, 'node_modules/lodash')));
    await assert.rejects(fs.stat(path.join(cwd, 'packages/lodash-1/node_modules/lodash')));
    await assert.rejects(fs.stat(path.join(cwd, 'packages/lodash-2/node_modules/lodash')));
  });
});
