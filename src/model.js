const { randomUUID } = require('node:crypto');
const { translate, normalizeLanguage } = require('./i18n');

function createAccount(index, language = 'en') {
  return { id: randomUUID(), name: translate(language, 'accountNumber', { n: index }), open: true, muted: false };
}

function normalizeConfig(value) {
  const seen = new Set();
  const accounts = (Array.isArray(value?.accounts) ? value.accounts : [])
    .filter(a => a && typeof a.id === 'string' && /^[a-f0-9-]{36}$/.test(a.id) && !seen.has(a.id) && seen.add(a.id))
    .map(a => ({ id: a.id, name: String(a.name || translate(value?.settings?.language, 'genericAccount')).slice(0, 40), open: a.open !== false, muted: a.muted === true,
      profile: validateProfile(a.profile), vencord: a.vencord === true }));
  return { accounts, activeId: accounts.find(a => a.open && a.id === value?.activeId)?.id || accounts.find(a => a.open)?.id || null,
    settings: { minimizeOnClose: value?.settings?.minimizeOnClose === true,
      language: normalizeLanguage(value?.settings?.language), autoUpdates: value?.settings?.autoUpdates !== false } };
}

function unreadFromTitle(title) {
  const match = String(title).match(/^\((\d+)\)\s*/);
  return match ? Math.min(Number(match[1]), 9999) : 0;
}

function isDiscord(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && parsed.hostname === 'discord.com'; }
  catch { return false; }
}

function validateProfile(profile) {
  if (!profile || typeof profile.displayName !== 'string' || !profile.displayName.trim() || typeof profile.avatarUrl !== 'string') return null;
  try {
    const url = new URL(profile.avatarUrl);
    if (url.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) || !/^\/(avatars\/\d+\/|embed\/avatars\/)/.test(url.pathname)) return null;
    return { displayName: profile.displayName.trim().slice(0, 128), avatarUrl: url.href };
  } catch { return null; }
}

module.exports = { createAccount, normalizeConfig, unreadFromTitle, isDiscord, validateProfile };
