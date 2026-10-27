const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStartup } = require('../src/startup');

test('le démarrage Windows vise uniquement l’exécutable installé et peut être désactivé', () => {
  const calls = [];
  const fakeApp = { isPackaged: true, setLoginItemSettings: options => calls.push(options), getLoginItemSettings: () => ({ openAtLogin: true, executableWillLaunchAtLogin: false }) };
  const startup = createStartup(fakeApp, { platform: 'win32', executable: 'C:\\Program Files\\MultiDiscord\\MultiDiscord.exe' });
  assert.equal(startup.enabled(), false); // Respect the user's Windows startup toggle.
  startup.set(true); startup.set(false);
  assert.deepEqual(calls.map(c => c.openAtLogin), [true, false]);
  assert.equal(calls[0].path, 'C:\\Program Files\\MultiDiscord\\MultiDiscord.exe');
  assert.deepEqual(calls[0].args, []);
  assert.equal(calls[1].enabled, false);
});

test('aucune inscription de démarrage pour Electron en développement', () => {
  const startup = createStartup({ isPackaged: false, setLoginItemSettings: () => assert.fail('Unexpected registry write') }, { platform: 'win32' });
  assert.equal(startup.available(), false);
  assert.equal(startup.enabled(), false);
  startup.set(true);
});
