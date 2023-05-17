'use strict';

const path = require('node:path');
const assert = require('node:assert');
const mm = require('mm');
const fs = require('node:fs/promises');
const originFs = require('node:fs');
const Scripts = require('../lib/scripts').Scripts;
const util = require('../lib/util');
const { install } = require('../lib');
const httpclient = require('../lib/httpclient');
const { MirrorConfig } = require('binary-mirror-config');
const {
  NYDUS_CSI_ROOT_ENV,
} = require('../lib/constants');
const nydusd = require('../lib/nydusd');
const downloadDependency = require('../lib/download_dependency');

const fixture = path.join(__dirname, './fixtures/rapid-mode-scripts');

describe('test/scripts.test.js', () => {
  const fakePackage = 'fake-npm';
  const upperdir = path.join(fixture, 'upperdir');
  const projectDir = path.join(fixture, 'node_modules', fakePackage);
  const fakePkgJSON = {
    name: 'fake-npm',
    version: '1.0.0',
    scripts: {
      preinstall: 'echo preinstall > 1',
      install: 'echo install > 2',
      postinstall: 'echo postinstall > 3',
    },
  };

  const fakeOptions = {
    cwd: fixture,
    console: global.console,
    pkg: fakePkgJSON,
  };

  const mirrorConfig = new MirrorConfig({
    console: global.console,
  });

  before(async () => {
    await fs.mkdir(projectDir, { recursive: true });
    await mirrorConfig.init();
    mm(util, 'getWorkdir', () => ({
      upper: upperdir,
      depsJSONPath: path.join(fixture, '.package-lock.json'),
      baseDir: fixture,
    }));
  });

  after(async () => {
    await fs.rm(path.join(fixture, 'node_modules'), { recursive: true, force: true });
    mm.restore();
  });
  it('should store and run lifecycle scripts', async () => {
    const scripts = new Scripts(fakeOptions);
    scripts.storeLifecycleScripts(fakePkgJSON, 'node_modules/fake-npm');

    assert.deepStrictEqual(scripts.installTasks[0], {
      pkg: {
        name: 'fake-npm',
        version: '1.0.0',
        scripts: {
          preinstall: 'echo preinstall > 1',
          install: 'echo install > 2',
          postinstall: 'echo postinstall > 3',
        },
      },
      cwd: 'node_modules/fake-npm',
      displayName: 'fake-npm@1.0.0',
      optional: false,
    });

    await scripts.runLifecycleScripts(mirrorConfig);
    assert.strictEqual(await fs.readFile(path.join(projectDir, '1'), 'utf-8'), 'preinstall\n');
    assert.strictEqual(await fs.readFile(path.join(projectDir, '2'), 'utf-8'), 'install\n');
    assert.strictEqual(await fs.readFile(path.join(projectDir, '3'), 'utf-8'), 'postinstall\n');
  });

  describe('node-gyp scripts', () => {
    beforeEach(() => {
      mm(originFs, 'existsSync', () => true);
    });
    afterEach(mm.restore);

    it('should store node-gyp as install script', async () => {
      const scripts = new Scripts(fakeOptions);

      scripts.storeLifecycleScripts({
        name: 'fake-npm',
        version: '1.0.0',
        scripts: {
          postinstall: 'echo postinstall > 3',
        },
      }, 'node_modules/fake-npm', true, true);

      assert.deepStrictEqual(scripts.installTasks, [
        {
          pkg: {
            name: 'fake-npm',
            version: '1.0.0',
            scripts: {
              postinstall: 'echo postinstall > 3',
              install: 'node-gyp rebuild',
            },
          },
          cwd: 'node_modules/fake-npm',
          optional: true,
          displayName: 'fake-npm@1.0.0',
        }]);
    });
  });

  describe('project scripts', () => {
    const tmpFilePath = path.join(fixture, '1');
    beforeEach(async () => {
      await fs.rm(tmpFilePath, { force: true });
    });
    afterEach(async () => {
      await fs.rm(tmpFilePath, { force: true });
    });
    it('should run project lifecycle scripts', async () => {
      const scripts = new Scripts({
        ...fakeOptions,
        pkg: {
          name: 'fake-npm',
          version: 'fake-version-1.0.0',
          scripts: {
            postinstall: 'echo postinstall > 1',
          },
        },
      });
      await scripts.runProjectLifecycleScripts();
      assert.strictEqual(await fs.readFile(tmpFilePath, 'utf-8'), 'postinstall\n');
    });

    it('should run prepublish/preprepare/prepare/postprepare scripts', async () => {
      const scripts = new Scripts({
        ...fakeOptions,
        pkg: {
          name: 'fake-npm',
          version: 'fake-version-1.0.0',
          scripts: {
            prepublish: 'echo prepublish >> 1',
            preprepare: 'echo preprepare >> 1',
            prepare: 'echo prepare >> 1',
            postprepare: 'echo postprepare >> 1',
          },
        },
      });
      await scripts.runProjectLifecycleScripts();
      const fileContent = await fs.readFile(tmpFilePath, 'utf8');
      assert.strictEqual(fileContent.toString(), 'prepublish\npreprepare\nprepare\npostprepare\n');
    });

    describe('project scripts', async () => {
      const fixtures = path.join(__dirname, './fixtures/project-scripts');
      beforeEach(async () => {
        mm(process.env, NYDUS_CSI_ROOT_ENV, 'true');
        mm(process, 'cwd', () => fixtures);
        mm(nydusd, 'startNydusFs', async () => { });
        mm(downloadDependency, 'download', async () => {
          return {
            depsTree: [ 1 ],
          };
        });
        await fs.rm(path.join(fixtures, '1'), { force: true });
        mm(util, 'getWorkdir', () => ({
          upper: upperdir,
          depsJSONPath: path.join(fixture, '.package-lock.json'),
          baseDir: fixture,
          tarIndex: path.join(fixtures, 'index.json'),
        }));

      });
      afterEach(async () => {
        await fs.rm(path.join(fixtures, '1'), { force: true });
        mm.restore();
      });

      it('should run all project installation scripts', async () => {
        const pkg = require(path.join(fixtures, 'package.json'));
        await install({
          httpclient,
          pkg,
          cwd: fixtures,
          console: global.console,
          depsTreePath: path.join(fixtures, 'package-lock.json'),
        });

        const fileContent = await fs.readFile(path.join(fixtures, '1'), 'utf8');
        assert.strictEqual(fileContent.toString(), 'preinstall\ninstall\npostinstall\nprepublish\npreprepare\nprepare\npostprepare\n');
        const fileContent2 = await fs.readFile(path.join(fixtures, 'apps/a/1'), 'utf8');
        assert.strictEqual(fileContent2.toString(), 'preinstall\ninstall\npostinstall\nprepublish\npreprepare\nprepare\npostprepare\n');
      });
    });
  });
});
