const { app, BrowserWindow, WebContentsView, ipcMain, Menu, shell, dialog, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { createAccount, normalizeConfig, unreadFromTitle, isDiscord, validateProfile } = require('./model');
const mods = require('./mods');
const { customizationHeaders } = require('./customization-policy');
const startup = require('./startup').createStartup(app);
const { createScreenShareManager } = require('./screen-share');
const { translate } = require('./i18n');
const { createUpdates } = require('./updates');
const { createCloseGuard } = require('./close-guard');
const { discordUserAgent } = require('./browser-compatibility');

const HEADER_HEIGHT = 48;
let window, config, configPath;
const views = new Map();
const runtime = new Map();
let saveError = null;
let quitting = false;
let lastOverlay = -1;
let screenShare;
let updates;
const badgeImages = new Map();
const t = (key, values) => translate(config?.settings?.language, key, values);
const closeGuard = createCloseGuard({ getSettings: () => config.settings, isQuitting: () => quitting,
  confirm: async target => (await dialog.showMessageBox(target, { type: 'question', title: t('confirmTitle'), message: t('confirmMessage'), detail: t('confirmDetail'), buttons: [t('cancel'), t('closeApp')], defaultId: 0, cancelId: 0 })).response === 1,
  quit: () => app.quit()
});

function settingsMenu() {
  Menu.buildFromTemplate([
    { label: t('startup'), type: 'checkbox', checked: startup.enabled(), enabled: startup.available(), click: item => {
      if (!startup.available()) return;
      try { startup.set(item.checked); broadcast(); }
      catch { dialog.showErrorBox(t('startup'), t('startupError')); }
    } },
    ...(!startup.available() ? [{ label: t('installedOnly'), enabled: false }] : []),
    { label: t('minimize'), type: 'checkbox', checked: config.settings.minimizeOnClose, click: item => {
      config.settings.minimizeOnClose = item.checked; save(); broadcast();
    } },
    { label: t('language'), submenu: [
      { label: 'Français', type: 'radio', checked: config.settings.language === 'fr', click: () => setLanguage('fr') },
      { label: 'English', type: 'radio', checked: config.settings.language === 'en', click: () => setLanguage('en') }
    ] },
    { type: 'separator' },
    { label: t('autoUpdates'), type: 'checkbox', checked: config.settings.autoUpdates, click: item => { config.settings.autoUpdates = item.checked; save(); updates.settingsChanged(); broadcast(); } },
    { label: t(updates.state().key, updates.state()), enabled: false },
    { label: t(updates.state().ready ? 'installUpdate' : 'checkUpdates'), enabled: updates.state().available, click: () => updates.check(true) },
    { type: 'separator' },
    { label: `MultiDiscord ${app.getVersion()}`, enabled: false },
    { label: t('quit'), click: () => app.quit() }
  ]).popup({ window });
}

function setLanguage(language) { config.settings.language = language; lastOverlay = -1; save(); broadcast(); }

function save() {
  try {
    fs.writeFileSync(`${configPath}.tmp`, JSON.stringify(config, null, 2));
    fs.renameSync(`${configPath}.tmp`, configPath);
    saveError = null;
  } catch (error) {
    saveError = 'saveError';
    console.error('Configuration:', error.message);
  }
}

function state() {
  return { activeId: config.activeId, saveError, updates: updates?.state(), settings: { ...config.settings, autoStart: startup.enabled(), canAutoStart: startup.available() }, accounts: config.accounts.filter(a => a.open).map(a => ({ ...a, ...runtime.get(a.id) })) };
}

function broadcast() {
  if (!window || window.isDestroyed()) return;
  window.webContents.send('accounts:changed', state());
  const unread = config.accounts.filter(a => a.open).reduce((sum, a) => sum + (runtime.get(a.id)?.unread || 0), 0);
  window.setTitle(`${unread ? `(${unread}) ` : ''}MultiDiscord`);
  if (process.platform === 'win32') {
    const overlay = Math.min(unread, 100);
    if (lastOverlay !== overlay) {
      if (overlay && !badgeImages.has(overlay)) badgeImages.set(overlay, nativeImage.createFromPath(path.join(__dirname, 'assets', 'badges', `${overlay === 100 ? '99plus' : overlay}.png`)));
      window.setOverlayIcon(overlay ? badgeImages.get(overlay) : null, overlay ? t('notifications', { n: unread }) : t('noNotifications'));
      lastOverlay = overlay;
    }
  }
  if (process.platform === 'darwin') app.dock.setBadge(unread ? String(unread) : '');
}

function layout() {
  if (!window || window.isDestroyed()) return;
  const [width, height] = window.getContentSize();
  for (const [id, view] of views) {
    view.setVisible(id === config.activeId);
    view.setBounds({ x: 0, y: HEADER_HEIGHT, width, height: Math.max(0, height - HEADER_HEIGHT) });
  }
}

function update(id, change) {
  runtime.set(id, { ...runtime.get(id), ...change });
  broadcast();
}

function external(url) {
  try { if (['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)) shell.openExternal(url).catch(console.error); }
  catch { /* Ignore unsupported URLs. */ }
}

function attach(account) {
  if (views.has(account.id)) return;
  const view = new WebContentsView({ webPreferences: {
    preload: path.join(__dirname, 'discord-preload.js'),
    partition: `persist:account-${account.id}`, nodeIntegration: false,
    contextIsolation: true, sandbox: true, backgroundThrottling: false
  } });
  views.set(account.id, view);
  window.contentView.addChildView(view);
  view.setBackgroundColor('#313338');
  const contents = view.webContents;
  contents.setAudioMuted(account.muted);
  const session = contents.session;
  const browserAgent = discordUserAgent(process.versions.chrome);
  session.setUserAgent(browserAgent);
  contents.setUserAgent(browserAgent);
  // Authorized by the user: follow Vencord Web's CSP rule only in opted-in sessions.
  session.webRequest.onHeadersReceived({ urls: ['https://discord.com/*', 'https://raw.githubusercontent.com/*'] }, (details, callback) => {
    callback({ responseHeaders: customizationHeaders(details, account.vencord, Boolean(mods.theme(account.id))) });
  });
  let mediaAllowed = false;
  session.setPermissionCheckHandler((requester, permission, origin, details) => isDiscord(origin) && (permission === 'notifications' || (permission === 'media' && mediaAllowed) ||
    (permission === 'display-capture' && requester === contents && details.isMainFrame)));
  session.setPermissionRequestHandler(async (_wc, permission, callback, details) => {
    if (!isDiscord(details.requestingUrl)) return callback(false);
    if (permission === 'notifications') return callback(true);
    if (permission === 'display-capture') return callback(_wc === contents && details.isMainFrame === true);
    if (permission !== 'media') return callback(false);
    try {
      const result = await dialog.showMessageBox(window, {
        type: 'question', title: t('mediaTitle'),
        message: t('mediaMessage', { name: account.profile?.displayName || account.name }),
        buttons: [t('deny'), t('allow')], defaultId: 0, cancelId: 0
      });
      mediaAllowed = result.response === 1;
      callback(mediaAllowed);
    } catch { callback(false); }
  });
  screenShare.install(contents, () => window, () => account.profile?.displayName || account.name);
  contents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  const guard = (event, url) => {
    if (!isDiscord(url)) { event.preventDefault(); external(url); }
  };
  contents.on('will-navigate', guard);
  contents.on('will-redirect', guard);
  contents.on('page-title-updated', (_event, title) => update(account.id, { title, unread: unreadFromTitle(title) }));
  contents.on('did-start-loading', () => update(account.id, { loading: true, error: null }));
  contents.on('did-stop-loading', () => update(account.id, { loading: false }));
  contents.on('dom-ready', () => {
    const css = [account.vencord ? mods.vencord()?.css : '', mods.theme(account.id)].filter(Boolean).join('\n');
    if (css) contents.insertCSS(css).catch(() => update(account.id, { error: 'themeError' }));
  });
  contents.on('did-fail-load', (_event, code, _description, _url, mainFrame) => {
    if (mainFrame && code !== -3) update(account.id, { error: 'connectionError', loading: false });
  });
  contents.on('render-process-gone', () => update(account.id, { error: 'crashed', loading: false }));
  contents.on('audio-state-changed', event => update(account.id, { audible: event.audible }));
  contents.on('before-input-event', (event, input) => {
    if (shortcut(input)) event.preventDefault();
  });
  runtime.set(account.id, { unread: 0, loading: true });
  contents.loadURL('https://discord.com/app').catch(() => {});
  layout();
}

function activate(id) {
  const account = config.accounts.find(a => a.id === id);
  if (!account) return;
  account.open = true;
  config.activeId = id;
  attach(account);
  layout();
  views.get(id).webContents.focus();
  save();
  broadcast();
}

function add() {
  const account = createAccount(config.accounts.length + 1, config.settings.language);
  config.accounts.push(account);
  activate(account.id);
}

function close(id) {
  const account = config.accounts.find(a => a.id === id && a.open);
  if (!account) return;
  account.open = false;
  const view = views.get(id);
  if (view) {
    window.contentView.removeChildView(view);
    view.webContents.close();
    views.delete(id);
  }
  runtime.delete(id);
  if (config.activeId === id) config.activeId = config.accounts.find(a => a.open)?.id || null;
  layout(); save(); broadcast();
}

function accountMenu() {
  const closed = config.accounts.filter(a => !a.open);
  const active = config.accounts.find(a => a.id === config.activeId);
  const reload = () => { save(); broadcast(); views.get(active?.id)?.webContents.reload(); };
  Menu.buildFromTemplate([
    { label: t('addAccount'), accelerator: 'CmdOrCtrl+T', click: add },
    ...(closed.length ? [{ type: 'separator' }, { label: t('reopenAccount'), enabled: false }, ...closed.map(a => ({ label: a.profile?.displayName || a.name, click: () => activate(a.id) }))] : []),
    { type: 'separator' },
    { label: t('customize'), enabled: Boolean(active), submenu: [
      { label: 'Vencord Web', type: 'checkbox', checked: active?.vencord === true, click: async item => {
        if (item.checked && !mods.vencord() && !await mods.installVencord(window, config.settings.language)) return;
        active.vencord = item.checked; reload();
      } },
      { label: t('updateVencord'), click: async () => { if (await mods.installVencord(window, config.settings.language)) { for (const a of config.accounts.filter(a => a.open && a.vencord)) views.get(a.id)?.webContents.reload(); } } },
      { type: 'separator' },
      { label: t('importTheme'), click: async () => { if (await mods.importTheme(window, active.id, config.settings.language)) reload(); } },
      { label: t('removeTheme'), enabled: Boolean(active && mods.theme(active.id)), click: () => { mods.removeTheme(active.id); reload(); } },
      { type: 'separator' },
      { label: t('nativePlugins'), enabled: false }
    ] },
    { label: t('openCustomizations'), click: () => mods.openFolder() }
  ]).popup({ window });
}

function shortcut(input) {
  if (input.type !== 'keyDown' || (!input.control && !input.meta)) return false;
  const key = input.key.toLowerCase();
  if (key === 't') add();
  else if (key === 'w' && config.activeId) close(config.activeId);
  else if (key === 'r') views.get(config.activeId)?.webContents.reload();
  else if (key === 'tab') {
    const opened = config.accounts.filter(a => a.open);
    const index = opened.findIndex(a => a.id === config.activeId);
    if (opened.length) activate(opened[(index + (input.shift ? -1 : 1) + opened.length) % opened.length].id);
  } else if (/^[1-9]$/.test(key)) {
    const account = config.accounts.filter(a => a.open)[Number(key) - 1];
    if (account) activate(account.id);
  } else return false;
  return true;
}

function createWindow() {
  window = new BrowserWindow({ width: 1420, height: 940, minWidth: 700, minHeight: 480,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#17181e', title: 'MultiDiscord', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('before-input-event', (event, input) => { if (shortcut(input)) event.preventDefault(); });
  window.loadFile(path.join(__dirname, 'index.html'));
  lastOverlay = -1;
  window.once('ready-to-show', () => { lastOverlay = -1; broadcast(); });
  window.on('close', event => { closeGuard(event, window).catch(console.error); });
  window.on('query-session-end', () => { quitting = true; updates.shutdown(); });
  window.on('session-end', () => { quitting = true; updates.shutdown(); });
  for (const account of config.accounts.filter(a => a.open)) attach(account);
  window.on('resize', layout);
  window.on('closed', () => {
    for (const view of views.values()) if (!view.webContents.isDestroyed()) view.webContents.close();
    views.clear(); runtime.clear(); window = null;
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.setAppUserModelId('fr.multidiscord.desktop');
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(() => {
    screenShare = createScreenShareManager(() => config?.settings.language || 'en');
    configPath = path.join(app.getPath('userData'), 'accounts.json');
    try { config = normalizeConfig(JSON.parse(fs.readFileSync(configPath, 'utf8'))); }
    catch (error) {
      config = normalizeConfig({});
      if (error.code !== 'ENOENT') {
        // Preserve the original before allowing any subsequent save.
        fs.copyFileSync(configPath, `${configPath}.backup-${Date.now()}`);
        dialog.showErrorBox(t('configTitle'), t('configMessage'));
      }
    }
    if (!config.accounts.length) {
      const account = createAccount(1, config.settings.language);
      config.accounts.push(account); config.activeId = account.id; save();
    }
    updates = createUpdates({ app, updater: require('electron-updater').autoUpdater, getWindow: () => window,
      getSettings: () => config.settings, t, dialog, beforeInstall: () => { quitting = true; }, installationFailed: () => { quitting = false; }, changed: broadcast });
    const discordAccount = event => {
      const entry = [...views].find(([, view]) => view.webContents === event.sender);
      if (!entry || event.senderFrame !== event.sender.mainFrame || !isDiscord(event.senderFrame.url)) return null;
      return config.accounts.find(a => a.id === entry[0] && a.open);
    };
    ipcMain.on('discord:bootstrap', event => {
      const account = discordAccount(event);
      event.returnValue = account?.vencord ? mods.vencord() : null;
    });
    ipcMain.on('discord:mod-error', (event, message) => {
      const account = discordAccount(event);
      if (account) update(account.id, { error: `Vencord : ${String(message).slice(0, 200)}` });
    });
    ipcMain.on('discord:profile', (event, profile) => {
      const account = discordAccount(event);
      if (!account) return;
      const validated = validateProfile(profile);
      if (profile !== null && !validated) return;
      account.profile = validated; save(); broadcast();
    });
    ipcMain.handle('accounts:state', event => {
      if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Accès refusé');
      return state();
    });
    ipcMain.handle('accounts:action', (event, payload) => {
      if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Accès refusé');
      const { action, id, value } = payload || {};
      const account = config.accounts.find(a => a.id === id && a.open);
      if (action === 'add') add();
      else if (action === 'menu') accountMenu();
      else if (action === 'settings') settingsMenu();
      else if (account) {
        if (action === 'activate') activate(id);
        else if (action === 'close') close(id);
        else if (action === 'reload') views.get(id)?.webContents.loadURL('https://discord.com/app').catch(() => {});
        else if (action === 'rename' && typeof value === 'string' && value.trim()) account.name = value.trim().slice(0, 40);
        else if (action === 'mute') { account.muted = !account.muted; views.get(id)?.webContents.setAudioMuted(account.muted); }
        save(); broadcast();
      }
      return state();
    });
    Menu.setApplicationMenu(null);
    createWindow();
    updates.start();
    app.on('activate', () => { if (!window) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', () => { quitting = true; });
}
