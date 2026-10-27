// Real updater download/integrity test against localhost. No installer is ever executed.
const { app } = require('electron');
const { NsisUpdater } = require('electron-updater');
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../.smoke-data', `updater-${Date.now()}`);
fs.mkdirSync(root, { recursive: true }); app.setPath('userData', root);
const binary = Buffer.from('MZ-MultiDiscord updater test fixture; not an executable installer.');
const hash = crypto.createHash('sha512').update(binary).digest('base64');
const server = http.createServer((request, response) => {
  if (request.url.split('?')[0].endsWith('/latest.yml')) {
    response.writeHead(200, { 'content-type': 'text/yaml' });
    response.end(`version: 9.9.9\nfiles:\n  - url: MultiDiscord-Setup.exe\n    sha512: ${hash}\n    size: ${binary.length}\npath: MultiDiscord-Setup.exe\nsha512: ${hash}\nreleaseDate: '2026-10-27T00:00:00.000Z'\n`);
  } else {
    const data = request.url.startsWith('/bad/') ? Buffer.from(binary.toString().replace('fixture', 'altered')) : binary;
    response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': data.length }); response.end(data);
  }
});

app.whenReady().then(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    for (const name of ['good', 'bad']) {
      const folder = path.join(root, name); fs.mkdirSync(folder, { recursive: true });
      const url = `http://127.0.0.1:${server.address().port}/${name}/`;
      const configPath = path.join(folder, 'app-update.yml');
      fs.writeFileSync(configPath, `provider: generic\nurl: ${url}\nupdaterCacheDirName: fixture-cache\n`);
      const adapter = { version: '0.5.0', name: 'MultiDiscord', isPackaged: true, appUpdateConfigPath: configPath,
        userDataPath: folder, baseCachePath: folder, whenReady: async () => {},
        onQuit: () => {}, quit: () => assert.fail('Must not run an installer'), relaunch: () => assert.fail('Must not relaunch') };
      const updater = new NsisUpdater(null, adapter);
      updater.httpExecutor = new ElectronHttpExecutor(() => {});
      updater.logger = null; updater.autoDownload = false; updater.autoInstallOnAppQuit = false;
      updater.disableDifferentialDownload = true;
      updater.on('error', () => {});
      const info = await updater.checkForUpdates(); assert.equal(info.updateInfo.version, '9.9.9');
      if (name === 'good') {
        const files = await updater.downloadUpdate(); assert.deepEqual(fs.readFileSync(files[0]), binary);
      } else await assert.rejects(updater.downloadUpdate(), /sha512|checksum|digest/i);
    }
    console.log('PASS: real updater reads metadata, downloads verified bytes and rejects a modified file; no installation');
    server.close(); app.quit();
  } catch (error) { console.error(error); server.close(); app.exit(1); }
});
