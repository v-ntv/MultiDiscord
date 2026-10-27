// Offline integration test: Discord is replaced with a local protocol fixture.
const { app, BrowserWindow, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const overlays = [];
const setOverlay = BrowserWindow.prototype.setOverlayIcon;
BrowserWindow.prototype.setOverlayIcon = function (image, description) {
  overlays.push({ empty: image === null, valid: image ? !image.isEmpty() : true, description });
  return setOverlay.call(this, image, description);
};

const dataPath = path.resolve(__dirname, '../.smoke-data', process.env.MULTIDISCORD_SMOKE_RUN || String(Date.now()));
fs.mkdirSync(dataPath, { recursive: true });
app.setPath('userData', dataPath);
if (!process.argv.includes('--live')) app.on('session-created', ses => {
  ses.protocol.handle('https', request => {
    if (new URL(request.url).hostname === 'cdn.discordapp.com') return new Response(fs.readFileSync(path.join(__dirname, '../src/assets/icon.png')), { headers: { 'content-type': 'image/png' } });
    return new Response('<!doctype html><title>Discord</title><body style="background:#313338;color:white;font:20px sans-serif;padding:40px">Discord — fixture de test hors ligne</body>', { headers: { 'content-type': 'text/html' } });
  });
});
require('../src/main');

async function until(fn) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const result = await fn();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timeout');
}

