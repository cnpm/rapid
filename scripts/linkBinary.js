'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const util = require('node:util');
const process = require('node:process');

const { platform, arch } = process;

const pkgName = util.format('@cnpmjs/binding-%s-%s', platform, arch);
const linkTarget = path.join(__dirname, '..', 'node_modules', pkgName);
const linkSrc = path.join(__dirname, '..', 'packages/binding/npm', util.format('binding-%s-%s', platform, arch));

(async () => {
  await fs.symlink(path.relative(path.dirname(linkTarget), linkSrc), linkTarget);
})();