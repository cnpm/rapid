const fs = require('node:fs');
const path = require('node:path');

fs.writeFileSync(path.join(__dirname, '1.json'), JSON.stringify(process.env, null, 2));
