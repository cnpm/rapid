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

  describe('nodeEnv is prod, test chair', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-chair');
    });

    it('should generate deps tree', done => {
      coffee.fork(rapid, [
        '--fs=rapid',
        '--production',
        '--registry=https://registry.npm.alibaba-inc.com',
      ], { cwd: fixture })
        .debug()
        .end(done);
    });
  });
  describe('nodeEnv is prod', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-prod');
    });

    it('should generate deps tree', async () => {
      await coffee.fork(rapid, [
        '--fs=rapid',
        '--production',
      ], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
      await assert.rejects(fs.stat(path.join(fixture, 'node_modules/object-pipeline')));
    });
  });

  describe('nodeEnv is all', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-all');
    });

    it('should generate deps tree', done => {
      coffee.fork(rapid, ['--fs=rapid'], { cwd: fixture })
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
      fixture = path.join(fixtures, 'tnpm-install-rapid-prod');
    });

    it('should work with argument abbreviation', async () => {
      await coffee.fork(rapid, ['--production'], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('bundledDependencies', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'tnpm-install-rapid-bundles');
    });

    it('should generate deps tree', done => {
      coffee.fork(rapid, ['--fs=rapid'], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end(() => {
          done();
        });
    });
  });

  // TODO 这个目录迷之消失了。。
  describe.skip('peerDependencies', () => {
    const fixture = path.join(fixtures, 'tnpm-install-rapid-peer');
    beforeEach(async () => await fs.rm(path.join(fixture, 'node_modules'), { recursive: true, force: true }));
    afterEach(async () => await fs.rm(path.join(fixture, 'node_modules'), { recursive: true }));
    it('should generate deps tree', done => {
      coffee.fork(rapid, ['--fs=rapid'], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end(() => {
          done();
        });
    });
  });

  describe('--deps-tree-path args', () => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-download-local-deps');
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
      coffee.fork(rapid, ['--by=rapid', '--deps-tree-path=./tree.json'], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end(() => {
          done();
        });
    });
  });


  describe('--by=rapid and mode is npm or yarn', () => {

    beforeEach(async () => {
      fixture = path.join(fixtures, 'rapid-mode-force-to-yarn-mode');
      await clean(fixture);
    });

    it('should use npm or yarn mode', done => {
      coffee.fork(rapid, ['--by=rapid'], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .expect('stdout', /added 1 package/)
        .end(() => {
          done();
        });
    });
  });

  describe('--by=rapid using deps tree v2', done => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-dep-tree-v2');
    });
    it('should work', async () => {
      coffee.fork(rapid, ['--by=rapid', '--deps-tree-path=./tree-v2.json'], { cwd: fixture })
        .debug()
        .expect('code', 0)
        .end(done);
    });
  });

  describe('--by=npminstall --fs=rapid', done => {
    beforeEach(() => {
      fixture = path.join(fixtures, 'rapid-mode-download-local-deps');
    });

    it('should work', async () => {
      coffee.fork(rapid, [
        '--by=npminstall',
        '--fs=rapid',
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
