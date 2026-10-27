const assert = require('node:assert/strict');
const { version } = require('../package.json');
assert.equal(process.env.GITHUB_REF_NAME, `v${version}`, 'Le tag doit correspondre à la version de package.json');
console.log(`Release version verified: v${version}`);
