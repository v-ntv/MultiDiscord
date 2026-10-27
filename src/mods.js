const { app, dialog, net, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { translate } = require('./i18n');

function root() { return path.join(app.getPath('userData'), 'customizations'); }
function themePath(id) { return path.join(root(), `${id}.theme.css`); }
function vencord() {
  try {
    const version = fs.readFileSync(path.join(root(), 'vencord-current'), 'utf8').trim();
    if (!/^[a-f0-9]{64}$/.test(version)) return null;
    const folder = path.join(root(), version);
    return { script: fs.readFileSync(path.join(folder, 'browser.js'), 'utf8'), css: fs.readFileSync(path.join(folder, 'browser.css'), 'utf8') };
  } catch { return null; }
}

async function download(name, t) {
  const response = await net.fetch(`https://github.com/Vendicated/Vencord/releases/download/devbuild/${name}`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(t('downloadError', { name, status: response.status }));
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error(t('vencordSize'));
  return Buffer.from(bytes);
}

let installing = false;
async function installVencord(window, language = 'fr') {
  const t = (key, values) => translate(language, key, values);
  if (installing) return false;
  installing = true;
  try {
    const [script, css] = await Promise.all([download('browser.js', t), download('browser.css', t)]);
    if (!script.toString('utf8').includes('Vencord') || script.toString('utf8').trimStart().startsWith('<')) throw new Error(t('vencordInvalid'));
    const version = crypto.createHash('sha256').update(script).update(css).digest('hex');
    const folder = path.join(root(), version);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'browser.js'), script);
    fs.writeFileSync(path.join(folder, 'browser.css'), css);
    fs.writeFileSync(path.join(root(), 'vencord-current.tmp'), version);
    fs.renameSync(path.join(root(), 'vencord-current.tmp'), path.join(root(), 'vencord-current'));
    return true;
  } catch (error) {
    console.error('Vencord installation:', error.message);
    if (!window.isDestroyed()) await dialog.showMessageBox(window, { type: 'error', message: t('vencordInstallError'), detail: error.message });
    return false;
  } finally { installing = false; }
}

async function importTheme(window, id, language = 'fr') {
  const t = key => translate(language, key);
  const result = await dialog.showOpenDialog(window, { title: t('themeDialog'), filters: [{ name: t('cssThemes'), extensions: ['css'] }], properties: ['openFile'] });
  if (result.canceled) return false;
  try {
    if (fs.statSync(result.filePaths[0]).size > 2 * 1024 * 1024) throw new Error(t('themeTooLarge'));
    fs.mkdirSync(root(), { recursive: true });
    fs.copyFileSync(result.filePaths[0], themePath(id));
    return true;
  } catch (error) {
    await dialog.showMessageBox(window, { type: 'error', message: t('themeImportError'), detail: error.message });
    return false;
  }
}

function theme(id) { try { return fs.readFileSync(themePath(id), 'utf8'); } catch { return ''; } }
function removeTheme(id) { fs.rmSync(themePath(id), { force: true }); }
function openFolder() { fs.mkdirSync(root(), { recursive: true }); return shell.openPath(root()); }

module.exports = { vencord, installVencord, importTheme, theme, removeTheme, openFolder };
