#!/usr/bin/env node

'use strict';

const { clean, install, list } = require('../lib/index.js');
const yargs = require('yargs');
const { NpmFsMode, NYDUS_TYPE } = require('../lib/constants.js');
const util = require('../lib/util');
const fuse_t = require('../lib/fuse_t');
const { Alert } = require('../lib/logger.js');

const argv = yargs
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
        })
        .option('package-lock', {
          describe: 'Whether to generate package-lock.json file',
          type: 'boolean',
          default: true,
        });
    },
    handler: async argv => {
      const ignoreScripts = argv['ignore-scripts'];
      const mode = argv.by || NpmFsMode.NPM;
      const productionMode = argv.production || argv.omit.includes('dev') || process.env.NODE_ENV === 'production';
      const noPackageLock = !argv['package-lock'];

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
        noPackageLock,
      });

      Alert.success('🚀 Success', [
        'All dependencies have been successfully installed.',
        'Please refrain from using `rm -rf node_modules` directly.',
        'Consider using `rapid clean` or `rapid update` as alternatives.',
      ]);
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
  .fail((_, err) => {
    Alert.error('🚨 Error', [
      err,
      'To enable debug mode, add the NODE_DEBUG=rapid before running the command.',
      'If the problem continues, please provide feedback at:',
      'https://github.com/cnpm/rapid/issues',
    ]);
    process.exitCode = 1;
  })
  .help()
  .parse();


if (argv._?.length === 0) {
  yargs.showHelp();
}
