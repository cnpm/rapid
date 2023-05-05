'use strict';

const assert = require('node:assert');
const path = require('node:path');
const httpclient = require('../lib/httpclient');
const DepResolver = require('../lib/dep');

describe('test/dep.test.js', () => {
  describe('local cache resolve', () => {
    it('should read load cache', async () => {
      const resolver = new DepResolver({
        httpclient,
        cwd: '/dev/null',
        pkg: {},
        lockId: null,
        depsTreePath: path.join(__dirname, 'fixtures/rapid-mode-download-local-deps/tree.json'),
        update: {
          all: false,
          names: [],
        },
      });
      await resolver.resolve();
    });
  });

  describe('local resolve', () => {
    const cwd = path.join(__dirname, 'fixtures/local_resolver');
    it('should generate true', async () => {
      const resolver = new DepResolver({
        httpclient,
        cwd: cwd,
        pkg: require(path.join(cwd, 'package.json')),
        lockId: null,
        depsTreePath: null,
        update: {
          all: false,
          names: [],
        },
        experimentalLocalResolver: true,
      });
      const lock = await resolver.resolve();
      assert(lock);
      assert(lock.packages['node_modules/lodash.get']);
      assert(lock.packages['node_modules/lodash.set']);
    });
  });
});
