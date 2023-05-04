'use strict';

class ArboristLogger {
  silly() {
    // this.write(..._, 'SILLY');
  }

  http(...args) {
    this.write(...args, 'HTTP');
  }

  error(...args) {
    this.write(...args, 'ERROR');
  }

  warn(...args) {
    this.write(...args, 'WARN');
  }

  info(...args) {
    this.write(...args, 'INFO');
  }

  debug(...args) {
    this.write(...args, 'DEBUG');
  }

  log(...args) {
    this.write(...args, 'LOG');
  }

  write(...args) {
    console.log(...args);
  }
}

module.exports = ArboristLogger;
