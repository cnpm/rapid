'use strict';

const path = require('node:path');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const runscript = require('runscript');
const httpclient = require('../lib/httpclient');
const Scripts = require('../lib/scripts').Scripts;
const mm = require('mm');
const nock = require('nock');
const {
  download,
} = require('../lib/download_dependency');
const {
  tarBucketsDir,
} = require('../lib/constants');
const util = require('../lib/util');

const readdir = fs.readdir;

async function prepareEnv(CWD) {
  const { baseDir } = await util.getWorkdir(CWD);
  await fs.mkdir(baseDir, { recursive: true });
}

describe('test/download_dependency.test.js', () => {
  before(async () => {
    await fs.mkdir(tarBucketsDir, { recursive: true });
  });

  beforeEach(async () => {
    mm(process.env, 'NODE_OPTIONS', `--require ${path.join(__dirname, 'fixtures/rapid-mode-download', 'nock-mock-npmcore.js')}`);
  });

  afterEach(async () => {
    mm.restore();
    nock.cleanAll();
    await runscript(`rm -f ${tarBucketsDir}/*`);
  });

  it('should work', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-download');
    await prepareEnv(CWD);
    nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: require(path.join(CWD, './tree.json')),
      });

    const options = {
      productionMode: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      httpclient,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      depsTree: require(path.join(CWD, 'tree.json')),
    };

    options.scripts = new Scripts(options);
    const result = await download(options);

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });

  it('should run postinstall scripts in real pkg dir in npminstall mode', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-postinstall');
    await prepareEnv(CWD);
    nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: require(path.join(CWD, './tree.json')),
      });
    const options = {
      productionMode: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npminstall',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      pkg: require(path.join(CWD, 'package.json')),
      depsTree: require(path.join(CWD, 'tree.json')),
    };
    options.scripts = new Scripts(options);
    const result = await download(options);

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
    assert(options.scripts.installTasks[0].cwd.includes('_@ali_ci@4.37.1@@ali/ci'));
  });

  it('should run postinstall scripts in real pkg dir in npm mode', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-postinstall');
    await prepareEnv(CWD);
    nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: require(path.join(CWD, './tree.json')),
      });
    const options = {
      productionMode: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npm',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      pkg: require(path.join(CWD, 'package.json')),
      depsTree: require(path.join(CWD, 'tree.json')),
    };
    options.scripts = new Scripts(options);
    const result = await download(options);

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
    assert(options.scripts.installTasks[0].cwd.includes('node_modules/@ali/ci'));
  });

  it('should run preinstall scripts in real pkg `upper` dir in npminstall mode', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-preinstall');
    await prepareEnv(CWD);
    const options = {
      productionMode: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npminstall',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      pkg: require(path.join(CWD, 'package.json')),
      depsTree: require(path.join(CWD, 'tree.json')),
    };
    options.scripts = new Scripts(options);
    await download(options);
    assert.strictEqual(options.scripts.installTasks[0].cwd, 'node_modules/_@alipay_tnpm-scripts-test@1.0.0@@alipay/tnpm-scripts-test');
  });

  it('should run preinstall scripts in real pkg `upper` dir in npm mode', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-preinstall');
    await prepareEnv(CWD);
    const options = {
      productionMode: false,
      depsTreePath: path.join(CWD, 'tree.json'),
      console,
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      mode: 'npm',
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      pkg: require(path.join(CWD, 'package.json')),
      depsTree: require(path.join(CWD, 'tree.json')),
    };
    options.scripts = new Scripts(options);
    await download(options);
    assert.strictEqual(options.scripts.installTasks[0].cwd, 'node_modules/@alipay/tnpm-scripts-test');
  });

  it('should use local deps tree json', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-download-local-deps');
    await prepareEnv(CWD);

    const options = {
      productionMode: false,
      httpclient,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      depsTreePath: path.join(CWD, 'package-lock.json'),
      depsTree: require(path.join(CWD, 'package-lock.json')),
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
    };
    options.scripts = new Scripts(options);
    const result = await download(options);

    assert.deepStrictEqual(result.depsTree.packages['node_modules/uuid'], {
      version: '8.3.2',
      integrity: 'sha1-gNW1ztJxu5r2xEXyGhoExgbO++I=',
      bin: {
        uuid: 'dist/bin/uuid',
      },
      resolved: 'https://registry.npm.alibaba-inc.com/uuid/download/uuid-8.3.2.tgz',
    });

    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });

  it('should fallback to server side deps tree generating when path is invalid', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-download-local-deps');
    await prepareEnv(CWD);
    nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: { tree: require(path.join(CWD, './tree.json')) },
      });

    const options = {
      httpclient,
      productionMode: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      depsTreePath: path.join(CWD, 'file-not-found.json'),
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      depsTree: require(path.join(CWD, 'tree.json')),
    };
    options.scripts = new Scripts(options);
    const result = await download(options);

    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });

  it('should fallback to server side deps tree generating when data is invalid', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-download-local-deps');
    await prepareEnv(CWD);
    nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: { tree: require(path.join(CWD, './tree.json')) },
      });
    const options = {
      httpclient,
      productionMode: false,
      pkg: require(path.join(CWD, 'package.json')),
      console,
      depsTreePath: path.join(CWD, 'tree-invalid.json'),
      env: {
        NO_UPDATE_NOTIFIER: 'true',
        PATH: process.env.PATH,
        DEBUG: 'tnpm*',
        TERM: 'xterm',
        PWD: '/home/admin/object-pipeline',
        TNPM_PROGRESS: 'false',
        LANG: 'zh_CN.UTF-8',
        HOME: '/home/admin',
        SHLVL: '2',
        CI: 'true',
        LESSOPEN: '||/usr/bin/lesspipe.sh %s',
        _: '/home/admin/.cli/node',
        NO_PROXY: '*',
        TMPDIR: '/tmp',
        TEMP: '/tmp',
      },
      ignoreScripts: false, // 构建依赖安装，默认不忽略
      cwd: CWD,
      depsTree: require(path.join(CWD, 'tree.json')),
    };
    options.scripts = new Scripts(options);
    const result = await download(options);
    assert.strictEqual(Object.keys(result.depsTree.packages).length, 2);
    const tarFiles = (await readdir(tarBucketsDir)).filter(file => /bucket_\d+.stgz/.test(file));
    assert(tarFiles.length);
  });
});
