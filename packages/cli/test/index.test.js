'use strict';


const { install } = require('../lib');
const path = require('node:path');
const nock = require('nock');
const assert = require('node:assert');
const mm = require('mm');
const fs = require('node:fs').promises;
const {
  NYDUS_CSI_ROOT_ENV,
  NYDUS_TYPE,
} = require('../lib/constants');
const nydusd = require('../lib/nydusd');
const util = require('../lib/util');
const downloadDependency = require('../lib/download_dependency');
const httpclient = require('../lib/httpclient');

describe('test/index.test.js', () => {
  const fixtures = path.join(__dirname, 'fixtures/force_fallback_install');
  const mockLockId = 'mock_lock_id';

  beforeEach(() => {
    nock('https://npmcore.antfin-inc.com')
      .get(`/api/v2/tree/${mockLockId}`)
      .reply(200, {
        success: true,
        data: {
          treeId: 'mock_tree_id',
          tree: {
            name: 'foo',
            lockfileVersion: 2,
            requires: true,
          },
          warning: 'mock_log',
        },
      });

    nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: {
          treeId: 'mock_tree_id',
          tree: {
            name: 'foo',
            lockfileVersion: 2,
            requires: true,
          },
          warning: 'mock_log',
        },
      });

    mm(util, 'getWorkDir', async () => ({
      overlay: 'mock_overlay',
      upper: 'mock_upper',
      depsJSONPath: path.join(fixtures, 'deps.json'),
    }));
  });

  afterEach(() => mm.restore);
  describe('deps tree file', () => {
    const fixtures = path.join(__dirname, './fixtures/write-package-lock');
    beforeEach(async () => {
      nock('https://npmcore.antfin-inc.com')
        .post('/api/v2/tree')
        .reply(200, {
          success: true,
          data: {
            treeId: 'mock_tree_id',
            tree: {
              name: 'foo',
              lockfileVersion: 2,
              requires: true,
            },
            warning: 'mock_log',
          },
        });

      mm(process.env, NYDUS_CSI_ROOT_ENV, 'true');
      mm(process, 'cwd', () => fixtures);
      mm(nydusd, 'startNydusFs', async () => {
        const { upper } = await util.getWorkdir(fixtures);
        await fs.mkdir(upper, { recursive: true });
      });
      mm(downloadDependency, 'download', async () => {
        return {
          depsTree: {
            name: 'foo',
            lockfileVersion: 2,
            requires: true,
          },
        };
      });
      await fs.rm(path.join(fixtures, '1'), { force: true });
    });
    afterEach(async () => {
      const { overlay } = await util.getWorkdir(fixtures);
      await fs.rm(overlay, { force: true, recursive: true });
    });

    it('should write deps tree file .package-lock.json in node_modules', async () => {
      const pkg = require(path.join(fixtures, 'package.json'));
      await install({
        httpclient,
        pkg,
        cwd: fixtures,
        console: global.console,
      });
      const { depsJSONPath } = await util.getWorkdir(fixtures);
      const fileContent = await fs.readFile(depsJSONPath, 'utf8');
      const pkgJSON = JSON.parse(fileContent);
      assert.deepStrictEqual(pkgJSON, {
        name: 'foo',
        lockfileVersion: 2,
        requires: true,
      });
    });
  });

  describe('set env npm_config_xx before install', () => {
    const fixtures = path.join(__dirname, './fixtures/project-scripts-env');
    const envJsonPath = path.join(fixtures, '1.json');
    beforeEach(async () => {
      mm(process.env, NYDUS_CSI_ROOT_ENV, 'true');
      mm(process, 'cwd', () => fixtures);
      mm(nydusd, 'startNydusFs', async () => {
        const { upper } = await util.getWorkdir(fixtures);
        await fs.mkdir(upper, { recursive: true });
      });
      mm(downloadDependency, 'download', async () => {
        return {
          depsTree: {
            name: 'foo',
            lockfileVersion: 2,
            requires: true,
          },
        };
      });
      await fs.rm(envJsonPath, { force: true });
    });
    afterEach(async () => {
      await fs.rm(envJsonPath, { force: true });
    });
    it('should work', async () => {
      const pkg = require(path.join(fixtures, 'package.json'));
      await install({
        httpclient,
        cwd: fixtures,
        pkg,
        args: [
          '--disturl=https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node',
        ],
      });
      const jsonStr = await fs.readFile(envJsonPath, 'utf8');
      const env = JSON.parse(jsonStr);
      assert(env.npm_config_disturl, 'https://npmmirror.oss-cn-shanghai.aliyuncs.com/binaries/node');
    });
  });

  describe('package-lock-only', () => {
    const fixtures = path.join(__dirname, './fixtures/package-lock-only');
    beforeEach(async () => {
      mm(nydusd, 'getNydusMode', async () => NYDUS_TYPE.CSI);
    });

    afterEach(async () => {
      await fs.rm(path.join(fixtures, 'package-lock.json'), { force: true });
      await fs.rm(path.join(fixtures, '.lock-id.txt'), { force: true });
      mm.restore();
    });

    it('should generate package-lock.json', async () => {
      const pkg = require(path.join(fixtures, 'package.json'));
      await install({
        httpclient,
        cwd: fixtures,
        pkg,
        packageLockOnly: true,
      });

      await assert.doesNotReject(fs.stat(path.join(fixtures, 'package-lock.json')));
      await assert.doesNotReject(fs.stat(path.join(fixtures, '.lock-id.txt')));
    });
  });
});
