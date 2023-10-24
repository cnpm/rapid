#!/usr/bin/env node

'use strict';

const { clean, install, list } = require('../lib/index.js');
const yargs = require('yargs');
const { NpmFsMode, NYDUS_TYPE } = require('../lib/constants.js');
const util = require('../lib/util');

yargs
  .command({
    command: 'install',
    aliases: [ 'i', 'ii' ],
    describe: 'Install dependencies',
    builder: yargs => {
      return yargs
        .option('ignore-scripts', {
          describe: 'Skip running scripts during install',
          type: 'boolean',
        })
        .option('by', {
          describe: 'Set the installation mode, support npm or npminstall',
          type: 'string',
        });
    },
    handler: async argv => {
      const ignoreScripts = argv['ignore-scripts'];
      const mode = argv.by || NpmFsMode.NPM;

      const cwd = process.cwd();
      const pkgRes = await util.readPkgJSON();
      const pkg = pkgRes?.pkg || {};

      await util.shouldFuseSupport();
      await install({
        cwd,
        pkg,
        mode,
        nydusMode: NYDUS_TYPE.FUSE,
        ignoreScripts,
      });

      console.log('[rapid] install finished');
      // 首次执行 nydusd 后台服务可能会 hang 住输入
      process.exit(0);
    },
  })
  .command({
    command: 'clean',
    aliases: [ 'c', 'unmount', 'uninstall' ],
    describe: 'Clean up the project',
    handler: async () => {
      const cwd = process.cwd();
      await clean({ nydusMode: NYDUS_TYPE.FUSE, cwd, force: false });
      console.log('[rapid] clean finished');
    },
  })
  .command({
    command: 'list',
    aliases: 'l',
    describe: 'List rapid mount info',
    handler: async () => {
      const cwd = process.cwd();
      await list(cwd);
    },
  })
  .help()
  .parse();
