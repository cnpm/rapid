'use strict';

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const assert = require('node:assert');
const coffee = require('coffee');
const rapid = path.join(__dirname, '../node_modules/.bin/rapid');
const fixtures = path.join(__dirname, 'fixtures');
const mm = require('mm');
const { clean } = require('@cnpmjs/rapid');

describe('test/tnpm-install-rapid.test.js', () => {
  let fixture;
  afterEach(async () => {
    await clean(fixture);
  });

  describe('nodeEnv is prod', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'prod-deps-v2');
    });

    it('should generate deps tree', async () => {
      await coffee.fork(rapid, [
        '--production',
        `--deps-tree-path=${path.join(fixture, 'package-lock.json')}`,
      ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
      await assert.rejects(fs.stat(path.join(fixture, 'node_modules/object-pipeline')));
    });
  });

  describe('nodeEnv is all', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'all-deps');
    });

    it('should generate deps tree', done => {
      coffee.fork(rapid, [ `--deps-tree-path=${path.join(fixture, 'package-lock.json')}` ], { cwd: fixture })
        .debug(0)
        .expect('code', 0)
        .expect('stdout', /preinstall\./)
        .expect('stdout', /postinstall\./)
        .end(() => {
          done();
        });
    });
  });

  describe('argument abbreviation', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'prod-deps-v2');
    });

    it('should work with argument abbreviation', async () => {
      await coffee.fork(rapid, [ '--production', `--deps-tree-path=${path.join(fixture, 'package-lock.json')}` ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('--deps-tree-path args', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'local-deps-tree');
      // mock linux+fuse system
      mm(os, 'type', () => {
        return 'Linux';
      });
      mm(fs, 'stat', async () => {
        return {
          dev: 115,
          mode: 8624,
          nlink: 1,
          uid: 0,
          gid: 0,
          rdev: 10,
          blksize: 4096,
          ino: 1813631,
          size: 0,
          blocks: 0,
          atimeMs: 1623058357707.611,
          mtimeMs: 1623058357707.611,
          ctimeMs: 1623058357707.611,
          birthtimeMs: 0,
          atime: '2021-06-07T09:32:37.708Z',
          mtime: '2021-06-07T09:32:37.708Z',
          ctime: '2021-06-07T09:32:37.708Z',
          birthtime: '1970-01-01T00:00:00.000Z',
        };
      });
    });

    it('should generate deps tree', done => {
      coffee.fork(rapid, [ '--deps-tree-path=./tree.json' ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end(() => {
          done();
        });
    });
  });

  describe('--by=npminstall', done => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'local-deps-tree');
    });

    it('should work', async () => {
      coffee.fork(rapid, [
        '--by=npminstall',
        '--deps-tree-path=./package-lock.json',
      ], {
        cwd: fixture,
      })
        .debug()
        .expect('code', 0)
        .end(done);
    });
  });
});
