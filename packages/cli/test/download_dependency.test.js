'use strict';

const path = require('node:path');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const execa = require('execa');
const httpclient = require('../lib/httpclient');
const Scripts = require('../lib/scripts').Scripts;
const mm = require('mm');
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

  afterEach(async () => {
    mm.restore();
    await execa.command(`rm -f ${tarBucketsDir}/*`);
  });

  it('should work', async () => {
    const CWD = path.join(__dirname, 'fixtures/rapid-mode-download');
    await prepareEnv(CWD);
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
});
