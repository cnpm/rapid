#!/usr/bin/env node

'use strict';

const { clean, install, list } = require('../lib/index.js');
const yargs = require('yargs');
const { NpmFsMode, NYDUS_TYPE } = require('../lib/constants.js');
const util = require('../lib/util');
const fuse_t = require('../lib/fuse_t');

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
        })
        .option('production', {
          describe: 'Will not install modules listed in devDependencies',
          type: 'boolean',
        })
        .option('omit', {
          describe: 'Dependency types to omit from the installation tree on disk',
          type: 'array',
          default: [],
        });
    },
    handler: async argv => {
      const ignoreScripts = argv['ignore-scripts'];
      const mode = argv.by || NpmFsMode.NPM;
      const productionMode = argv.production || argv.omit.includes('dev') || process.env.NODE_ENV === 'production';

      const cwd = process.cwd();
      const pkgRes = await util.readPkgJSON();
      const pkg = pkgRes?.pkg || {};
      if (!(await fuse_t.checkFuseT())) {
        if (await fuse_t.confirmInstallFuseT()) {
          await fuse_t.installFuseT();
        }
      }

      await util.shouldFuseSupport();
      await install({
        cwd,
        pkg,
        mode,
        nydusMode: NYDUS_TYPE.FUSE,
        ignoreScripts,
        productionMode,
      });

      console.log('[rapid] install finished');
      // 首次执行 nydusd 后台服务可能会 hang 住输入
      process.exit(0);
    },
  })
  .command({
    command: 'clean [path]',
    aliases: [ 'c', 'unmount', 'uninstall' ],
    describe: 'Clean up the project',
    handler: async argv => {
      const cwd = argv.path || process.cwd();
      await clean({ nydusMode: NYDUS_TYPE.FUSE, cwd, force: true });
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
