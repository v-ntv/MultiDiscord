const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAccount, normalizeConfig, unreadFromTitle, isDiscord, validateProfile } = require('../src/model');

test('chaque compte possède un identifiant de session unique', () => {
  const first = createAccount(1), second = createAccount(2);
  assert.notEqual(first.id, second.id);
  assert.equal(first.open, true);
  assert.equal(normalizeConfig({ accounts: [first, second], activeId: second.id }).activeId, second.id);
});

test('les préférences de fermeture survivent à la restauration sans changer les anciens comptes', () => {
  assert.equal(normalizeConfig({}).settings.minimizeOnClose, false);
  assert.equal(normalizeConfig({ settings: { minimizeOnClose: true } }).settings.minimizeOnClose, true);
  assert.equal(normalizeConfig({ settings: { minimizeOnClose: 'false' } }).settings.minimizeOnClose, false);
});

test('restauration : doublons et identifiants invalides exclus, compte fermé conservé', () => {
  const first = createAccount(1), closed = { ...createAccount(2), open: false };
  const restored = normalizeConfig({ accounts: [first, first, closed, null, { id: '../../bad' }], activeId: closed.id });
  assert.equal(restored.accounts.length, 2);
  assert.equal(restored.activeId, first.id);
  assert.equal(restored.accounts[1].open, false);
  assert.equal(normalizeConfig(null).activeId, null);
});

test('un compteur suit le titre Discord, y compris le retour à zéro', () => {
  assert.equal(unreadFromTitle('(12) Discord | Amis'), 12);
  assert.equal(unreadFromTitle('Discord | Amis'), 0);
  assert.equal(unreadFromTitle('#salon (24) | Discord'), 0);
  assert.equal(unreadFromTitle('(100000) Discord'), 9999);
});

test('seule l’origine HTTPS Discord reçoit les permissions', () => {
  assert.equal(isDiscord('https://discord.com/channels/@me'), true);
  for (const url of ['https://discord.com.attacker.com', 'http://discord.com', 'https://discord.com@attacker.com', 'file:///discord.com', 'invalid']) assert.equal(isDiscord(url), false);
});

test('les profils ne peuvent charger que des avatars du CDN Discord', () => {
  const profile = { displayName: ' Alice ', avatarUrl: 'https://cdn.discordapp.com/avatars/123/abc.png?size=64' };
  assert.equal(validateProfile(profile).displayName, 'Alice');
  const account = { ...createAccount(1), profile, vencord: true };
  const restored = normalizeConfig({ accounts: [account] }).accounts[0];
  assert.equal(restored.profile.displayName, 'Alice');
  assert.equal(restored.vencord, true);
  for (const url of ['javascript:alert(1)', 'file:///secret', 'https://evil.example/avatars/123/a.png', 'https://cdn.discordapp.com/not-avatar']) {
    assert.equal(validateProfile({ ...profile, avatarUrl: url }), null);
  }
  assert.equal(validateProfile(null), null);
});
