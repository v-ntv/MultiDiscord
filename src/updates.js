function createUpdates({ app, updater, getWindow, getSettings, t, dialog, beforeInstall, installationFailed = () => {}, changed, platform = process.platform }) {
  const available = () => app.isPackaged && platform === 'win32';
  let state = { key: available() ? (getSettings().autoUpdates ? 'updateIdle' : 'updateDisabled') : 'updateUnavailable' }, checking = false, downloading = false, ready = false, stopped = false, prompting = false, installing = false;
  let initialTimer, intervalTimer;
  const publish = patch => { state = { ...state, ...patch }; changed(); };
  const enabled = () => getSettings().autoUpdates;
  function configure() {
    updater.autoDownload = enabled();
    updater.autoInstallOnAppQuit = enabled() && !stopped;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
  }
  async function promptInstall() {
    const window = getWindow();
    if (!ready || prompting || stopped || !window || window.isDestroyed()) return;
    prompting = true;
    try {
      const result = await dialog.showMessageBox(window, { type: 'question', title: t('updateTitle'),
      message: t('updateQuestion', { version: state.version }), detail: t('updateDetail'),
      buttons: [t('later'), t('restart')], defaultId: 0, cancelId: 0 });
      if (result.response === 1 && ready && !window.isDestroyed()) {
        installing = true; beforeInstall();
        updater.quitAndInstall(true, true);
      }
    } catch { if (installing) { installing = false; installationFailed(); } publish({ key: 'updateError' }); }
    finally { prompting = false; }
  }
  async function check(manual = false) {
    if (!available() || checking || downloading || stopped || (!manual && !enabled())) return;
    if (ready) { if (manual) await promptInstall(); return; }
    checking = true; publish({ key: 'updateChecking' });
    try {
      configure();
      // A manual check also downloads an available update, even when automatic checks are disabled.
      if (manual) updater.autoDownload = true;
      await updater.checkForUpdates();
      if (manual && ['updateCurrent', 'updateError'].includes(state.key)) {
        const window = getWindow();
        if (window && !window.isDestroyed()) await dialog.showMessageBox(window, { type: 'info', title: t('updateTitle'), message: t(state.key) });
      }
    } catch {
      downloading = false; publish({ key: 'updateError' });
      const window = getWindow();
      if (manual && window && !window.isDestroyed()) await dialog.showMessageBox(window, { type: 'info', title: t('updateTitle'), message: t('updateError') }).catch(() => {});
    }
    finally { checking = false; configure(); }
  }
  if (available()) {
    configure();
    updater.on('checking-for-update', () => publish({ key: 'updateChecking' }));
    updater.on('update-available', info => { downloading = updater.autoDownload; publish({ key: 'updateFound', version: info.version }); });
    updater.on('update-not-available', () => publish({ key: 'updateCurrent' }));
    updater.on('download-progress', info => publish({ key: 'updateDownloading', percent: Math.round(info.percent || 0) }));
    updater.on('error', () => { downloading = false; if (installing) { installing = false; installationFailed(); } publish({ key: 'updateError' }); });
    updater.on('update-downloaded', info => {
      downloading = false; ready = true; publish({ key: 'updateReady', version: info.version });
      const window = getWindow();
      if (window && !window.isDestroyed() && window.isFocused()) promptInstall().catch(() => {});
    });
  }
  return {
    state: () => ({ ...state, available: available(), ready }),
    check, install: promptInstall,
    settingsChanged() {
      configure();
      if (enabled()) { if (ready) ready = false; check(); }
      else if (!ready) publish({ key: 'updateDisabled' });
    },
    start() {
      if (!available()) return;
      initialTimer = setTimeout(() => check(), 15000); initialTimer.unref?.();
      intervalTimer = setInterval(() => check(), 6 * 60 * 60 * 1000); intervalTimer.unref?.();
    },
    shutdown() { stopped = true; updater.autoInstallOnAppQuit = false; clearTimeout(initialTimer); clearInterval(intervalTimer); }
  };
}
module.exports = { createUpdates };
