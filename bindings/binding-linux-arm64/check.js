'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { name } = require('./package.json');
const checkFiles = [
  'index.node',
  'nydusd',
  'nydusd-bootstrap',
];

for (const file of checkFiles) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`file ${file} not exits in package ${name}`);
    process.exit(1);
  }
}

process.exit(0);