const api = window.multiDiscord;
const tabs = document.querySelector('#tabs');
const status = document.querySelector('#status');
let current = { accounts: [], activeId: null };
let editingId = null;

async function action(name, id, value) {
  try { render(await api.action(name, id, value)); }
  catch { status.textContent = 'Une erreur est survenue. Relancez l’application.'; status.classList.add('error'); }
}

function rename(account, label) {
  editingId = account.id;
  const input = document.createElement('input');
  input.className = 'rename'; input.maxLength = 40; input.value = account.name;
  input.setAttribute('aria-label', 'Nom du compte');
  label.replaceWith(input); input.focus(); input.select();
  let finished = false;
  function finish(commit) {
    if (finished) return;
    finished = true; editingId = null;
    if (commit && input.value.trim()) action('rename', account.id, input.value);
    else render(current);
  }
  input.addEventListener('click', event => event.stopPropagation());
  input.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

function render(state) {
  current = state;
  if (editingId) return;
  const previousFocus = document.activeElement?.closest('[data-id]')?.dataset.id;
  const scroll = tabs.scrollLeft;
  tabs.replaceChildren();
  for (const account of state.accounts) {
    const displayName = account.profile?.displayName || account.name;
    const tab = document.createElement('div');
    tab.className = 'tab'; tab.dataset.id = account.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(account.id === state.activeId));
    tab.setAttribute('aria-label', `${displayName}${account.unread ? `, ${account.unread} notifications` : ''}`);
    tab.tabIndex = account.id === state.activeId ? 0 : -1;
    tab.title = `${displayName} — ${account.error || account.title || 'Discord'}${account.profile ? '' : '\nDouble-cliquez pour renommer'}`;
    const avatar = document.createElement('span'); avatar.className = 'avatar';
    avatar.textContent = account.loading ? '···' : account.name.slice(0, 2).toUpperCase();
    if (account.profile?.avatarUrl) {
      const image = document.createElement('img'); image.src = account.profile.avatarUrl; image.alt = ''; image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => image.remove());
      avatar.append(image);
    }
    const name = document.createElement('span'); name.className = 'tab-name'; name.textContent = displayName;
    const close = document.createElement('button'); close.className = 'close'; close.textContent = '×';
    close.title = 'Fermer l’onglet (compte conservé)'; close.setAttribute('aria-label', `Fermer ${account.name}`);
    close.addEventListener('click', event => { event.stopPropagation(); action('close', account.id); });
    tab.append(avatar, name);
    if (account.unread) {
      const badge = document.createElement('span'); badge.className = 'badge';
      badge.textContent = account.unread > 99 ? '99+' : account.unread; tab.append(badge);
    }
    if (account.muted || account.audible) {
      const audio = document.createElement('span'); audio.className = 'audio'; audio.textContent = account.muted ? '♩' : '♫';
      audio.title = account.muted ? 'Son coupé' : 'Audio en cours'; tab.append(audio);
    }
    tab.append(close);
    tab.addEventListener('click', () => { if (current.activeId !== account.id) action('activate', account.id); });
    tab.addEventListener('dblclick', event => { if (!account.profile && !event.target.closest('button')) rename(account, name); });
    tab.addEventListener('keydown', event => {
      if (event.target !== tab) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action('activate', account.id); }
      if (event.key === 'F2' && !account.profile) { event.preventDefault(); rename(account, name); }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const index = state.accounts.findIndex(a => a.id === account.id);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? state.accounts.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + state.accounts.length) % state.accounts.length;
        action('activate', state.accounts[next].id);
      }
    });
    tabs.append(tab);
  }
  tabs.scrollLeft = scroll;
  if (previousFocus) [...tabs.children].find(tab => tab.dataset.id === previousFocus)?.focus({ preventScroll: true });
  const active = state.accounts.find(a => a.id === state.activeId);
  const mute = document.querySelector('#mute'); mute.disabled = !active;
  mute.setAttribute('aria-pressed', String(active?.muted || false));
  mute.title = active?.muted ? 'Réactiver le son de cet onglet' : 'Couper le son de cet onglet';
  mute.setAttribute('aria-label', mute.title);
  document.querySelector('#reload').disabled = !active;
  status.classList.toggle('error', Boolean(state.saveError || active?.error));
  status.textContent = state.saveError || active?.error || (active?.loading ? 'Connexion à Discord…' : `${state.accounts.length} compte${state.accounts.length > 1 ? 's' : ''} ouvert${state.accounts.length > 1 ? 's' : ''} · Sessions indépendantes`);
  status.title = status.textContent;
}

document.querySelector('#add').addEventListener('click', () => action('add'));
document.querySelector('#first-account').addEventListener('click', () => action('add'));
document.querySelector('#accounts').addEventListener('click', () => action('menu'));
document.querySelector('#settings').addEventListener('click', () => action('settings'));
document.querySelector('#reload').addEventListener('click', () => action('reload', current.activeId));
document.querySelector('#mute').addEventListener('click', () => action('mute', current.activeId));
if (api) {
  api.subscribe(render);
  api.state().then(render).catch(() => { status.textContent = 'Impossible de charger les comptes.'; });
}
