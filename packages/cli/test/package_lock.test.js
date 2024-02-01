'use strict';

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs/promises');
const mm = require('mm');
const PackageLock = require('../lib/package_lock').PackageLock;
const { install } = require('../lib');
const httpclient = require('../lib/httpclient');
const nydusd = require('../lib/nydusd');
const downloadDependency = require('../lib/download_dependency');

const fixture = path.join(__dirname, 'fixtures/lockfile');

describe('test/package_lock.test.js', () => {
  it('should work', async () => {
    const packageLock = new PackageLock({
      cwd: fixture,
      packageLockJson: require(path.join(fixture, 'package-lock.json')),
    });

    await packageLock.load();

    assert.strictEqual(packageLock.name, 'npm-workspace');
    assert.strictEqual(packageLock.version, '1.0.0');

    assert.deepStrictEqual(packageLock.pkgJSON, {
      name: 'npm-workspace',
      version: '1.0.0',
      hasInstallScript: true,
      workspaces: [
        'packages/*',
      ],
      dependencies: {
        'lodash.has': '4.5.2',
      },
    });

    assert.deepStrictEqual(packageLock.workspaces, {
      '@alipay/a': 'packages/a',
      '@alipay/b': 'packages/b',
    });

    assert.strictEqual(packageLock.isRootPkg(''), true);
    assert.strictEqual(packageLock.isWorkspacesPkg('packages/a'), true);
    assert.strictEqual(packageLock.isWorkspacesPkg('packages/b'), true);
    assert.strictEqual(packageLock.isWorkspacesPkg('packages/c'), false);
    assert.strictEqual(packageLock.isWorkspacesPkg('node_modules/lodash.has'), false);
    assert.strictEqual(packageLock.isWorkspacesPkg('xxx/lodash.has'), false);
    assert.strictEqual(packageLock.isDepsPkg('node_modules/lodash.has'), true);
  });

  describe('not exist lock file', async () => {
    let fixture;
    beforeEach(async () => {
      mm(process, 'cwd', () => fixture);
      mm(nydusd, 'startNydusFs', async () => { });
      mm(downloadDependency, 'download', async () => {
        return {
          depsTree: [ 1 ],
        };
      });

    });
    afterEach(async () => {
      await fs.rm(path.join(fixture, 'node_modules'), { recursive: true, force: true });
      await fs.rm(path.join(fixture, 'package-lock.json'), { force: true });
      mm.restore();
    });

    it('should run all project installation scripts', async () => {
      fixture = path.join(__dirname, './fixtures/not-exist-lock-file');
      const pkg = require(path.join(fixture, 'package.json'));
      await install({
        httpclient,
        pkg,
        cwd: fixture,
        console: global.console,
      });
      await fs.stat(path.join(fixture, 'package-lock.json'));
    });
  });
});
