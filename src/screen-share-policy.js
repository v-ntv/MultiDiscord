const { isDiscord } = require('./model');

function canRequestScreenShare(request, owner) {
  return Boolean(owner && !owner.isDestroyed() && request.frame && !request.frame.detached &&
    request.frame === owner.mainFrame && isDiscord(request.securityOrigin) && isDiscord(request.frame.url) &&
    request.userGesture && request.videoRequested);
}

function captureSelection(sources, selection, { audioRequested, platform = process.platform }) {
  if (!selection || typeof selection.sourceId !== 'string') return null;
  const source = sources.find(item => item.id === selection.sourceId);
  if (!source || !/^(screen|window):/.test(source.id)) return null;
  return { video: source, ...(audioRequested && platform === 'win32' && selection.audio === true ? { audio: 'loopback' } : {}) };
}

module.exports = { canRequestScreenShare, captureSelection };
