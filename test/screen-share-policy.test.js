const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canRequestScreenShare, captureSelection } = require('../src/screen-share-policy');

test('seule une demande vidéo explicite du document Discord principal ouvre le sélecteur', () => {
  const frame = { url: 'https://discord.com/channels/@me', detached: false };
  const owner = { isDestroyed: () => false, mainFrame: frame };
  const request = { frame, securityOrigin: 'https://discord.com', userGesture: true, videoRequested: true };
  assert.equal(canRequestScreenShare(request, owner), true);
  for (const patch of [{ userGesture: false }, { videoRequested: false }, { securityOrigin: 'https://evil.example' }, { frame: null }, { frame: { ...frame } }]) {
    assert.equal(canRequestScreenShare({ ...request, ...patch }, owner), false);
  }
  assert.equal(canRequestScreenShare(request, { ...owner, isDestroyed: () => true }), false);
  frame.detached = true;
  assert.equal(canRequestScreenShare(request, owner), false);
});

test('aucune capture sans source choisie ; le son système reste explicite et propre à Windows', () => {
  const sources = [{ id: 'window:42:0', name: 'Test' }];
  const options = { audioRequested: true, platform: 'win32' };
  assert.equal(captureSelection(sources, null, options), null);
  assert.equal(captureSelection(sources, { sourceId: 'window:other' }, options), null);
  assert.deepEqual(captureSelection(sources, { sourceId: sources[0].id }, options), { video: sources[0] });
  assert.equal(captureSelection(sources, { sourceId: sources[0].id, audio: true }, options).audio, 'loopback');
  assert.equal(captureSelection(sources, { sourceId: sources[0].id, audio: true }, { ...options, audioRequested: false }).audio, undefined);
  assert.equal(captureSelection(sources, { sourceId: sources[0].id, audio: true }, { ...options, platform: 'darwin' }).audio, undefined);
});
