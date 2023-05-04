'use strict';

const assert = require('node:assert');
const path = require('node:path');
const PackageLock = require('../lib/package_lock').PackageLock;

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
});
