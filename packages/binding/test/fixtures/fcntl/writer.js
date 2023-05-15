'use strict';

const binding = require('@cnpmjs/binding');
const path = require('node:path');

const fp = path.join(__dirname, './a.txt');

async function main() {
  const fc = new binding.Fcntl(fp);

  return fc.isLocked();
}

main()
  .then(console.info)
  .catch(console.error);

