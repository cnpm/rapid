'use strict';

const assert = require('node:assert');
const nock = require('nock');
const path = require('node:path');
const httpclient = require('../lib/httpclient');
const DepResolver = require('../lib/dep');
const Tree = require('./fixtures/rapid-mode-download-local-deps/tree.json');

describe('test/dep.test.js', () => {
  let generateTreeScope;
  let getTreeScope;

  beforeEach(() => {
    generateTreeScope = nock('https://npmcore.antfin-inc.com')
      .post('/api/v2/tree')
      .reply(200, {
        success: true,
        data: { treeId: 'foo', tree: Tree },
      });

    getTreeScope = nock('https://npmcore.antfin-inc.com')
      .get('/api/v2/tree/foo')
      .reply(200, {
        success: true,
        data: { tree: Tree },
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('remote cache resolve', () => {
    it('should download tree', async () => {
      const resolver = new DepResolver({
        httpclient,
        cwd: '/dev/null',
        pkg: {},
        lockId: 'foo',
        depsTreePath: null,
        update: {
          all: false,
          names: [],
        },
      });
      await resolver.resolve();
      assert(getTreeScope.isDone());
      assert(!generateTreeScope.isDone());
    });
  });

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
      assert(!getTreeScope.isDone());
      assert(!generateTreeScope.isDone());
    });
  });

  describe('remote resolve', () => {
    it('should generate true', async () => {
      const resolver = new DepResolver({
        httpclient,
        cwd: '/dev/null',
        pkg: {
          name: 'foo',
        },
        lockId: null,
        depsTreePath: null,
        update: {
          all: false,
          names: [],
        },
      });
      await resolver.resolve();
      assert(!getTreeScope.isDone());
      assert(generateTreeScope.isDone());
    });
  });

  describe('remote resolve with workspaces', () => {
    it('should work', async () => {
      const cwd = path.join(__dirname, './fixtures/workspaces');
      const resolver = new DepResolver({
        httpclient,
        cwd,
        cwd: cwd,
        pkg: {
          name: 'name',
          workspaces: ['apps/*'],
        },
        lockId: null,
        depsTreePath: null,
        update: {
          all: false,
          names: [],
        },
      });
      await resolver.resolve();
      assert(!getTreeScope.isDone());
      assert(generateTreeScope.isDone());
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
