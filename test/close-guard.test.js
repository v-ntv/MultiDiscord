const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCloseGuard } = require('../src/close-guard');

test('annuler conserve la fenêtre et une seule confirmation est affichée à la fois', async () => {
  let confirmations = 0, quits = 0, resolve;
  const guard = createCloseGuard({ getSettings: () => ({ minimizeOnClose: false }), isQuitting: () => false,
    confirm: () => { confirmations++; return new Promise(done => { resolve = done; }); }, quit: () => quits++ });
  let prevented = 0;
  const window = { isDestroyed: () => false };
  const pending = guard({ preventDefault: () => prevented++ }, window);
  await guard({ preventDefault: () => prevented++ }, window);
  assert.equal(confirmations, 1); assert.equal(prevented, 2);
  resolve(false); await pending; assert.equal(quits, 0);
});

test('confirmer quitte ; la réduction et l’arrêt système évitent la confirmation', async () => {
  let minimizeOnClose = false, quitting = false, quits = 0, prompts = 0, minimized = 0, prevented = 0;
  const guard = createCloseGuard({ getSettings: () => ({ minimizeOnClose }), isQuitting: () => quitting,
    confirm: async () => { prompts++; return true; }, quit: () => quits++ });
  const window = { isDestroyed: () => false, minimize: () => minimized++ };
  const event = { preventDefault: () => prevented++ };
  await guard(event, window); assert.equal(quits, 1);
  minimizeOnClose = true; await guard(event, window); assert.equal(minimized, 1); assert.equal(prompts, 1);
  quitting = true; await guard(event, window); assert.equal(prevented, 2);
});
