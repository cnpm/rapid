'use strict';

const assert = require('node:assert');
const path = require('node:path');
const execa = require('execa');
const fs = require('node:fs/promises');
const {
  download,
  Downloader,
  Fcntl,
} = require('..');

describe('test/index.test.js', () => {
  const tasks = [
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/umi-4.0.7.tgz', name: 'umi', version: '4.0.7' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/@ant-design/colors-6.0.0.tgz', name: '@ant-design/colors', version: '6.0.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/@ant-design/icons-4.7.0.tgz', name: '@ant-design/icons', version: '4.7.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/@ant-design/react-slick-0.29.2.tgz', name: '@ant-design/react-slick', version: '0.29.2' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/@babel/runtime-7.18.6.tgz', name: '@babel/runtime', version: '7.18.6' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/@ctrl/tinycolor-3.4.1.tgz', name: '@ctrl/tinycolor', version: '3.4.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/classnames-2.3.1.tgz', name: 'classnames', version: '2.3.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/copy-to-clipboard-3.3.1.tgz', name: 'copy-to-clipboard', version: '3.3.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/lodash-4.17.21.tgz', name: 'lodash', version: '4.17.21' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/memoize-one-6.0.0.tgz', name: 'memoize-one', version: '6.0.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/moment-2.29.4.tgz', name: 'moment', version: '2.29.4' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-cascader-3.6.1.tgz', name: 'rc-cascader', version: '3.6.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-checkbox-2.3.2.tgz', name: 'rc-checkbox', version: '2.3.2' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-collapse-3.3.1.tgz', name: 'rc-collapse', version: '3.3.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-dialog-8.9.0.tgz', name: 'rc-dialog', version: '8.9.0' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-drawer-4.4.3.tgz', name: 'rc-drawer', version: '4.4.3' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-dropdown-4.0.1.tgz', name: 'rc-dropdown', version: '4.0.1' },
    { sha: 'mock_sha', url: 'http://127.0.0.1:8000/rc-field-form-1.26.7.tgz', name: 'rc-field-form', version: '1.26.7' },
  ];

  it('should work', async () => {
    const entries = [];
    const opts = {
      bucketCount: 40,
      httpConcurrentCount: 40,
      downloadDir: path.join(__dirname, 'fixtures/tars'),
      entryWhitelist: [ '*/package.json' ],
      downloadTimeout: 30000,
      entryListener: entry => {
        entries.push(entry);
      },
    };
    const result = await download(tasks, opts);
    assert(result);
    assert.equal(entries.length, 19);
  });

  it('should work', async () => {
    const tasks = [
      { sha: 'mock_sha', url: 'http://127.0.0.1:8000/lodash-4.17.21.tgz', name: 'lodash', version: '4.17.21' },
    ];
    const entries = [];
    const opts = {
      bucketCount: 40,
      httpConcurrentCount: 40,
      downloadTimeout: 30000,
      downloadDir: path.join(__dirname, 'fixtures/tars'),
      entryWhitelist: [ '*/package.json' ],
      entryListener: entry => {
        entries.push(entry);
      },
    };
    const result = await download(tasks, opts);
    assert(result);
  });

  describe('Downloader', () => {
    it('download should work', async () => {
      const entries = [];
      const downloader = new Downloader({
        bucketCount: 40,
        httpConcurrentCount: 40,
        downloadTimeout: 30000,
        downloadDir: path.join(__dirname, 'fixtures/tars'),
        entryWhitelist: [ '*/package.json' ],
        entryListener: entry => {
          entries.push(entry);
        },
      });
      await downloader.init();
      await Promise.all(tasks.map(async task => {
        await downloader.download(task);
      }));
      const dumpContext = JSON.parse(downloader.dump());
      assert.equal(entries.length, 19);
      assert(dumpContext.tocMap);
      assert(dumpContext.indices);
    });
  });

  describe('Fcntl', () => {
    const filepath = path.join(__dirname, './fixtures/fcntl/a.txt');

    afterEach(async () => {
      await fs.rm(filepath, { force: true });
    });

    // fcntl 锁
    it('should work', async () => {
      const fcntl = new Fcntl(filepath);

      fcntl.lock();

      assert.rejects(execa('node', [
        path.join(__dirname, 'fixtures/fcntl/writer.js'),
      ], {
        stdio: 'pipe',
      }));

      fcntl.unlock();
      assert.doesNotReject(execa('node', [
        path.join(__dirname, 'fixtures/fcntl/writer.js'),
      ], {
        stdio: 'pipe',
      }));
    });
  });
});