app.whenReady().then(async () => {
  try {
    const win = await until(() => BrowserWindow.getAllWindows()[0]);
    await until(() => !win.webContents.isLoading());
    const run = code => win.webContents.executeJavaScript(code);
    const action = (action, id, value) => run(`window.multiDiscord.action(${JSON.stringify(action)}, ${JSON.stringify(id)}, ${JSON.stringify(value)})`);
    let state = await run('window.multiDiscord.state()');
    if (process.argv.includes('--live')) {
      const remote = win.contentView.children[0].webContents;
      await until(() => !remote.isLoading());
      const details = await until(async () => {
        const page = await remote.executeJavaScript('({ title: document.title, url: location.href, text: document.body.innerText.slice(0, 500) })');
        return /Log In|Connexion|Welcome back|Heureux de vous revoir|QR Code|QR code/i.test(page.text) && page;
      });
      assert.match(details.url, /^https:\/\/discord\.com\//);
      assert.match(details.text, /Log In|Connexion|Welcome back|Heureux de vous revoir|QR Code|QR code/i);
      if (process.argv.includes('--vencord')) {
        assert.equal(await require('../src/mods').installVencord(win), true);
        const { Menu } = require('electron');
        const popup = Menu.prototype.popup;
        Menu.prototype.popup = function () {
          this.items.find(item => item.label === 'Personnaliser cet onglet').submenu.items.find(item => item.label === 'Vencord Web').click();
        };
        await action('menu');
        Menu.prototype.popup = popup;
        await until(async () => (await run('window.multiDiscord.state()')).accounts[0].vencord);
        await until(() => !remote.isLoading());
        const result = await remote.executeJavaScript('({ vencord: typeof window.Vencord, native: typeof window.VencordNative })');
        assert.equal(result.vencord, 'object');
        assert.equal(result.native, 'object');
        const css = await remote.executeJavaScript('VencordNative.native.getRendererCss()');
        assert.ok(css.length > 100);
        console.log('PASS: Vencord officiel téléchargé et exécuté au démarrage, CSS disponible');
      }
      try { fs.writeFileSync(path.join(dataPath, 'discord.png'), (await remote.capturePage()).toPNG()); }
      catch { console.log('Capture du rendu indisponible sur cet environnement.'); }
      console.log('PASS: page officielle de connexion Discord chargée');
      console.log(JSON.stringify(details));
      app.exit(0); return;
    }
    if (process.argv.includes('--restore')) {
      assert.equal(state.accounts.length, 2);
      assert.equal(state.accounts[1].name, 'Travail');
      assert.equal(state.accounts[1].muted, true);
      assert.equal(state.settings.minimizeOnClose, true);
      const first = session.fromPartition(`persist:account-${state.accounts[0].id}`);
      assert.equal((await first.cookies.get({ name: 'isolation-check' }))[0]?.value, 'first');
      console.log('PASS: configuration et cookie restaurés après redémarrage');
      app.exit(0); return;
    }
    assert.equal(state.accounts.length, 1);
    const firstId = state.activeId;
    state = await action('add');
    assert.equal(state.accounts.length, 2);
    const secondId = state.activeId;
    await until(() => win.contentView.children.length === 2);
    const firstSession = session.fromPartition(`persist:account-${firstId}`);
    const secondSession = session.fromPartition(`persist:account-${secondId}`);
    await firstSession.cookies.set({ url: 'https://discord.com', name: 'isolation-check', value: 'first', expirationDate: Date.now() / 1000 + 3600 });
    assert.equal((await secondSession.cookies.get({ name: 'isolation-check' })).length, 0);
    await firstSession.cookies.flushStore();
    const secondView = win.contentView.children.find(v => v.webContents?.session === secondSession);
    const secondContents = secondView.webContents;
    await until(() => !secondView.webContents.isLoading());
    const passkeyState = await secondContents.executeJavaScript(`(async () => {
      const available = await PublicKeyCredential.isConditionalMediationAvailable();
      const result = await navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32) } }).then(() => 'unexpected', error => error.name);
      return { available, result, nodeExposed: typeof require, ipcExposed: typeof window.multiDiscord };
    })()`);
    assert.equal(passkeyState.available, false);
    assert.equal(passkeyState.result, 'NotAllowedError');
    assert.equal(passkeyState.nodeExposed, 'undefined');
    assert.equal(passkeyState.ipcExposed, 'undefined');
    await secondView.webContents.executeJavaScript("document.title = '(7) Discord'");
    await until(async () => (await run('window.multiDiscord.state()')).accounts[1].unread === 7);
    assert.equal(await run("document.querySelector('.badge').textContent"), '7');
    if (process.platform === 'win32') {
      assert.ok(overlays.some(item => item.description === '7 notifications Discord' && !item.empty && item.valid));
      const firstContents = win.contentView.children.find(v => v.webContents?.session === firstSession).webContents;
      await firstContents.executeJavaScript("document.title = '(3) Discord'");
      await until(() => overlays.some(item => item.description === '10 notifications Discord'));
      await firstContents.executeJavaScript("document.title = 'Discord'");
    }
    await secondView.webContents.executeJavaScript("document.title = 'Discord'");
    await until(async () => (await run('window.multiDiscord.state()')).accounts[1].unread === 0);
    if (process.platform === 'win32') await until(() => overlays.at(-1)?.empty);
    await run("document.querySelector('[aria-selected=true] .tab-name').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))");
    await run("const input = document.querySelector('.rename'); input.value = 'Travail'; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))");
    await until(async () => (await run('window.multiDiscord.state()')).accounts[1].name === 'Travail');
    state = await action('mute', secondId);
    assert.equal(state.accounts[1].muted, true);
    assert.equal(secondView.webContents.isAudioMuted(), true);
    state = await action('activate', firstId);
    assert.equal(state.activeId, firstId);
    const firstView = win.contentView.children.find(v => v.webContents?.session === firstSession);
    assert.equal(firstView.getVisible(), true);
    assert.equal(secondView.getVisible(), false);
    state = await action('close', secondId);
    assert.equal(state.accounts.length, 1);
    assert.equal(secondContents.isDestroyed(), true);
    // Ctrl+T is handled by the main process even when Discord owns keyboard focus.
    firstView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 't', modifiers: ['control'] });
    firstView.webContents.sendInputEvent({ type: 'keyUp', keyCode: 't', modifiers: ['control'] });
    state = await until(async () => { const s = await run('window.multiDiscord.state()'); return s.accounts.length === 2 && s; });
    await action('close', state.activeId);
    // Reopen through the same menu handler used by the UI.
    const { Menu } = require('electron');
    const popup = Menu.prototype.popup;
    Menu.prototype.popup = function () {
      this.items.find(item => item.label === 'Travail').click();
    };
    await action('menu');
    Menu.prototype.popup = popup;
    state = await run('window.multiDiscord.state()');
    assert.equal(state.accounts.length, 2);
    assert.equal(state.activeId, secondId);
    assert.equal(state.accounts[1].muted, true);
    assert.equal(state.accounts[1].name, 'Travail');
    const reopened = win.contentView.children.find(v => v.webContents?.session === secondSession).webContents;
    await until(() => !reopened.isLoading());
    await reopened.executeJavaScript(`document.body.insertAdjacentHTML('beforeend', '<section aria-label="User area"><img src="https://cdn.discordapp.com/avatars/123/abc.png"><div class="nameTag_test"><div class="title_test">Alice Discord</div></div></section>')`);
    await until(async () => (await run('window.multiDiscord.state()')).accounts[1].profile?.displayName === 'Alice Discord');
    assert.equal(await run("document.querySelector('[aria-selected=true] .tab-name').textContent"), 'Alice Discord');
    assert.match(await run("document.querySelector('[aria-selected=true] .avatar img').src"), /\/avatars\/123\/abc.png/);
    await reopened.executeJavaScript("document.querySelector('.title_test').textContent = 'Alice renommée'");
    await until(async () => (await run('window.multiDiscord.state()')).accounts[1].profile?.displayName === 'Alice renommée');
    await reopened.executeJavaScript("history.pushState({}, '', '/login'); document.body.replaceChildren()");
    await until(async () => (await run('window.multiDiscord.state()')).accounts[1].profile === null);
    const themeFile = path.join(dataPath, 'fixture.theme.css');
    fs.writeFileSync(themeFile, 'body { --multidiscord-theme: applied; }');
    const { dialog } = require('electron');
    const openDialog = dialog.showOpenDialog;
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [themeFile] });
    Menu.prototype.popup = function () {
      this.items.find(item => item.label === 'Personnaliser cet onglet').submenu.items.find(item => item.label.startsWith('Importer un thème')).click();
    };
    await action('menu');
    await until(async () => {
      if (reopened.isLoading()) return false;
      try { return await reopened.executeJavaScript("getComputedStyle(document.body).getPropertyValue('--multidiscord-theme').trim() === 'applied'"); }
      catch { return false; }
    });
    dialog.showOpenDialog = openDialog;
    Menu.prototype.popup = function () {
      this.items.find(item => item.label === 'Personnaliser cet onglet').submenu.items.find(item => item.label === 'Retirer le thème CSS').click();
    };
    await action('menu');
    Menu.prototype.popup = popup;
    await until(async () => {
      if (reopened.isLoading()) return false;
      try { return await reopened.executeJavaScript("getComputedStyle(document.body).getPropertyValue('--multidiscord-theme').trim() === ''"); }
      catch { return false; }
    });
    await until(() => !win.webContents.isLoading());
    try { fs.writeFileSync(path.join(dataPath, 'shell.png'), (await win.webContents.capturePage()).toPNG()); } catch { /* Optional capture on CI. */ }
    let startupItem;
    Menu.prototype.popup = function () {
      startupItem = this.items.find(item => item.label === 'Démarrer avec Windows');
      this.items.find(item => item.label === 'Réduire au lieu de fermer avec la croix').click();
    };
    await action('settings');
    Menu.prototype.popup = popup;
    assert.equal(startupItem.enabled, false);
    assert.equal((await run('window.multiDiscord.state()')).settings.minimizeOnClose, true);
    win.close();
    await until(() => win.isMinimized());
    assert.equal(win.isDestroyed(), false);
    assert.equal(win.contentView.children.length, 2);
    win.restore();
    await until(() => !win.isMinimized());
    Menu.prototype.popup = function () { this.items.find(item => item.label === 'Réduire au lieu de fermer avec la croix').click(); };
    await action('settings');
    assert.equal((await run('window.multiDiscord.state()')).settings.minimizeOnClose, false);
    let prevented = false;
    const event = { preventDefault: () => { prevented = true; } };
    win.emit('close', event);
    assert.equal(prevented, false);
    await action('settings'); // Keep the option enabled to test explicit quit below.
    Menu.prototype.popup = popup;
    console.log('PASS: sessions, badges Windows agrégés/effacés, profils, thèmes, réduction par la croix et paramètres persistants');
    console.log(`SMOKE_DATA=${dataPath}`);
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
