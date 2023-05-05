'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert');
const coffee = require('coffee');
const runscript = require('runscript');
const rapid = path.join(__dirname, '../node_modules/.bin/rapid');
const {
  clean,
} = require('@cnpmjs/rapid');

describe('test/index.v2.test.js', () => {
  let cwd;

  afterEach(async () => {
    await clean(cwd);
  });

  describe('update', () => {
    const cwd = path.join(__dirname, './fixtures/update');
    it('should run postinstall successfully', async () => {
      await coffee.fork(rapid, [ '--update', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], {
        cwd,
      })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('binding.gyp', async () => {
    const cwd = path.join(__dirname, './fixtures/node-crc');
    it('should run postinstall successfully', async () => {
      await coffee.fork(rapid, [ '--by=npm', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
        .debug()
        .expect('stdout', /execute 1 lifecycle script\(s\)/)
        .expect('code', 0)
        .end();
      await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/node-crc/build/Release/crc.node')));
    });
  });

  describe('INIT_CWD', async () => {
    const cwd = path.join(__dirname, './fixtures/init-cwd');
    it('should set INIT_CWD', async () => {
      await coffee.fork(rapid, [ '--by=npminstall', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
        .debug()
        .expect('stdout', new RegExp(`INIT_CWD=${process.cwd()}`))
        .expect('code', 0)
        .end();
    });
  });

  describe('production mode', async () => {
    const cwd = path.join(__dirname, './fixtures/prod-deps');
    it('should install production deps', async () => {
      await coffee.fork(rapid, [
        '--by=npminstall', '--production', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
        .debug()
        .expect('code', 0)
        .end();

      assert.strictEqual(require(path.join(cwd, 'node_modules/semver/package.json')).version, '7.3.8');
      await assert.rejects(fs.stat(path.join(cwd, 'node_modules/@babel/helper-compilation-targets/package.json')));
    });
  });

  it('should install lodash successfully', async () => {
    cwd = path.join(__dirname, './fixtures/lodash');
    await coffee
      .fork(rapid, [ `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
      .debug()
      .expect('code', 0)
      .end();

    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/lodash/package.json')));
    const { stdout } = await runscript('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(cwd) > 0);
  });

  it('should install node-canvas successfully', async () => {
    cwd = path.join(__dirname, './fixtures/canvas');
    await coffee
      .fork(rapid, [ `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/canvas/package.json')));
    const { stdout } = await runscript('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(cwd) > 0);
    assert(require(path.join(cwd, 'node_modules/canvas/package.json')).binary.host === 'https://cdn.npmmirror.com/binaries/canvas');
  });

  it('should install react-jsx-parser@1.29.0 successfully', async () => {
    cwd = path.join(__dirname, './fixtures/react-jsx-parser');
    // 环境变量被污染了，这里手动删掉
    for (const k in process.env) {
      if (k.includes('npm_')) {
        delete process.env[k];
      }
    }
    await coffee
      .fork(rapid, [ `--deps-tree-path=${path.join(cwd, 'package-lock.json')}` ], {
        cwd,
      })
      .debug()
      .expect('code', 0)
      .end();

    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/react-jsx-parser/package.json')));
    const { stdout } = await runscript('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(cwd) > 0);
    assert(require(path.join(cwd, 'node_modules/react-jsx-parser/package.json')).version === '1.29.0');
  });

  it('should install optional deps successfully use npm', async () => {
    cwd = path.join(__dirname, './fixtures/esbuild');
    await coffee
      .fork(rapid, [
        '--by=npm',
        `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`,
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
        '--by=npminstall',
        `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`,
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
