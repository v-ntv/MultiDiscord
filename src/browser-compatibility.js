function discordUserAgent(chromeVersion, platform = process.platform) {
  const major = /^(\d+)(?:\.\d+){0,3}$/.exec(String(chromeVersion))?.[1];
  if (!major || Number(major) < 1) throw new Error('Missing Chromium version');
  const os = platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' :
    platform === 'linux' ? 'X11; Linux x86_64' : 'Windows NT 10.0; Win64; x64';
  // Discord must use its browser media path, rather than expecting DiscordNative.
  // Match Chromium's reduced Chrome UA and derive its major from the real runtime.
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

module.exports = { discordUserAgent };
