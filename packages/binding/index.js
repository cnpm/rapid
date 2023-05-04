'use strict';

const os = require('node:os');

try {
  module.exports = require('./index.node');
} catch (_) {
  module.exports = require(`@cnpmjs/binding-${os.platform()}-${os.arch()}`);
}
