'use strict';

const assert = require('node:assert');
const mm = require('mm');
const os = require('node:os');
const fs = require('node:fs/promises');
const {
  getDisplayName,
  wrapSudo,
  generateBin,
  getWorkdir,
  resolveBinMap,
  getPkgNameFromTarballUrl,
  validDep,
} = require('../lib/util.js');

const mockDepLodash = {
  name: 'lodash',
  version: '1.0.0',
};

const nydusConfigFilePath = '/tmp/nydus.json';


describe('test/cache/util.test.js', () => {
  afterEach(async () => {
    await fs.rm(nydusConfigFilePath, { force: true, recursive: true });
  });

  it('getDisplayName should work', () => {
    const displayName = getDisplayName(mockDepLodash, 'npminstall');
    assert.strictEqual(displayName, '_lodash@1.0.0@lodash');
  });

  it('getDisplayName should work with npm', () => {
    const displayName = getDisplayName(mockDepLodash, 'npm');
    assert.strictEqual(displayName, 'lodash@1.0.0');
  });

  describe('wrapSudo', () => {
    afterEach(mm.restore);
    it('should cwd work', () => {
      mm(os, 'userInfo', () => ({
        username: 'root',
      }));
      const sh = wrapSudo('ls');
      assert.strictEqual(sh, 'ls');
    });
    it('should admin work', () => {
      mm(os, 'userInfo', () => ({
        username: 'admin',
      }));
      const sh = wrapSudo('ls');
      assert.strictEqual(sh, 'sudo ls');
    });
  });

  describe('generate bin', () => {
    it('should work with flattened pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: 'pkg/test',
        pkgPath: 'pkg',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../pkg/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with scoped pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: '@alipay/pkg/test',
        pkgPath: '@alipay/pkg',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../@alipay/pkg/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with sub pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: 'pkg/node_modules/a/test',
        pkgPath: 'pkg/node_modules/a',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: 'pkg/node_modules/.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../a/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with sub scoped pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: '@alipay/pkg/node_modules/a/test',
        pkgPath: '@alipay/pkg/node_modules/a',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '@alipay/pkg/node_modules/.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../a/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
    it('should work with sub scoped pkg with scoped parent pkg', () => {
      const result = generateBin({
        binName: 'test',
        binPath: '@alipay/pkg/node_modules/@alipay/a/test',
        pkgPath: '@alipay/pkg/node_modules/@alipay/a',
        uid: '0',
        gid: '0',
      });

      assert.deepStrictEqual(result, {
        name: '@alipay/pkg/node_modules/.bin/test',
        type: 'symlink',
        size: 0,
        linkName: '../@alipay/a/test',
        mode: 493,
        uid: '0',
        gid: '0',
        gname: 'admin',
        uname: 'admin',
        offset: 0,
        devMajor: 0,
        devMinor: 0,
        NumLink: 0,
        digest: '',
      });
    });
  });

  describe('getWorkdir', () => {
    before(() => {
      mm(process, 'cwd', () => '/cwd');
    });

    after(mm.restore);
    it('should getWorkdir work', async () => {
      const result = await getWorkdir(process.cwd());
      assert.deepStrictEqual(result, {
        nodeModulesDir: '/cwd/node_modules',
        dirname: 'cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e',
        baseDir: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e`,
        overlay: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay`,
        upper: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay/upper`,
        workdir: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay/workdir`,
        mnt: `${os.homedir()}/.rapid/cache/mnt/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e`,
        tarIndex: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/tar.index.json`,
        bootstrap: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/nydusd-bootstrap`,
        depsJSONPath: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/overlay/upper/.package-lock.json`,
        csiMountId: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2/root_d41d8cd98f00b204e9800998ecf8427e/csi_mount_id.txt`,
        projectDir: `${os.homedir()}/.rapid/cache/cwd_a875d54f3f579b69acac56867277fbf2`,
      });

    });
  });

  describe('resolveBinMap', () => {
    it('should work with single bin', async () => {
      const result = resolveBinMap({
        name: 'a',
        version: '1.0.0',
        bin: 'a.js',
      });

      assert.deepStrictEqual(result, {
        'a.js': [ 'a' ],
      });
    });
    it('should work with multiple bins with the same file', async () => {
      const result = resolveBinMap({
        name: 'a',
        version: '1.0.0',
        bin: {
          a: 'a.js',
          'a-cli': 'a.js',
        },
      });

      assert.deepStrictEqual(result, {
        'a.js': [ 'a', 'a-cli' ],
      });
    });
    it('should work with multiple bins with different files', async () => {
      const result = resolveBinMap({
        name: 'a',
        version: '1.0.0',
        bin: {
          a: 'a.js',
          b: 'b.js',
        },
      });

      assert.deepStrictEqual(result, {
        'a.js': [ 'a' ],
        'b.js': [ 'b' ],
      });
    });
  });

  describe('parseTarballUrl', () => {
    it('should parse successfully with old non-scoped tarball url', () => {
      const name = getPkgNameFromTarballUrl('https://registry.npmjs.org/egg/download/egg-2.15.1.tgz');
      assert.strictEqual(name, 'egg');
    });
    it('should parse successfully with old scoped tarball url', () => {
      const name = getPkgNameFromTarballUrl('https://registry.npmjs.org/@cnpmjs/errors/download/@cnpmjs/errors-2.15.1.tgz');
      assert.strictEqual(name, '@cnpmjs/errors');
    });
    it('should parse successfully with new non-scoped tarball url', () => {
      const name = getPkgNameFromTarballUrl('https://registry.npmjs.org/egg/-/egg-2.15.1.tgz');
      assert.strictEqual(name, 'egg');
    });
    it('should parse successfully with new scoped tarball url', () => {
      const name = getPkgNameFromTarballUrl('https://registry.npmjs.org/@cnpmjs/errors/-/errors-2.15.1.tgz');
      assert.strictEqual(name, '@cnpmjs/errors');
    });
  });
});

describe('validDep', () => {
  it('should omit dev deps when in production mode', () => {
    const willInstall = validDep({
      dev: true,
    }, true);
    assert.equal(willInstall, false);
  });

  it('should omit optional & dev des when in production mode', () => {
    const willInstall = validDep({
      dev: true,
      optional: true,
    }, true);

    assert.strictEqual(willInstall, false);
  });

  it('should install dev deps when not in production mode', () => {
    const willInstall = validDep({
      dev: true,
    }, false);
    assert.equal(willInstall, true);
  });

  it('should omit optional deps when in different platform', () => {
    const willInstallMacDepUnderLinux = validDep({
      optional: true,
      os: [
        'darwin',
      ],
    }, false, 'aarch64', 'linux');
    assert.equal(willInstallMacDepUnderLinux, false);

    const willInstallLinuxDepUnderMac = validDep({
      optional: true,
      cpu: [
        'x64',
      ],
      os: [
        'linux',
      ],
    }, false, 'x64', 'darwin');
    assert.equal(willInstallLinuxDepUnderMac, false);
  });

  it('should install optional deps when in matched platform', () => {
    const willInstallLinuxDepUnderLinux = validDep({
      optional: true,
      cpu: [
        'x64',
      ],
      os: [
        'linux',
      ],
    }, false, 'x64', 'linux');
    assert.equal(willInstallLinuxDepUnderLinux, true);
  });
});
