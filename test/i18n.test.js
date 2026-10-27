const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messages, translate } = require('../src/i18n');
const { normalizeConfig } = require('../src/model');
const { releaseVersion } = require('../scripts/prepare-release.cjs');

test('toutes les chaînes ont une traduction FR et EN avec les mêmes variables', () => {
  assert.deepEqual(Object.keys(messages.fr).sort(), Object.keys(messages.en).sort());
  for (const key of Object.keys(messages.fr)) {
    assert.deepEqual((messages.fr[key].match(/\{\w+\}/g) || []).sort(), (messages.en[key].match(/\{\w+\}/g) || []).sort(), key);
  }
  assert.equal(translate('en', 'accountNumber', { n: 2 }), 'Account 2');
  assert.equal(normalizeConfig({ settings: { language: 'en', autoUpdates: false } }).settings.language, 'en');
  assert.equal(normalizeConfig({ settings: { language: 'unknown' } }).settings.language, 'fr');
});

test('versions CI déterministes et croissantes sans commit de version automatique', () => {
  assert.equal(releaseVersion('0.5.0', '21'), '0.5.21');
  assert.equal(releaseVersion('0.5.0', '22'), '0.5.22');
  assert.equal(releaseVersion('0.5.0', '21'), releaseVersion('0.5.0', '21'));
  assert.throws(() => releaseVersion('bad', '1'));
  assert.throws(() => releaseVersion('0.5.0', 'undefined'));
});
