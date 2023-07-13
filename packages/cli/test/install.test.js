'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert');
const mm = require('mm');
const { install } = require('../lib/index');

describe('install', () => {
  let cwd;
  beforeEach(async () => {
    mm(os, 'type', () => 'Linux');
    cwd = await fs.mkdtemp('/tmp/');
    await fs.writeFile(`${cwd}/package.json`, JSON.stringify({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        'lodash.has': '4.5.2',
      },
      devDependencies: {
        'lodash.has': '4.5.2',
      },
    }));
  });
  afterEach(async () => {
    mm.restore();
    await fs.rm(cwd, { recursive: true, force: true });
  });

  it('should generate tree successfully', async () => {
    await install({
      cwd,
      pkg: require(path.join(cwd, 'package.json')),
      experimentalLocalResolver: true,
      env: process.env,
      httpclient: require('../lib/httpclient'),
      packageLockOnly: true,
    });

    const lockfile = require(path.join(cwd, 'package-lock.json'));
    assert.strictEqual(lockfile.lockfileVersion, 3);
    assert(Object.keys(lockfile.packages), 2);
  });
});
