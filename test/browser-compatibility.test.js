const { test } = require('node:test');
const assert = require('node:assert/strict');
const { discordUserAgent } = require('../src/browser-compatibility');

test('Discord reçoit un identifiant Chrome utilisant la véritable version de Chromium', () => {
  const ua = discordUserAgent('151.0.1234.5', 'win32');
  assert.match(ua, /Windows NT 10\.0; Win64; x64/);
  assert.match(ua, /Chrome\/151\.0\.0\.0 Safari\/537\.36$/);
  assert.doesNotMatch(ua, /Electron|MultiDiscord|DiscordNative/);
  assert.match(discordUserAgent('152.0.1.0', 'win32'), /Chrome\/152\.0\.0\.0/);
  assert.match(discordUserAgent('151.0.0.0', 'darwin'), /Macintosh/);
  assert.match(discordUserAgent('151.0.0.0', 'linux'), /X11; Linux/);
  assert.throws(() => discordUserAgent(undefined));
});
