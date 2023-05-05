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
      await coffee.fork(rapid, ['--update', '--lock-id=89e6daaffb00ac4052b3664fbf34a5b4'], {
        cwd,
      })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('binding.gyp', async () => {
    const cwd = path.join(__dirname, './fixtures/node-crc@1.3.2');
    it('should run postinstall successfully', async () => {
      await coffee.fork(rapid, ['--by=npm', '--fs=rapid'], { cwd })
        .debug()
        .expect('stdout', /execute 1 lifecycle script\(s\)/)
        .expect('code', 0)
        .end();
      await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/node-crc/build/Release/crc.node')));
    });
  });

  describe('INIT_CWD', async () => {
    const cwd = path.join(__dirname, './fixtures/rapid-mode-alex');
    it('should set INIT_CWD', async () => {
      await coffee.fork(rapid, ['--by=npminstall', '--fs=rapid'], { cwd })
        .debug()
        .expect('stdout', new RegExp(`INIT_CWD=${process.cwd()}`))
        .expect('code', 0)
        .end();
    });
  });

  describe('production mode', async () => {
    const cwd = path.join(__dirname, './fixtures/rapid-mode-production-deps');
    it('should install production deps', async () => {
      await coffee.fork(rapid, ['--by=npminstall', '--fs=rapid', '--production'], { cwd })
        .debug()
        .expect('code', 0)
        .end();

      assert.strictEqual(require(path.join(cwd, 'node_modules/semver/package.json')).version, '7.3.8');
      assert.match(require(path.join(cwd, 'node_modules/@ali/crypto/node_modules/semver/package.json')).version, /^6\.\d+\.\d+/);
      await assert.rejects(fs.stat(path.join(cwd, 'node_modules/@babel/helper-compilation-targets/package.json')));
    });
  });

  it('should install lodash successfully', async () => {
    cwd = path.join(__dirname, './fixtures/lodash-test');
    await coffee
      .fork(rapid, ['--fs=rapid'], { cwd })
      .debug()
      .expect('code', 0)
      .end();

    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/lodash/package.json')));
    const { stdout } = await runscript('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(cwd) > 0);
  });

  it('should install node-canvas successfully', async () => {
    cwd = path.join(__dirname, './fixtures/rapid-canvas-install');
    await coffee
      .fork(rapid, ['--fs=rapid'], { cwd })
      .debug()
      .expect('code', 0)
      .end();
    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/canvas/package.json')));
    const { stdout } = await runscript('mount', { stdio: 'pipe' });
    assert(stdout.indexOf(cwd) > 0);
    assert(require(path.join(cwd, 'node_modules/canvas/package.json')).binary.host === 'https://cdn.npmmirror.com/binaries/canvas');
  });

  it('should install react-jsx-parser@1.29.0 successfully', async () => {
    cwd = path.join(__dirname, './fixtures/rapid-react-jsx-parser-install');
    // 环境变量被污染了，这里手动删掉
    for (const k in process.env) {
      if (k.includes('npm_')) {
        delete process.env[k];
      }
    }
    await coffee
      .fork(rapid, ['--fs=rapid'], {
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
      .fork(rapid, ['--fs=rapid', '--by=npm'], {
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
      .fork(rapid, ['--fs=rapid', '--by=npminstall'], {
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

  it('should install @alipay/bakery-sdk successfully', async () => {
    cwd = path.join(__dirname, './fixtures/bakery_sdk');
    await coffee
      .fork(rapid, ['--fs=rapid', '--by=npminstall', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`], {
        cwd,
      })
      .debug()
      .expect('code', 0)
      .end();

    // 两个 .bin 时只有 node_modules 目录，所以只要判断 package.json 存在，就说明安装正确
    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules', '@alipay/bakery-sdk/package.json')));
  });
  it('should install y18n@5.0.8 in production mode successfully', async () => {
    cwd = path.join(__dirname, './fixtures/npmcore');
    await coffee
      .fork(rapid, ['--fs=rapid', '--by=npm', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`, '--omit=dev'], {
        cwd,
      })
      .debug()
      .expect('code', 0)
      .end();

    const y18n4 = await fs.readFile(path.join(cwd, 'node_modules/y18n/package.json'));
    assert.strictEqual(JSON.parse(y18n4).version, '4.0.3');

    const y18n5 = await fs.readFile(path.join(cwd, 'node_modules/xprofiler/node_modules/y18n/package.json'));
    assert.strictEqual(JSON.parse(y18n5).version, '5.0.8');
  });

  it('should create project deps bin when there are duplicate bins', async () => {
    cwd = path.join(__dirname, './fixtures/egg-bin');
    await coffee.fork(rapid, ['--fs=rapid', '--by=npm', `--deps-tree-path=${path.join(cwd, 'package-lock.json')}`], { cwd })
      .debug()
      .expect('code', 0)
      .end();

    await assert.doesNotReject(fs.stat(path.join(cwd, 'node_modules/.bin/egg-bin')));
    const link = await fs.readlink(path.join(cwd, 'node_modules/.bin/egg-bin'));
    assert.strictEqual(link, '../@ali/egg-bin/bin/egg-bin.js');
  });
});
