const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
for (const folder of ['src', 'scripts']) {
  for (const file of fs.readdirSync(path.join(__dirname, '..', folder))) {
    if (!/\.(?:js|cjs)$/.test(file)) continue;
    execFileSync(process.execPath, ['--check', path.join(__dirname, '..', folder, file)], { stdio: 'inherit' });
  }
}
console.log('Syntax checked: src/ and scripts/');
