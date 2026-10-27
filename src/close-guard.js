function createCloseGuard({ getSettings, isQuitting, confirm, quit }) {
  let prompting = false;
  return async function close(event, window) {
    if (isQuitting()) return;
    event.preventDefault();
    if (getSettings().minimizeOnClose) { window.minimize(); return; }
    if (prompting) return;
    prompting = true;
    try {
      const approved = await confirm(window);
      if (approved && !window.isDestroyed() && !isQuitting()) quit();
    } finally { prompting = false; }
  };
}
module.exports = { createCloseGuard };
