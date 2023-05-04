'use strict';

const nock = require('nock');

nock('https://npmcore.antfin-inc.com')
  .post('/api/v2/tree')
  .reply(200, {
    success: true,
    data: require('./tree-v2.json'),
  });
