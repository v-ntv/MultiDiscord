const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdates } = require('../src/updates');

function setup(packaged = true, automatic = true) {
  const updater = new EventEmitter();
  let checks = 0, installs = 0, prepared = false;
  updater.checkForUpdates = async () => { checks++; updater.emit('checking-for-update'); };
  updater.quitAndInstall = (silent, restart) => { assert.equal(silent, true); assert.equal(restart, true); assert.equal(prepared, true); installs++; };
  const settings = { autoUpdates: automatic };
  const window = { isDestroyed: () => false, isFocused: () => false };
  const controller = createUpdates({ app: { isPackaged: packaged }, updater, getWindow: () => window, getSettings: () => settings,
    t: key => key, dialog: { showMessageBox: async () => ({ response: 1 }) }, beforeInstall: () => { prepared = true; }, changed: () => {}, platform: 'win32' });
  return { updater, settings, controller, window, checks: () => checks, installs: () => installs };
}

test('aucun réseau en développement ; les téléchargements prêts ne redémarrent pas sans confirmation', async () => {
  const dev = setup(false); await dev.controller.check(true); assert.equal(dev.checks(), 0);
  const app = setup(); await app.controller.check();
  assert.equal(app.checks(), 1); assert.equal(app.updater.autoDownload, true);
  app.updater.emit('update-available', { version: '0.5.22' });
  await app.controller.check(true); assert.equal(app.checks(), 1);
  app.updater.emit('download-progress', { percent: 42.4 }); assert.equal(app.controller.state().percent, 42);
  app.updater.emit('update-downloaded', { version: '0.5.22' });
  assert.equal(app.installs(), 0); assert.equal(app.controller.state().ready, true);
  await app.controller.install(); assert.equal(app.installs(), 1);
});

test('désactivation, erreur réseau et arrêt système ne provoquent pas d’installation', async () => {
  assert.equal(setup(true, false).controller.state().key, 'updateDisabled');
  const app = setup(); app.settings.autoUpdates = false; app.controller.settingsChanged();
  await app.controller.check(); assert.equal(app.checks(), 0); assert.equal(app.updater.autoInstallOnAppQuit, false);
  await app.controller.check(true); assert.equal(app.checks(), 1);
  app.updater.emit('error', new Error('Network failure')); assert.equal(app.controller.state().key, 'updateError');
  app.controller.shutdown(); app.settings.autoUpdates = true; app.controller.settingsChanged();
  assert.equal(app.updater.autoInstallOnAppQuit, false);
  await app.controller.check(true); assert.equal(app.checks(), 1);
  app.window.isFocused = () => true;
  app.updater.emit('update-downloaded', { version: '0.5.22' });
  await Promise.resolve();
  assert.equal(app.installs(), 0);
});
