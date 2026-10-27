const { isDiscord } = require('./model');

function customizationHeaders(details, vencordEnabled, hasTheme) {
  const headers = { ...details.responseHeaders };
  const document = ['mainFrame', 'subFrame'].includes(details.resourceType);
  const relaxCsp = vencordEnabled && isDiscord(details.url) && document;
  let rawStylesheet = false;
  try {
    const url = new URL(details.url);
    rawStylesheet = (vencordEnabled || hasTheme) && details.resourceType === 'stylesheet' && url.origin === 'https://raw.githubusercontent.com';
  } catch { /* Invalid URLs retain the original response policy. */ }
  for (const key of Object.keys(headers)) {
    if (relaxCsp && /^content-security-policy(?:-report-only)?$/i.test(key)) delete headers[key];
    if (rawStylesheet && /^content-type$/i.test(key)) delete headers[key];
  }
  if (rawStylesheet) headers['Content-Type'] = ['text/css'];
  return headers;
}

module.exports = { customizationHeaders };
