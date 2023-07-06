'use strict';

const os = require('node:os');
const util = require('node:util');

class NotSupportedError extends Error {
  constructor(message) {
    super(util.format('Rapid mode not supported on Current OS(%s)', os.type()), message ? `, ${message}` : '');
    this.name = 'NOT_SUPPORTED';
    this.stack = '';
  }
}

class FuseDeviceError extends Error {
  constructor() {
    super('`/dev/fuse` not available which is a prerequisite for rapid mode');
    this.name = 'FUSE_DEVICE_ERROR';
    this.stack = '';
  }
}

exports.NotSupportedError = NotSupportedError;
exports.FuseDeviceError = FuseDeviceError;
