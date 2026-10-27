const { BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('node:path');
const { canRequestScreenShare, captureSelection } = require('./screen-share-policy');
const { translate } = require('./i18n');

function createScreenShareManager(getLanguage = () => 'fr') {
  let pending = null;
  const t = key => translate(getLanguage(), key);

  function trustedPicker(event) {
    return pending && !pending.picker.isDestroyed() && event.sender === pending.picker.webContents &&
      event.senderFrame === pending.picker.webContents.mainFrame;
  }

  ipcMain.handle('screen-share:state', event => {
    if (!trustedPicker(event)) throw new Error(t('accessDenied'));
    return {
      accountName: pending.accountName,
      language: getLanguage(),
      canShareAudio: pending.request.audioRequested && process.platform === 'win32',
      sources: pending.sources.map(source => ({ id: source.id, name: source.name,
        kind: source.id.startsWith('screen:') ? 'screen' : 'window',
        thumbnail: source.thumbnail.toDataURL() }))
    };
  });

  ipcMain.handle('screen-share:choose', async (event, selection) => {
    if (!trustedPicker(event)) throw new Error(t('accessDenied'));
    const current = pending;
    if (selection === null) { current.finish(null); return; }
    if (!captureSelection(current.sources, selection, current.request)) throw new Error(t('invalidSource'));
    // A window may have closed while the user was choosing it.
    const freshSources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
    if (pending !== current) return;
    if (!canRequestScreenShare(current.request, current.owner)) { current.finish(null); return; }
    const streams = captureSelection(freshSources, selection, current.request);
    if (!streams) throw new Error(t('vanishedSource'));
    current.finish(streams);
  });

  function install(owner, getParent, getAccountName) {
    const handle = async (request, callback) => {
      if (pending || !canRequestScreenShare(request, owner)) { callback(null); return; }
      const parent = getParent();
      if (!parent || parent.isDestroyed()) { callback(null); return; }
      const picker = new BrowserWindow({ parent, modal: true, width: 820, height: 650, minWidth: 620, minHeight: 450,
        show: false, autoHideMenuBar: true, backgroundColor: '#202127', title: t('shareTitle'),
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: { preload: path.join(__dirname, 'screen-share-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false }
      });
      const current = { picker, owner, request, sources: [], accountName: getAccountName() };
      pending = current;
      let settled = false;
      const onNavigation = (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) current.finish(null); };
      const cancel = () => current.finish(null);
      const timeout = setTimeout(cancel, 120000);
      current.finish = streams => {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        if (pending === current) pending = null;
        owner.removeListener('did-start-navigation', onNavigation);
        owner.removeListener('destroyed', cancel);
        owner.removeListener('render-process-gone', cancel);
        parent.removeListener('closed', cancel);
        try { callback(streams); } catch { /* The requesting frame may have gone away. */ }
        if (!picker.isDestroyed()) picker.destroy();
      };
      owner.on('did-start-navigation', onNavigation);
      owner.once('destroyed', cancel);
      owner.once('render-process-gone', cancel);
      parent.once('closed', cancel);
      picker.once('closed', cancel);
      picker.webContents.on('will-navigate', event => event.preventDefault());
      picker.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      try {
        const pickerSourceId = picker.getMediaSourceId();
        current.sources = (await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 300, height: 180 } })).filter(source => source.id !== pickerSourceId);
        if (settled) return;
        await picker.loadFile(path.join(__dirname, 'screen-share.html'));
        if (!settled) picker.show();
      } catch (error) {
        console.error('Screen share picker:', error.message);
        current.finish(null);
      }
    };
    owner.session.setDisplayMediaRequestHandler((request, callback) => {
      let responded = false;
      const respond = streams => {
        if (responded) return;
        responded = true;
        try { callback(streams); } catch { /* Requesting frame already closed. */ }
      };
      handle(request, respond).catch(error => {
        console.error('Screen share request:', error.message);
        respond(null);
      });
    });
  }

  return { install };
}

module.exports = { createScreenShareManager };
