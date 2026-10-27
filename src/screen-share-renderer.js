let state, kind = 'screen', selected = null, busy = false;
const sources = document.querySelector('#sources');
const share = document.querySelector('#share');
const error = document.querySelector('#error');
const t = (key, values) => window.MultiDiscordI18n.translate(state?.language, key, values);

function render() {
  sources.replaceChildren();
  const visible = state.sources.filter(source => source.kind === kind);
  if (!visible.length) {
    const message = document.createElement('p'); message.textContent = t('noSources'); sources.append(message);
  }
  for (const source of visible) {
    const button = document.createElement('button'); button.className = 'source'; button.dataset.sourceId = source.id;
    button.setAttribute('aria-pressed', String(source.id === selected)); button.title = source.name;
    const image = document.createElement('img'); image.src = source.thumbnail; image.alt = '';
    const name = document.createElement('span'); name.textContent = source.name;
    button.append(image, name);
    button.addEventListener('click', () => {
      if (busy) return;
      selected = source.id;
      for (const item of sources.children) item.setAttribute('aria-pressed', String(item.dataset.sourceId === selected));
      share.disabled = false;
    });
    sources.append(button);
  }
  share.disabled = !selected || busy;
}

for (const filter of document.querySelectorAll('[data-kind]')) filter.addEventListener('click', () => {
  if (busy || !state) return;
  kind = filter.dataset.kind; selected = null;
  for (const button of document.querySelectorAll('[data-kind]')) button.setAttribute('aria-pressed', String(button === filter));
  render();
});

const cancel = () => window.screenShare.choose(null).catch(() => window.close());
document.querySelector('#cancel').addEventListener('click', cancel);
document.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
share.addEventListener('click', async () => {
  if (!selected || busy) return;
  busy = true; share.disabled = true; error.textContent = '';
  try { await window.screenShare.choose({ sourceId: selected, audio: state.canShareAudio && document.querySelector('#audio').checked }); }
  catch { error.textContent = t('shareChooseError'); busy = false; share.disabled = false; }
});

window.screenShare.state().then(result => {
  state = result;
  window.MultiDiscordI18n.applyDocument(document, state.language);
  document.querySelector('#account').textContent = t('shareAccount', { name: state.accountName });
  document.querySelector('#audio-option').hidden = !state.canShareAudio;
  document.querySelector('#audio-note').hidden = !state.canShareAudio;
  if (!state.sources.some(source => source.kind === 'screen')) {
    kind = 'window';
    for (const button of document.querySelectorAll('[data-kind]')) button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
  }
  render();
}).catch(() => { error.textContent = t('shareLoadError'); });
