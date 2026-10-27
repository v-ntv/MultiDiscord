const fs = require('node:fs');
const path = require('node:path');

function releaseVersion(base, runNumber) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(base);
  const run = Number(runNumber);
  if (!match || !/^\d+$/.test(String(runNumber)) || !Number.isSafeInteger(run) || run < 1) throw new Error('Invalid release version or workflow run number');
  const patch = Number(match[3]) + run;
  if (!Number.isSafeInteger(patch)) throw new Error('Release version overflow');
  return `${Number(match[1])}.${Number(match[2])}.${patch}`;
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const pkgPath = path.join(root, 'package.json'), lockPath = path.join(root, 'package-lock.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const version = releaseVersion(pkg.version, process.env.GITHUB_RUN_NUMBER);
  pkg.version = lock.version = lock.packages[''].version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=v${version}\n`);
  console.log(`Release version: ${version}`);
}
module.exports = { releaseVersion };
