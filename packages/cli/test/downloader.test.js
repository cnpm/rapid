'use strict';

const assert = require('node:assert');
const Downloader = require('../lib/downloader');
const Util = require('./fixtures/util');

describe('test/downloader.test.js', () => {
  describe('optional dep', () => {
    it('should skip cpu/os not match and optional dep', async () => {
      const pkgLockJson = await Util.readFixtureJson('package-locks', 'optional.json');
      const downloader = new Downloader({
        platform: 'linux',
        arch: 'aarch64',
      });
      const tasks = downloader.createDownloadTask(pkgLockJson);
      assert.deepStrictEqual(tasks, [{
        id: 'bindings@1.5.0',
        name: 'bindings',
        version: '1.5.0',
        sha: 'sha1-EDU8npRTNLwFEabZCzj7x8nFBN8=',
        url: 'https://registry.npmjs.org/bindings/-/bindings-1.5.0.tgz',
        pkg: {
          version: '1.5.0',
          resolved: 'https://registry.npmjs.org/bindings/-/bindings-1.5.0.tgz',
          integrity: 'sha1-EDU8npRTNLwFEabZCzj7x8nFBN8=',
          optional: true,
          dependencies: {
            'file-uri-to-path': '1.0.0',
          },
        },
      }, {
        id: 'file-uri-to-path@1.0.0',
        name: 'file-uri-to-path',
        version: '1.0.0',
        sha: 'sha1-VTp7hEb/b2hDWcRF8eN6BdrMM90=',
        url: 'https://registry.npmjs.org/file-uri-to-path/download/file-uri-to-path-1.0.0.tgz',
        pkg: {
          version: '1.0.0',
          resolved: 'https://registry.npmjs.org/file-uri-to-path/download/file-uri-to-path-1.0.0.tgz',
          integrity: 'sha1-VTp7hEb/b2hDWcRF8eN6BdrMM90=',
          optional: true,
        },
      }, {
        id: 'nan@2.15.0',
        name: 'nan',
        version: '2.15.0',
        sha: 'sha1-PzSkc/8Y4VwbVia2KQO1rW5mX+4=',
        url: 'https://registry.npmjs.org/nan/-/nan-2.15.0.tgz',
        pkg: {
          version: '2.15.0',
          resolved: 'https://registry.npmjs.org/nan/-/nan-2.15.0.tgz',
          integrity: 'sha1-PzSkc/8Y4VwbVia2KQO1rW5mX+4=',
          optional: true,
        },
      }]);
    });
  });

  describe('dev dep', () => {
    it('should skip dev dep when prod install', async () => {
      const pkgLockJson = await Util.readFixtureJson('package-locks', 'dev.json');
      const downloader = new Downloader({
        platform: 'linux',
        arch: 'aarch64',
        productionMode: true,
      });
      const tasks = downloader.createDownloadTask(pkgLockJson);
      assert.deepStrictEqual(tasks, []);
    });

    it('should contains debug@4.3.4 download task', async () => {
      const pkgLockJson = await Util.readFixtureJson('package-locks', 'debug.json');
      const downloader = new Downloader({
        platform: 'linux',
        arch: 'aarch64',
        productionMode: true,
      });
      const tasks = downloader.createDownloadTask(pkgLockJson);
      assert.strictEqual(tasks.filter(task => task.id === 'debug@4.3.4').length, 1);
    });

    it('should contains semver@6.x download task', async () => {
      const pkgLockJson = await Util.readFixtureJson('package-locks', 'semver.json');
      const downloader = new Downloader({
        platform: 'linux',
        arch: 'aarch64',
        productionMode: true,
      });
      const tasks = downloader.createDownloadTask(pkgLockJson);
      assert.deepStrictEqual(tasks, [
        {
          id: '@ali_crypto@1.0.4',
          name: '@ali/crypto',
          pkg: {
            dependencies: {
              'iconv-lite': '0.4.11',
              semver: '^6.1.0',
            },
            engines: {
              node: '>= 4.2.3',
            },
            integrity: 'sha1-NDje/bZYJy8MA+TeTU4aNhfbo4s=',
            resolved: 'https://registry.npmjs.org/@ali/crypto/download/@ali/crypto-1.0.4.tgz',
            version: '1.0.4',
          },
          sha: 'sha1-NDje/bZYJy8MA+TeTU4aNhfbo4s=',
          url: 'https://registry.npmjs.org/@ali/crypto/download/@ali/crypto-1.0.4.tgz',
          version: '1.0.4',
        },
        {
          id: 'semver@7.3.8',
          name: 'semver',
          pkg: {
            bin: {
              semver: 'bin/semver.js',
            },
            dependencies: {
              'lru-cache': '^6.0.0',
            },
            engines: {
              node: '>=10',
            },
            integrity: 'sha512-NB1ctGL5rlHrPJtFDVIVzTyQylMLu9N9VICA6HSFJo8MCGVTMW6gfpicwKmmK/dAjTOrqu5l63JJOpDSrAis3A==',
            resolved: 'https://registry.npmjs.org/semver/-/semver-7.3.8.tgz',
            version: '7.3.8',
          },
          sha: 'sha512-NB1ctGL5rlHrPJtFDVIVzTyQylMLu9N9VICA6HSFJo8MCGVTMW6gfpicwKmmK/dAjTOrqu5l63JJOpDSrAis3A==',
          url: 'https://registry.npmjs.org/semver/-/semver-7.3.8.tgz',
          version: '7.3.8',
        },
        {
          id: 'iconv-lite@0.4.11',
          name: 'iconv-lite',
          pkg: {
            engines: {
              node: '>=0.8.0',
            },
            integrity: 'sha1-LstC/SlHRJIiCaLnxATayHk9it4=',
            resolved: 'https://registry.npmjs.org/iconv-lite/download/iconv-lite-0.4.11.tgz',
            version: '0.4.11',
          },
          sha: 'sha1-LstC/SlHRJIiCaLnxATayHk9it4=',
          url: 'https://registry.npmjs.org/iconv-lite/download/iconv-lite-0.4.11.tgz',
          version: '0.4.11',
        },
        {
          id: 'semver@6.3.0',
          name: 'semver',
          pkg: {
            bin: {
              semver: 'bin/semver.js',
            },
            integrity: 'sha1-7gpkyK9ejO6mdoexM3YeG+y9HT0=',
            resolved: 'https://registry.npmjs.org/semver/-/semver-6.3.0.tgz',
            version: '6.3.0',
          },
          sha: 'sha1-7gpkyK9ejO6mdoexM3YeG+y9HT0=',
          url: 'https://registry.npmjs.org/semver/-/semver-6.3.0.tgz',
          version: '6.3.0',
        },
        {
          id: 'lru-cache@6.0.0',
          name: 'lru-cache',
          pkg: {
            dependencies: {
              yallist: '^4.0.0',
            },
            engines: {
              node: '>=10',
            },
            integrity: 'sha1-bW/mVw69lqr5D8rR2vo7JWbbOpQ=',
            resolved: 'https://registry.npmjs.org/lru-cache/download/lru-cache-6.0.0.tgz',
            version: '6.0.0',
          },
          sha: 'sha1-bW/mVw69lqr5D8rR2vo7JWbbOpQ=',
          url: 'https://registry.npmjs.org/lru-cache/download/lru-cache-6.0.0.tgz',
          version: '6.0.0',
        },
        {
          id: 'yallist@4.0.0',
          name: 'yallist',
          pkg: {
            integrity: 'sha1-m7knkNnA7/7GO+c1GeEaNQGaOnI=',
            resolved: 'https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz',
            version: '4.0.0',
          },
          sha: 'sha1-m7knkNnA7/7GO+c1GeEaNQGaOnI=',
          url: 'https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz',
          version: '4.0.0',
        },
      ]);
    });
  });
});
