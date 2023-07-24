'use strict';

const os = require('node:os');
const path = require('node:path');


const arch = os.arch();
const platform = os.platform();

module.exports = require(`@cnpmjs/binding-${os.platform()}-${arch}`);
module.exports.rsBindingPath = path.dirname(require.resolve(`@cnpmjs/binding-${platform}-${arch}`));
