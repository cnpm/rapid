'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { name } = require('./package.json');
const checkFiles = [
  'index.node',
  // 'nydusd',
  // 'nydusd-bootstrap',
  'rapid_deamon',
];

for (const file of checkFiles) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`file ${file} not exits in package ${name}`);
    process.exit(1);
  }
}


function fixOs() {
  const jsonPath = path.join(__dirname, 'package.json');
  const pkgStr = fs.readFileSync(jsonPath, 'utf8');
  const pkgJson = Object.assign({
    os: [ 'darwin' ],
    arch: [ 'arm64' ],
  }, JSON.parse(pkgStr));
  fs.writeFileSync(jsonPath, JSON.stringify(pkgJson, null, 2));
}

fixOs();


process.exit(0);
