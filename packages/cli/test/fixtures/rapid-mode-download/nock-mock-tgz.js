'use strict';

const nock = require('nock');
const fs = require('node:fs');
const path = require('node:path');
const tgzFile = path.join(__dirname, './lodash.has-4.5.2.tgz');

nock('https://registry.npm.alibaba-inc.com', { allowUnmocked: true })
  .persist() // nock all get requests
  .get(/.*/)
  .reply(200, Buffer.from(fs.readFileSync(tgzFile), 'utf-8'));

nock('https://tnpmstore.cn-hangzhou.alipay.aliyun-inc.com', { allowUnmocked: true })
  .persist() // nock all get requests
  .get(/.*/)
  .reply(200, Buffer.from(fs.readFileSync(tgzFile), 'utf-8'));

