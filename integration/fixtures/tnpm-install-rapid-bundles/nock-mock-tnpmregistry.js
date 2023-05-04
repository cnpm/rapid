'use strict';

const nock = require('nock');

nock('https://npm.antfin-inc.com')
  .post('/api/v1/tree')
  .reply(200, {
    success: true,
    data: require('./tree.json'),
  });
