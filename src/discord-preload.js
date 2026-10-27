const { contextBridge, ipcRenderer } = require('electron');

if (location.origin === 'https://discord.com' && process.isMainFrame) {
  // Runs before Discord, without exposing Node.js or IPC to the page.
  contextBridge.executeInMainWorld({ func: () => {
    const credentials = navigator.credentials;
    for (const method of ['get', 'create']) {
      const original = credentials?.[method]?.bind(credentials);
      if (original) Object.defineProperty(credentials, method, { value: options => {
        if (options?.publicKey) return Promise.reject(new DOMException('Passkeys disabled in MultiDiscord', 'NotAllowedError'));
        return original(options);
      } });
    }
    if (window.PublicKeyCredential) {
      for (const method of ['isConditionalMediationAvailable', 'isUserVerifyingPlatformAuthenticatorAvailable']) {
        Object.defineProperty(PublicKeyCredential, method, { value: async () => false });
      }
    }
  } });

  const mod = ipcRenderer.sendSync('discord:bootstrap');
  if (mod?.script) {
    try {
      contextBridge.executeInMainWorld({ func: new Function(`${mod.script}\n;window.Vencord = Vencord;\nVencordNative.native.getRendererCss = async () => ${JSON.stringify(mod.css || '')};`) });
    } catch (error) { ipcRenderer.send('discord:mod-error', String(error.message).slice(0, 200)); }
  }

  let previous = '', timer;
  function inspectProfile() {
    let profile = null;
    if (!/^\/(login|register|logout)(\/|$)/.test(location.pathname)) {
      const area = document.querySelector('section[aria-label="User area"], section[aria-label="Zone utilisateur"], [class*="panels_"]');
      const image = area?.querySelector('img[src*="/avatars/"], img[src*="/embed/avatars/"]');
      const name = area?.querySelector('[class*="nameTag"] [class*="title"], [class*="nameTag"] [class*="username"], [class*="nameTag"] [class*="text"]');
      const displayName = name?.textContent?.trim();
      if (displayName && image) profile = { displayName, avatarUrl: image.src };
      else return;
    }
    const serialized = JSON.stringify(profile);
    if (serialized !== previous) { previous = serialized; ipcRenderer.send('discord:profile', profile); }
  }
  window.addEventListener('DOMContentLoaded', () => {
    inspectProfile();
    new MutationObserver(() => { if (!timer) timer = setTimeout(() => { timer = null; inspectProfile(); }, 250); })
      .observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  }, { once: true });
}
