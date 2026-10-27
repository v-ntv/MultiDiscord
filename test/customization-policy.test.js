const { test } = require('node:test');
const assert = require('node:assert/strict');
const { customizationHeaders } = require('../src/customization-policy');

test('la CSP est retirée uniquement des documents Discord dans un compte Vencord', () => {
  const responseHeaders = { 'Content-Security-Policy': ["default-src 'self'"], 'content-security-policy-report-only': ['x'], 'Other': ['kept'] };
  const details = { url: 'https://discord.com/app', resourceType: 'mainFrame', responseHeaders };
  assert.deepEqual(customizationHeaders(details, false, false), responseHeaders);
  assert.deepEqual(customizationHeaders(details, true, false), { Other: ['kept'] });
  assert.deepEqual(customizationHeaders({ ...details, url: 'https://discord.com.attacker.example/app' }, true, false), responseHeaders);
  assert.deepEqual(customizationHeaders({ ...details, resourceType: 'script' }, true, false), responseHeaders);
  assert.equal(responseHeaders['Content-Security-Policy'][0], "default-src 'self'");
});

test('le type CSS de GitHub ne change que pour une feuille d’un compte personnalisé', () => {
  const details = { url: 'https://raw.githubusercontent.com/author/theme/main/theme.css', resourceType: 'stylesheet', responseHeaders: { 'content-type': ['text/plain'] } };
  assert.deepEqual(customizationHeaders(details, false, false), details.responseHeaders);
  assert.deepEqual(customizationHeaders(details, false, true), { 'Content-Type': ['text/css'] });
  assert.deepEqual(customizationHeaders({ ...details, resourceType: 'script' }, true, true), details.responseHeaders);
});
