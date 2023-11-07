'use strict';

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const coffee = require('coffee');
const rapid = path.join(__dirname, '../node_modules/.bin/rapid');
const fixtures = path.join(__dirname, 'fixtures');
const mm = require('mm');
const { clean } = require('@cnpmjs/rapid');
const {
  exitDaemon,
  forceExitDaemon,
} = require('@cnpmjs/rapid/lib/nydusd/nydusd_api');

describe('test/index.test.js', () => {
  let fixture;
  afterEach(async () => {
    await clean({
      cwd: fixture,
    });
    if (process.platform === 'darwin') {
      await forceExitDaemon();
    } else {
      await exitDaemon();
    }
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
    afterEach(() => {
      mm.restore();
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
