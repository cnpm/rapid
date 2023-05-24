'use strict';

const { HttpClient } = require('urllib');
const pkg = require('../package.json');

const httpclient = new HttpClient({
  defaultArgs: {
    headers: {
      referer: `${pkg.name}@${pkg.version}`,
    },
  },
});

module.exports = httpclient;
