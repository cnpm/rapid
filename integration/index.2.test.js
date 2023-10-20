'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert');
const coffee = require('coffee');
const semver = require('semver');
const execa = require('execa');
const rapid = path.join(__dirname, '../node_modules/.bin/rapid');
const {
  clean,
} = require('@cnpmjs/rapid');
const {
  exitDaemon,
  forceExitDaemon,
} = require('@cnpmjs/rapid/lib/nydusd/nydusd_api');

describe('test/index.v2.test.js', () => {
  let cwd;

  afterEach(async () => {
    await clean(cwd);
    if (process.platform === 'darwin') {
      try {
        await forceExitDaemon();
      } catch (err) {
        console.warn('force exit daemon error: %s', err.message);
      }
    } else {
      await exitDaemon();
    }
  });

  describe('update', () => {
    it('should run postinstall successfully', async () => {
      cwd = path.join(__dirname, './fixtures/update');
      await coffee.fork(rapid, [ '--update', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], {
        cwd,
      })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('binding.gyp', async () => {
    if (process.platform === 'linux') {
      it('should run postinstall successfully', async () => {
        cwd = path.join(__dirname, './fixtures/node-crc');
        await coffee.fork(rapid, [ 'install', '--by=npm', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
          .debug()
          .expect('stdout', /execute 1 lifecycle script\(s\)/)
          .expect('code', 0)
          .end();
        await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/node-crc/build/Release/crc.node')));
      });
    }
  });

  describe('INIT_CWD', async () => {
    it('should set INIT_CWD', async () => {
      cwd = path.join(__dirname, './fixtures/init-cwd');
      await coffee.fork(rapid, [ 'install', '--by=npminstall', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
        .debug()
        .expect('stdout', new RegExp(`INIT_CWD=${process.cwd()}`))
        .expect('code', 0)
        .end();
    });
  });

  describe('production mode', async () => {
    it('should install production deps', async () => {
      cwd = path.join(__dirname, './fixtures/prod-deps');
      await coffee
        .fork(
          rapid,
          [
            'install',
            '--by=npminstall',
            '--production',
            `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`,
          ],
          { cwd }
        )
        .debug()
        .expect('code', 0)
        .end();

      assert.strictEqual(require(path.join(cwd, 'node_modules/semver/package.json')).version, '7.3.8');
    });
  });
  // 在 node@20 上跑不起来
  if (semver.parse(process.version).major < 20 && process.platform === 'linux') {
    it('should install node-canvas successfully', async () => {
      cwd = path.join(__dirname, './fixtures/canvas');
      await coffee
        .fork(rapid, [ 'install' ], { cwd })
        .debug()
        .expect('code', 0)
        .end();
      await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/canvas/package.json')));
      const { stdout } = await execa.command('mount', { stdio: 'pipe' });
      assert(stdout.indexOf(cwd) > 0);
      assert(require(path.join(cwd, 'node_modules/canvas/package.json')).binary.host === 'https://cdn.npmmirror.com/binaries/canvas');
    });
  }

  it('should install react-jsx-parser@1.29.0 successfully', async () => {
    cwd = path.join(__dirname, './fixtures/react-jsx-parser');
    // 环境变量被污染了，这里手动删掉
    for (const k in process.env) {
      if (k.includes('npm_')) {
        delete process.env[k];
      }
    }

    await coffee
      .fork(rapid, [ 'install', '--ignore-scripts' ], {
        cwd,
      })
      .debug()
      .expect('code', 0)
      .end();

    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/react-jsx-parser/package.json')));
    const { stdout } = await execa.command('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(cwd) > 0);
    assert(require(path.join(cwd, 'node_modules/react-jsx-parser/package.json')).version === '1.29.0');
  });

  it('should install optional deps successfully use npm', async () => {
    cwd = path.join(__dirname, './fixtures/esbuild');
    await coffee
      .fork(rapid, [
        'install',
        '--ignore-scripts',
      ], {
        cwd,
      })
      .debug()
      .expect('code', 0)
      .end();

    const dirs = await fs.readdir(path.join(cwd, 'node_modules'));
    assert.strictEqual(dirs.filter(dir => dir.includes('esbuild')).length, 2);
    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/esbuild')));
    assert.strictEqual(require(path.join(cwd, 'node_modules', 'esbuild/package.json')).version, '0.15.14');
  });

  it('should install optional deps successfully use npminstall', async () => {
    cwd = path.join(__dirname, './fixtures/esbuild');
    await coffee
      .fork(rapid, [
        'install',
        '--by=npminstall',
        '--ignore-scripts',
      ], {
        cwd,
      })
      .debug()
      .expect('code', 0)
      .end();

    const dirs = await fs.readdir(path.join(cwd, 'node_modules'));
    assert.strictEqual(dirs.filter(dir => dir.includes('esbuild')).length, 4);
    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules', 'esbuild')));
    assert.strictEqual(require(path.join(cwd, 'node_modules', 'esbuild/package.json')).version, '0.15.14');
  });
});
