'use strict';

const urllib = require('urllib');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const pkg = require('../package.json');

const httpKeepaliveAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
});
const httpsKeepaliveAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 100,
  maxFreeSockets: 100,
});

const httpclient = new urllib.HttpClient2({
  httpsAgent: httpsKeepaliveAgent,
  agent: httpKeepaliveAgent,
  defaultArgs: {
    headers: {
      referer: `${pkg.name}@${pkg.version}`,
    },
  },
});

module.exports = httpclient;
