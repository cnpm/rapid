#!/usr/bin/env node

'use strict';


const { clean, install } = require('../lib/index.js');
const parser = require('yargs-parser');
const { NpmFsMode } = require('../lib/constants.js');
const httpclient = require('../lib/httpclient');
const util = require('../lib/util');

async function runner() {
  const params = parser(process.argv.slice(2), {
    alias: {
      'save-dev': [ 'D' ],
      save: [ 'save-prod', 'S', 'P' ],
      'save-optional': [ 'O' ],
      'save-bundle': [ 'B' ],
      'save-exact': [ 'E' ],
      version: [ 'v' ],
      usage: [ 'H', 'h', 'help', '?' ],
      global: [ 'g' ],
      detail: [ 'd' ],
      mode: [ 'by' ],
      prefix: [ 'C' ],
      registry: [ 'reg' ],
    },
    boolean: [
      'clean',
      'save',
      'save-dev',
      'save-optional',
      'save-bundle',
      'save-peer',
      'save-exact',
      'version',
      'usage',
      'global',
      'detail',
      'update',
      'package-lock-only',
      'ignore-scripts',
      'experimental-local-resolver',
      'legacy-peer-deps',
      'force',
      'strict-peer-deps',
      'update-lockfile',
    ],
    string: [
      'registry',
      'prefix',
      'deps-tree-path',
      'lock-id',
      'mode',
      'omit',
      'cache-dir',
    ],
  });

  const cwd = params.prefix || process.cwd();
  if (params.clean) {
    await clean(cwd);
  } else {
    const pkgRes = await util.readPkgJSON();
    const pkg = pkgRes?.pkg || {};
    await install({
      ...params,
      cwd,
      pkg,
      registry: params.registry || 'https://registry.npmjs.org',
      mode: params.mode || NpmFsMode.NPM,
      env: process.env,
      httpclient,
    });
  }
}

runner()
  .then(() => {
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
