'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');


class TestUtil {
  static async readFixtureJson(fixtureDir, name) {
    return JSON.parse(await fs.readFile(path.join(__dirname, fixtureDir, name), 'utf8'));
  }
}

module.exports = TestUtil;
