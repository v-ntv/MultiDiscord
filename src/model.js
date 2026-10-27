const { randomUUID } = require('node:crypto');

function createAccount(index) {
  return { id: randomUUID(), name: `Compte ${index}`, open: true, muted: false };
}

function normalizeConfig(value) {
  const seen = new Set();
  const accounts = (Array.isArray(value?.accounts) ? value.accounts : [])
    .filter(a => a && typeof a.id === 'string' && /^[a-f0-9-]{36}$/.test(a.id) && !seen.has(a.id) && seen.add(a.id))
    .map(a => ({ id: a.id, name: String(a.name || 'Compte').slice(0, 40), open: a.open !== false, muted: a.muted === true,
      profile: validateProfile(a.profile), vencord: a.vencord === true }));
  return { accounts, activeId: accounts.find(a => a.open && a.id === value?.activeId)?.id || accounts.find(a => a.open)?.id || null,
    settings: { minimizeOnClose: value?.settings?.minimizeOnClose === true } };
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
