// Offline test: only the test app's own window can be captured; system audio stays off.
const { app, BrowserWindow, session, desktopCapturer, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const dataPath = path.resolve(__dirname, '../.smoke-data', `screen-share-${Date.now()}`);
fs.mkdirSync(dataPath, { recursive: true });
app.setPath('userData', dataPath);
fs.writeFileSync(path.join(dataPath, 'accounts.json'), JSON.stringify({ accounts: [], settings: { language: 'en' } }));
let host, enumerations = 0;
desktopCapturer.getSources = async () => {
  enumerations++;
  const thumbnail = nativeImage.createFromPath(path.join(__dirname, '../src/assets/icon.png'));
  return [
    { id: 'screen:999:0', name: 'Écran de test (non capturé)', thumbnail, display_id: '999', appIcon: null },
    { id: host.getMediaSourceId(), name: 'MultiDiscord — fenêtre de test', thumbnail, display_id: '', appIcon: null }
  ];
};
app.on('session-created', ses => ses.protocol.handle('https', () => new Response('<!doctype html><title>Discord test</title><body style="background:#313338;color:white">Test local du partage d’écran</body>', { headers: { 'content-type': 'text/html' } })));
require('../src/main');

async function until(fn) {
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Screen share test timed out');
}

app.whenReady().then(async () => {
  try {
    await until(() => BrowserWindow.getAllWindows().length);
    host = BrowserWindow.getAllWindows()[0];
    await until(() => !host.webContents.isLoading() && host.contentView.children.length);
    const remote = host.contentView.children[0].webContents;
    await until(() => !remote.isLoading());
    const start = (gesture = true) => remote.executeJavaScript(`
      window.shareResult = null;
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then(stream => {
        window.testStream = stream;
        window.shareResult = { ok: true, video: stream.getVideoTracks()[0]?.readyState, audio: stream.getAudioTracks().length };
      }, error => { window.shareResult = { ok: false, error: error.name }; });
      void 0;
    `, gesture);
    const picker = () => BrowserWindow.getAllWindows().find(win => win !== host);
    const waitPicker = async () => {
      await until(() => picker() && picker().webContents.getURL().endsWith('screen-share.html') && !picker().webContents.isLoading());
      await until(() => picker().webContents.executeJavaScript("Boolean(document.querySelector('.source'))"));
      return picker();
    };

    // Chromium or the request policy must reject capture without a user gesture.
    await start(false);
    await until(async () => Boolean(await remote.executeJavaScript('window.shareResult')));
    assert.equal((await remote.executeJavaScript('window.shareResult')).ok, false);
    assert.equal(enumerations, 0);

    await start();
    let chooser = await waitPicker();
    assert.equal(await chooser.webContents.executeJavaScript('document.documentElement.lang'), 'en');
    assert.equal(await chooser.webContents.executeJavaScript("document.querySelector('#cancel').textContent"), 'Cancel');
    try { fs.writeFileSync(path.join(dataPath, 'picker.png'), (await chooser.webContents.capturePage()).toPNG()); } catch { /* Optional UI capture. */ }
    assert.equal(await chooser.webContents.executeJavaScript("document.querySelector('#share').disabled"), true);
    assert.equal(await chooser.webContents.executeJavaScript("document.querySelector('#audio').checked"), false);
    assert.equal(await remote.executeJavaScript('typeof window.screenShare'), 'undefined');
    await chooser.webContents.executeJavaScript("document.querySelector('#cancel').click()");
    await until(async () => Boolean(await remote.executeJavaScript('window.shareResult')));
    assert.equal((await remote.executeJavaScript('window.shareResult')).ok, false);
    await until(() => !picker());

    await start();
    chooser = await waitPicker();
    const invalid = await chooser.webContents.executeJavaScript("window.screenShare.choose({ sourceId: 'window:unlisted', audio: true }).then(() => false, () => true)");
    assert.equal(invalid, true);
    assert.equal(await remote.executeJavaScript('window.shareResult'), null);
    await chooser.webContents.executeJavaScript("document.querySelector('[data-kind=window]').click(); document.querySelector('.source').click(); document.querySelector('#share').click()");
    await until(async () => Boolean(await remote.executeJavaScript('window.shareResult')));
    const result = await remote.executeJavaScript('window.shareResult');
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.video, 'live');
    assert.equal(result.audio, 0);
    assert.ok(enumerations >= 3); // Sources are revalidated when sharing starts.
    await remote.executeJavaScript('window.testStream.getTracks().forEach(track => track.stop())');
    assert.equal(await remote.executeJavaScript('window.testStream.getVideoTracks()[0].readyState'), 'ended');
    await until(() => !picker());

    await start();
    chooser = await waitPicker();
    chooser.close();
    await until(async () => Boolean(await remote.executeJavaScript('window.shareResult')));
    assert.equal((await remote.executeJavaScript('window.shareResult')).ok, false);

    await start();
    await waitPicker();
    remote.reload();
    await until(() => !picker() && !remote.isLoading());
    await start();
    await waitPicker();
    await host.webContents.executeJavaScript('window.multiDiscord.state().then(state => window.multiDiscord.action("close", state.activeId))');
    await until(() => !picker());
    assert.equal(remote.isDestroyed(), true);
    console.log('PASS: explicit selection, cancellation, invalid source, live video, audio off, stop, navigation and account-close cleanup');
    console.log(`SMOKE_DATA=${dataPath}`);
    app.quit();
  } catch (error) { console.error(error); app.exit(1); }
});
