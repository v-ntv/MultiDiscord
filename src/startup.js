function createStartup(app, { platform = process.platform, executable = process.execPath } = {}) {
  const options = () => platform === 'win32' ? { path: executable, args: [], name: 'fr.multidiscord.desktop' } : {};
  const available = () => app.isPackaged && ['win32', 'darwin'].includes(platform);
  const enabled = () => {
    if (!available()) return false;
    const settings = app.getLoginItemSettings(options());
    return Boolean(platform === 'win32' ? settings.openAtLogin && settings.executableWillLaunchAtLogin : settings.openAtLogin);
  };
  const set = value => {
    if (!available()) return;
    app.setLoginItemSettings({ ...options(), openAtLogin: value, enabled: value });
  };
  return { available, enabled, set };
}
module.exports = { createStartup };
