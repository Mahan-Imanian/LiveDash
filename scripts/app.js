(function () {
  const root = document.getElementById('app');
  let state = null;
  let timerId = null;
  let accountOpen = false;
  let commandOpen = false;
  let settingsOpen = false;
  let bookmarkEditingId = null;
  let activeTaskFilter = 'open';

  const $ = (selector, node = document) => node.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const now = () => new Date();

  const searchEngines = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q='
  };

  const brandIcons = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 11.2 12 4l8 7.2V20h-5v-5H9v5H4v-8.8Z" fill="currentColor"/></svg>',
    apps: '<svg viewBox="0 0 24 24"><path d="M5 5h6v6H5V5Zm8 0h6v6h-6V5ZM5 13h6v6H5v-6Zm8 0h6v6h-6v-6Z" fill="currentColor"/></svg>',
    explore: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 9-2.2 5.8L9 16l2.2-5.8L15 9Z" fill="currentColor"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v2m0 12v2m8-8h-2M6 12H4m13.7-5.7-1.4 1.4M7.7 16.3l-1.4 1.4m11.4 0-1.4-1.4M7.7 7.7 6.3 6.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 19c1.3-3.3 3.5-5 6.5-5s5.2 1.7 6.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    sync: '<svg viewBox="0 0 24 24"><path d="M17 8a6 6 0 0 0-10.2 3.2M7 8H4V5m3 11a6 6 0 0 0 10.2-3.2M17 16h3v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="5.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cloud: '<svg viewBox="0 0 24 24"><path d="M8 17h8a4 4 0 0 0 .4-8 5 5 0 0 0-9.7 1.4A3.4 3.4 0 0 0 8 17Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    task: '<svg viewBox="0 0 24 24"><path d="M8 7h11M8 12h11M8 17h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m4 7 .8.8L6.5 6M4 12l.8.8 1.7-1.8M4 17l.8.8 1.7-1.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M7 4h8l4 4v12H7V4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 4v4h4M10 12h5M10 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    feed: '<svg viewBox="0 0 24 24"><path d="M7 11h10v3a5 5 0 0 1-10 0v-3Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8c1-1 2-1 3 0s2 1 3 0 2-1 3 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 10.5c3.5 1.2 6.7.4 9.8-2.5M9 19c-.8-3.4.1-6.6 2.7-9.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    rest: '<svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h6M8 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    google: '<svg viewBox="0 0 24 24"><path d="M12 4.5a7.5 7.5 0 1 0 0 15c3.9 0 6.8-2.6 6.8-6.2 0-.5 0-.8-.1-1.2H12v2.7h3.9c-.3 1.6-1.7 2.7-3.9 2.7a4.9 4.9 0 1 1 3.4-8.4l2-2A7.4 7.4 0 0 0 12 4.5Z" fill="currentColor"/></svg>'
  };

  function miniIcon(key) {
    return `<span class="wg-mini-icon" aria-hidden="true">${brandIcons[key] || brandIcons.apps}</span>`;
  }

  function host(url) {
    try { return new URL(/^https?:\/\//i.test(url || '') ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function favicon(url) {
    const domain = host(url);
    if (!domain) return 'assets/brand/default.svg';
    const local = {
      'royalmail.com': 'assets/brand/royal-mail.svg',
      'whatsapp.com': 'assets/brand/whatsapp.svg',
      'web.whatsapp.com': 'assets/brand/whatsapp.svg',
      'gov.uk': 'assets/brand/govuk.svg',
      'european-union.europa.eu': 'assets/brand/eu.svg'
    };
    if (local[domain]) return local[domain];
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  function fallbackIcon(label = 'App') {
    return `<span class="fallback-favicon">${escapeHtml(label.trim().slice(0, 2).toUpperCase() || 'A')}</span>`;
  }

  function appIcon(app, cls = '') {
    const label = app?.name || app?.label || 'App';
    const url = app?.url || '';
    return `<span class="app-favicon ${cls}" data-label="${escapeHtml(label)}"><img src="${escapeHtml(favicon(url))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback="${escapeHtml(label)}"></span>`;
  }

  function backendConfig() { return window.LiveDashBackendConfig || { enabled: false, apiBaseUrl: '' }; }
  function backendUrl(path) { const base = String(backendConfig().apiBaseUrl || '').replace(/\/$/, ''); const suffix = String(path || '').startsWith('/') ? path : `/${path}`; return base ? `${base}${suffix}` : ''; }
  function backendHeaders() { return { 'Content-Type': 'application/json', ...(state?.profile?.authToken ? { Authorization: `Bearer ${state.profile.authToken}` } : {}) }; }
  function signedIn() { return Boolean(state?.profile?.signedIn || state?.profile?.authToken); }
  function profileInitials() { const v = state?.profile?.name || state?.profile?.email || 'LD'; return v.split(/\s+|@/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'LD'; }
  function formatTime(date = now()) { return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', { hour: '2-digit', minute: '2-digit', hour12: state?.profile?.timeFormat !== '24h' }).format(date); }
  function shortDate(date = now()) { return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date); }
  function timeParts() { const clean = formatTime().replace(/\s?(AM|PM)$/i, ''); const [h = '00', m = '00'] = clean.split(':'); return { h, m }; }
  function cityTime(offset) { return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', { hour: '2-digit', minute: '2-digit', hour12: state?.profile?.timeFormat !== '24h' }).format(new Date(Date.now() + Number(offset || 0) * 3600000)); }
  function toast(message) { let wrap = $('.toast-wrap'); if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); } const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; wrap.appendChild(el); setTimeout(() => el.remove(), 2800); }
  function activity(title, body) { state.activity = [{ id: uid('activity'), title, body, createdAt: new Date().toISOString() }, ...(state.activity || [])].slice(0, 40); }
  function notice(title, body, type = 'info') { state.notifications = [{ id: uid('notice'), title, body, type, read: false, createdAt: new Date().toISOString() }, ...(state.notifications || [])].slice(0, 25); }

  async function save() { state = await window.LiveDashStore.setState(state); if (state?.profile?.authToken) scheduleSync('state-update'); }
  let syncTimer = null;
  function scheduleSync(reason) { if (syncTimer) clearTimeout(syncTimer); syncTimer = setTimeout(() => syncCloud(reason), 1000); }
  async function syncCloud(reason = 'manual') {
    if (!state?.profile?.authToken || !backendConfig().enabled) return;
    try {
      await fetch(backendUrl(backendConfig().syncPath || '/api/livedash/sync.php'), { method: 'POST', headers: backendHeaders(), body: JSON.stringify({ reason, schema: state.schemaVersion, state }) });
      state.profile.lastCloudSyncAt = new Date().toISOString();
      await window.LiveDashStore.setState(state);
    } catch (error) { state.profile.lastCloudSyncError = error.message || 'Cloud sync failed'; await window.LiveDashStore.setState(state); }
  }
  function mergeCloud(localState, cloudState) { if (!cloudState || typeof cloudState !== 'object') return localState; const profile = { ...(localState.profile || {}) }; return { ...localState, ...cloudState, profile: { ...(cloudState.profile || {}), ...profile } }; }
  async function hydrateCloud(reason = 'refresh') {
    if (!state?.profile?.authToken || !backendConfig().enabled) return false;
    try {
      const res = await fetch(backendUrl(backendConfig().mePath || '/api/me.php'), { headers: backendHeaders() });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || 'Cloud profile unavailable');
      if (payload.state) state = mergeCloud(state, payload.state);
      state.profile = { ...(state.profile || {}), signedIn: true, backendConnected: true, cloudLoaded: true, email: payload.user?.email || state.profile.email || '', name: payload.user?.displayName || state.profile.name || payload.user?.email?.split('@')[0] || 'LiveDash user', avatarUrl: payload.user?.avatarUrl || payload.user?.picture || state.profile.avatarUrl || '', plan: payload.user?.plan || 'Cloud', lastCloudReason: reason, lastCloudSyncAt: payload.stateUpdatedAt || new Date().toISOString() };
      await window.LiveDashStore.setState(state);
      return true;
    } catch (error) { state.profile.lastCloudSyncError = error.message || 'Cloud load failed'; await window.LiveDashStore.setState(state); return false; }
  }
  async function googleSignIn() {
    const cfg = backendConfig();
    if (!cfg.enabled || !cfg.apiBaseUrl) { toast('Cloud endpoint is not configured'); return; }
    if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) { toast('Reload the extension to enable Google sign-in'); return; }
    const redirectUri = chrome.identity.getRedirectURL('google');
    const url = `${backendUrl(cfg.googleOAuthStartPath || '/auth/google/start.php')}?mode=extension&extension_redirect_uri=${encodeURIComponent(redirectUri)}`;
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, async (callbackUrl) => {
      if (chrome.runtime.lastError) { toast(chrome.runtime.lastError.message || 'Google sign-in cancelled'); return; }
      try {
        const parsed = new URL(callbackUrl || '');
        const token = parsed.searchParams.get('livedash_token');
        const email = parsed.searchParams.get('email');
        const error = parsed.searchParams.get('livedash_error');
        if (error) throw new Error(error.replace(/_/g, ' '));
        if (!token) throw new Error('Missing LiveDash token');
        state.profile.authToken = token;
        state.profile.email = email || state.profile.email || '';
        state.profile.signedIn = true;
        state.profile.backendConnected = true;
        accountOpen = false;
        activity('Cloud connected', state.profile.email || 'Google account connected');
        await hydrateCloud('google-sign-in');
        await save();
        toast('Cloud profile loaded');
        render();
      } catch (e) { toast(e.message || 'Google sign-in failed'); }
    });
  }

  function renderProfileBar() {
    const signed = signedIn();
    const avatar = state.profile?.avatarUrl ? `<img src="${escapeHtml(state.profile.avatarUrl)}" alt="">` : `<span>${escapeHtml(profileInitials())}</span>`;
    return `<header class="top-shell">
      <button class="widgetify-logo" data-route="home" type="button"><img src="assets/icons/icon32.png" alt=""><strong>LiveDash</strong></button>
      <div class="top-status ${signed ? 'signed' : ''}"><span></span>${signed ? 'Cloud profile synced' : 'Local dashboard'}</div>
      <button class="profile-nav ${signed ? 'signed' : ''}" data-action="account" type="button" aria-label="${signed ? 'Open profile' : 'Sign in'}"><span class="profile-avatar">${avatar}</span><span><strong>${escapeHtml(signed ? (state.profile.name || state.profile.email?.split('@')[0] || 'Profile') : 'Sign in')}</strong><small>${escapeHtml(signed ? (state.profile.email || 'Cloud account') : 'Google sync')}</small></span></button>
    </header>`;
  }
  function renderTabs() {
    return `<nav class="category-tabs" aria-label="Categories">${(state.categories || []).map((c) => `<button class="category-tab ${state.settings.appCategory === c.id ? 'active' : ''}" data-action="category" data-category="${escapeHtml(c.id)}" type="button">${miniIcon(c.id === 'daily' ? 'home' : c.id === 'tools' ? 'settings' : c.id === 'google' ? 'google' : c.id === 'public' ? 'cloud' : c.id === 'ai' ? 'search' : c.id === 'travel' ? 'sync' : 'apps')}<span>${escapeHtml(c.label)}</span></button>`).join('')}</nav>`;
  }
  function renderClock() { const p = timeParts(); return `<section class="wigi-card clock-widget"><div class="flip-clock"><span>${escapeHtml(p.h)}</span><span>${escapeHtml(p.m)}</span></div><div class="date-strip"><strong>${escapeHtml(shortDate())}</strong><small>${escapeHtml(state.weather.city)} · ${escapeHtml(state.weather.summary)} · ${escapeHtml(state.weather.tempC)}°C</small></div></section>`; }
  function renderRates() { return `<section class="wigi-card rates-widget"><div class="widget-head"><div>${miniIcon('sync')}<span><strong>Rates</strong><small>Base ${escapeHtml(state.settings.currencyBase || 'USD')}</small></span></div><button data-action="refresh">${miniIcon('sync')}</button></div><div class="rate-list">${(state.currency || []).map((c) => `<div><span>${escapeHtml(c.code)}</span><strong>${escapeHtml(c.value)}</strong><em>${c.delta === 'flat' ? '→' : '↑'}</em></div>`).join('')}</div></section>`; }
  function renderSearch() { return `<section class="search-widget"><div class="search-bar">${miniIcon('search')}<input id="mainSearch" type="search" placeholder="Search Google or type a command" autocomplete="off"><button data-action="command" type="button">⌘K</button></div><div class="quick-row">${[{name:'Gmail',url:'https://mail.google.com'}, {name:'Calendar',url:'https://calendar.google.com'}, {name:'ChatGPT',url:'https://chat.openai.com'}, {name:'Drive',url:'https://drive.google.com'}].map((a) => `<button data-action="open-url" data-url="${escapeHtml(a.url)}" type="button">${appIcon(a,'tiny')}<span>${escapeHtml(a.name)}</span></button>`).join('')}</div></section>`; }
  function renderBookmarks() { return `<section class="bookmark-board">${(state.bookmarkSlots || []).map((slot) => { const full = Boolean(slot.url); return `<button class="bookmark-card ${full ? '' : 'empty'}" data-action="${full ? 'open-bookmark' : 'edit-bookmark'}" data-id="${escapeHtml(slot.id)}" type="button"><span class="bookmark-image">${full ? appIcon(slot, 'bookmark') : miniIcon('plus')}</span><strong>${escapeHtml(full ? slot.label : 'Add site')}</strong><small>${escapeHtml(full ? host(slot.url) : 'Create shortcut')}</small></button>`; }).join('')}</section>`; }
  function petSprite() { const mode = state.pet?.mode || 'idle'; if (mode === 'play') return 'assets/widgetify/animals/dog/akita_with_ball_8fps.gif'; if (mode === 'feed') return 'assets/widgetify/animals/dog/akita_swipe_8fps.gif'; if (mode === 'rest') return 'assets/widgetify/animals/dog/akita_lie_8fps.gif'; return 'assets/widgetify/animals/dog/akita_idle_8fps.gif'; }
  function renderPet() {
    const pet = state.pet || {};
    const energy = Math.max(0, Math.min(100, Number(pet.energy || 70)));
    const mode = pet.mode || 'idle';
    const caption = mode === 'play' ? 'Great catch.' : mode === 'feed' ? 'Snack collected.' : mode === 'rest' ? 'Resting quietly.' : 'Ready to play.';
    return `<section class="wigi-card akita-widget calm-${escapeHtml(mode)}">
      <div class="widget-head"><div>${miniIcon('ball')}<span><strong>Akita</strong><small>${escapeHtml(pet.mood || 'Ready')} · ${escapeHtml(String(pet.score || 0))} score</small></span></div><span class="status-pill">${signedIn() ? 'Cloud' : 'Local'}</span></div>
      <button class="akita-stage" data-action="pet-play" type="button" aria-label="Play with Akita">
        <img src="${petSprite()}" alt="Akita dog" draggable="false">
        <span class="akita-caption">${caption}</span>
        <i class="akita-ball" aria-hidden="true"></i>
      </button>
      <div class="energy-track"><span style="width:${energy}%"></span></div>
      <div class="pet-controls"><button data-action="pet-feed" type="button">${miniIcon('feed')}<span>Feed</span></button><button data-action="pet-play" type="button">${miniIcon('ball')}<span>Play</span></button><button data-action="pet-rest" type="button">${miniIcon('rest')}<span>Rest</span></button></div>
    </section>`;
  }

  function renderTasks() {
    const all = state.tasks || [];
    const openCount = all.filter((t) => t.status !== 'done').length;
    const tasks = all.filter((t) => activeTaskFilter === 'all' ? true : activeTaskFilter === 'done' ? t.status === 'done' : t.status !== 'done').slice(0, 5);
    return `<section class="wigi-card task-widget task-widget-v27">
      <div class="task-top"><div>${miniIcon('task')}<span><strong>Tasks</strong><small>${openCount} open today</small></span></div><button data-action="add-task" type="button">New task</button></div>
      <div class="task-tabs"><button class="${activeTaskFilter==='open'?'active':''}" data-action="task-filter" data-filter="open" type="button">Open</button><button class="${activeTaskFilter==='all'?'active':''}" data-action="task-filter" data-filter="all" type="button">All</button><button class="${activeTaskFilter==='done'?'active':''}" data-action="task-filter" data-filter="done" type="button">Done</button></div>
      <div class="todo-list">${tasks.length ? tasks.map((task) => `<article class="todo-item ${task.status === 'done' ? 'done' : ''}">
        <button class="todo-check" data-action="complete-task" data-id="${escapeHtml(task.id)}" type="button" aria-label="Complete ${escapeHtml(task.title)}">${task.status === 'done' ? miniIcon('check') : ''}</button>
        <div class="todo-copy"><strong>${escapeHtml(task.title)}</strong><small><b class="priority-${escapeHtml(task.priority || 'medium')}">${escapeHtml(task.priority || 'medium')}</b>${task.due ? ` · ${escapeHtml(new Date(task.due).toLocaleDateString())}` : ''} · ${escapeHtml(task.source || 'LiveDash')}</small></div>
        <button data-action="delete-task" data-id="${escapeHtml(task.id)}" class="todo-delete" type="button" aria-label="Delete task">${miniIcon('x')}</button>
      </article>`).join('') : '<div class="empty-list">No tasks yet. Add one below.</div>'}</div>
      <div class="task-compose"><input id="taskInput" placeholder="Write a task and press Enter" aria-label="New task"><button data-action="add-task-input" type="button" aria-label="Add task">${miniIcon('plus')}</button></div>
    </section>`;
  }

  function renderFocus() { const r = state.focus.remaining || (state.settings.focusMinutes || 25) * 60; return `<section class="wigi-card focus-widget"><div class="widget-head"><div>${miniIcon('clock')}<span><strong>Focus</strong><small>${state.focus.running ? 'Running' : 'Ready'}</small></span></div></div><div class="pomo-ring"><strong>${Math.floor(r / 60).toString().padStart(2, '0')}:${(r % 60).toString().padStart(2, '0')}</strong><span>${escapeHtml(state.focus.mode || 'work')}</span></div><div class="focus-controls"><button data-action="pomo-reset">Reset</button><button class="primary-action" data-action="pomo-toggle">${state.focus.running ? 'Pause' : 'Start'}</button><button data-action="pomo-mode">Mode</button></div></section>`; }
  function renderCalendar() { return `<section class="wigi-card calendar-widget"><div class="widget-head"><div>${miniIcon('clock')}<span><strong>Calendar</strong><small>${escapeHtml(shortDate())}</small></span></div></div><div class="calendar-list"><div><b>09:30</b><span>Planning block</span></div><div><b>13:00</b><span>Review notes</span></div><div><b>16:30</b><span>Wrap-up</span></div></div></section>`; }
  function renderHome() { return `<main class="home-grid"><aside class="left-column">${renderClock()}${renderRates()}</aside><section class="middle-column">${renderSearch()}${renderBookmarks()}<div class="widget-row">${renderFocus()}${renderTasks()}</div></section><aside class="right-column">${renderPet()}${renderCalendar()}</aside></main>`; }
  function categoryById(id) { return (state.categories || []).find((c) => c.id === id) || (state.categories || [])[0]; }
  function renderAppTile(app) { return `<a class="app-tile" href="${escapeHtml(app.url || '#')}" target="_self"><span>${appIcon(app,'app')}</span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.note || host(app.url) || 'Open')}</small></a>`; }
  function renderApps() { const c = categoryById(state.settings.appCategory); return `<main class="apps-page"><section class="app-panel"><div class="panel-title"><strong>${escapeHtml(c.label)}</strong><span>${escapeHtml(c.accent || 'Apps')}</span></div><div class="app-grid">${(c.apps || []).map(renderAppTile).join('')}</div></section></main>`; }
  function renderExplore() { return `<main class="explore-page"><section class="app-panel"><div class="panel-title"><strong>Notes</strong><button data-action="add-note">New note</button></div><div class="note-list">${(state.notes || []).slice(0, 8).map((n) => `<article><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.tag || 'note')} · ${escapeHtml(new Date(n.createdAt).toLocaleDateString())}</span></article>`).join('')}</div></section><section class="app-panel"><div class="panel-title"><strong>World clocks</strong></div><div class="rate-list">${(state.worldClocks || []).map((c) => `<div><span>${escapeHtml(c.city)}</span><strong>${escapeHtml(cityTime(c.offset))}</strong><em></em></div>`).join('')}</div></section></main>`; }
  function renderDock() { if (state.settings.showDock === false) return `<button class="dock-handle" data-action="toggle-dock" type="button" aria-label="Show dock"><span></span></button>`; return `<nav class="widgetify-dock"><button data-action="toggle-dock" aria-label="Hide dock">${miniIcon('chevron')}</button><i></i><button data-action="account">${miniIcon('user')}</button><button data-action="refresh-cloud">${miniIcon('sync')}</button><i></i><button class="${state.settings.route==='apps'?'active':''}" data-route="apps">${miniIcon('apps')}</button><button class="${state.settings.route==='home'?'active':''}" data-route="home">${miniIcon('home')}</button><button class="${state.settings.route==='explore'?'active':''}" data-route="explore">${miniIcon('explore')}</button><i></i><button data-action="settings">${miniIcon('settings')}</button><button data-action="command">${miniIcon('search')}</button></nav>`; }
  function renderAccountModal() {
    const signed = signedIn();
    const avatar = state.profile?.avatarUrl ? `<img src="${escapeHtml(state.profile.avatarUrl)}" alt="">` : `<span>${escapeHtml(profileInitials())}</span>`;
    return `<div class="modal-backdrop open" data-action="close-modal"></div><section class="account-modal account-modal-v27 ${signed ? 'profile-mode' : ''}">
      <button class="modal-x" data-action="close-modal" type="button" aria-label="Close">${miniIcon('x')}</button>
      ${signed ? `<div class="account-hero"><div class="account-avatar">${avatar}</div><h2>${escapeHtml(state.profile.name || 'LiveDash user')}</h2><p>${escapeHtml(state.profile.email || 'Cloud account')}</p><span class="cloud-state">Cloud profile active</span></div><div class="account-stats"><div><strong>${(state.bookmarkSlots||[]).filter(s=>s.url).length}</strong><span>Shortcuts</span></div><div><strong>${(state.tasks||[]).filter(t=>t.status!=='done').length}</strong><span>Open tasks</span></div><div><strong>${state.pet?.score||0}</strong><span>Akita score</span></div></div><div class="auth-actions profile-actions"><button class="primary-action" data-action="refresh-cloud" type="button">Sync now</button><button data-action="sign-out" type="button">Sign out</button></div>` : `<div class="signin-hero signin-hero-v27"><div class="signin-logo"><img src="assets/icons/icon128.png" alt="LiveDash"></div><h2>Sign in to LiveDash</h2><p>Connect your cloud profile to sync shortcuts, tasks, notes, and Akita progress.</p></div><button class="google-signin google-signin-v27" data-action="google-sign-in" type="button"><span class="google-mark">G</span><span><strong>Continue with Google</strong><small>Secure cloud sync for LiveDash</small></span></button><div class="signin-divider"><span></span><em>or</em><span></span></div><label class="email-field"><span>Email address</span><input id="authEmail" type="email" placeholder="you@example.com"></label><button class="secondary-action" data-action="email-sign-in" type="button">Continue locally</button>`}
    </section>`;
  }

  function renderBookmarkModal() { const slot = (state.bookmarkSlots || []).find((b) => b.id === bookmarkEditingId) || {}; return `<div class="modal-backdrop open" data-action="close-modal"></div><section class="account-modal compact-modal"><button class="modal-x" data-action="close-modal">${miniIcon('x')}</button><h2>Bookmark slot</h2><label class="email-field"><span>Name</span><input id="bookmarkName" value="${escapeHtml(slot.label === 'Add site' ? '' : slot.label || '')}" placeholder="Gmail"></label><label class="email-field"><span>URL</span><input id="bookmarkUrl" value="${escapeHtml(slot.url || '')}" placeholder="https://example.com"></label><button class="primary-action" data-action="save-bookmark">Save shortcut</button></section>`; }
  function renderSettings() { return settingsOpen ? `<div class="modal-backdrop open" data-action="close-settings"></div><aside class="settings-drawer"><button class="modal-x" data-action="close-settings">${miniIcon('x')}</button><h2>Settings</h2><div class="theme-grid">${['sky','mist','pearl','sunset','forest'].map((t) => `<button class="${state.settings.theme===t?'active':''}" data-action="theme" data-theme="${t}">${escapeHtml(t)}</button>`).join('')}</div><button data-action="export">Export backup</button><label class="import-label">Import backup<input id="importFile" type="file" accept="application/json"></label><button data-action="reset">Reset dashboard</button></aside>` : ''; }
  function renderCommand() { return commandOpen ? `<div class="modal-backdrop open" data-action="close-command"></div><section class="command-card"><input id="commandInput" placeholder="Type a command or search"><button data-route="home">${miniIcon('home')}Home</button><button data-route="apps">${miniIcon('apps')}Apps</button><button data-action="add-task">${miniIcon('task')}Add task</button><button data-action="google-sign-in">${miniIcon('google')}Google sign in</button></section>` : ''; }
  function render() { document.body.dataset.theme = state.settings.theme || 'sky'; const route = state.settings.route || 'home'; root.innerHTML = `<div class="shell">${renderProfileBar()}${renderTabs()}<div class="page">${route === 'home' ? renderHome() : route === 'apps' ? renderApps() : renderExplore()}</div></div>${renderDock()}${accountOpen ? renderAccountModal() : ''}${bookmarkEditingId ? renderBookmarkModal() : ''}${renderSettings()}${renderCommand()}`; bindInputs(); }
  function bindInputs() { const search = $('#mainSearch'); if (search) search.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(search.value); }); const task = $('#taskInput'); if (task) task.addEventListener('keydown', async (e) => { if (e.key === 'Enter') await addTask(task.value); }); const cmd = $('#commandInput'); if (cmd) { setTimeout(() => cmd.focus(), 0); cmd.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(cmd.value); }); } const file = $('#importFile'); if (file) file.addEventListener('change', async () => { if (file.files?.[0]) await importBackup(file.files[0]); }); document.querySelectorAll('img[data-fallback]').forEach((img) => { img.addEventListener('error', () => { const label = img.getAttribute('data-fallback') || 'App'; img.parentElement.innerHTML = fallbackIcon(label); }); }); }
  function runSearch(value) { const query = String(value || '').trim(); if (!query) { commandOpen = true; render(); return; } const match = (state.categories || []).flatMap((c) => c.apps || []).find((a) => a.name.toLowerCase() === query.toLowerCase()); if (match) { location.href = match.url; return; } if (query.toLowerCase().startsWith('task ')) { addTask(query.slice(5)); return; } if (query.toLowerCase().startsWith('note ')) { addNote(query.slice(5)); return; } location.href = (searchEngines[state.settings.searchEngine] || searchEngines.google) + encodeURIComponent(query); }
  async function addTask(title) { const clean = String(title || '').trim() || prompt('Task title') || 'New task'; state.tasks = [{ id: uid('task'), title: clean, status: 'open', priority: 'medium', due: new Date().toISOString(), source: 'LiveDash' }, ...(state.tasks || [])]; activity('Task added', clean); await save(); toast('Task added'); render(); }
  async function addNote(body) { const clean = String(body || '').trim() || prompt('Note') || 'New quick note'; state.notes = [{ id: uid('note'), title: clean.slice(0, 50), body: clean, tag: 'quick', createdAt: new Date().toISOString() }, ...(state.notes || [])]; activity('Note added', clean.slice(0, 70)); await save(); toast('Note saved'); render(); }
  async function completeTask(id) { state.tasks = state.tasks.map((t) => t.id === id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t); await save(); render(); }
  async function deleteTask(id) { state.tasks = state.tasks.filter((t) => t.id !== id); await save(); render(); }
  async function saveBookmark() { const name = $('#bookmarkName')?.value.trim() || 'New site'; let url = $('#bookmarkUrl')?.value.trim() || ''; if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`; state.bookmarkSlots = state.bookmarkSlots.map((b) => b.id === bookmarkEditingId ? { ...b, label: name, url } : b); bookmarkEditingId = null; await save(); render(); }
  async function petAction(mode) { const pet = state.pet || {}; pet.mode = mode; pet.lastInteractionAt = new Date().toISOString(); if (mode === 'feed') { pet.energy = Math.min(100, Number(pet.energy || 70) + 8); pet.mood = 'Fed'; pet.score = Number(pet.score || 0) + 1; } if (mode === 'play') { pet.energy = Math.max(0, Number(pet.energy || 70) - 4); pet.mood = 'Playing'; pet.score = Number(pet.score || 0) + 2; } if (mode === 'rest') { pet.energy = Math.min(100, Number(pet.energy || 70) + 5); pet.mood = 'Resting'; } state.pet = pet; await save(); render(); setTimeout(async () => { if (state?.pet?.mode === mode) { state.pet.mode = 'idle'; await window.LiveDashStore.setState(state); render(); } }, 2200); }
  async function signOut() { state.profile = { ...(state.profile || {}), signedIn: false, authToken: '', backendConnected: false, cloudLoaded: false, plan: 'Local' }; await save(); accountOpen = false; toast('Signed out'); render(); }
  async function refreshCloud() { const ok = await hydrateCloud('manual'); toast(ok ? 'Cloud profile refreshed' : 'Cloud profile unavailable'); render(); }
  async function exportBackup() { const backup = await window.LiveDashStore.exportState(); window.LiveDashStore.downloadJson(`livedash-backup-${new Date().toISOString().slice(0,10)}.json`, backup); toast('Backup exported'); }
  async function importBackup(file) { try { state = await window.LiveDashStore.importState(await window.LiveDashStore.readJsonFile(file)); toast('Backup imported'); render(); } catch (e) { toast(e.message || 'Import failed'); } }
  async function resetDashboard() { if (!confirm('Reset LiveDash dashboard?')) return; state = await window.LiveDashStore.resetState(); render(); }
  async function handleAction(action, button) {
    const route = button?.dataset?.route;
    if (route) { state.settings.route = route; commandOpen = false; await save(); render(); return; }
    const actions = {
      category: async () => { state.settings.appCategory = button.dataset.category; state.settings.route = 'apps'; await save(); render(); },
      account: () => { accountOpen = true; render(); },
      settings: () => { settingsOpen = true; render(); },
      command: () => { commandOpen = true; render(); },
      'close-modal': () => { accountOpen = false; bookmarkEditingId = null; render(); },
      'close-settings': () => { settingsOpen = false; render(); },
      'close-command': () => { commandOpen = false; render(); },
      'open-url': () => { if (button.dataset.url) location.href = button.dataset.url; },
      'open-bookmark': () => { const slot = state.bookmarkSlots.find((s) => s.id === button.dataset.id); if (slot?.url) location.href = slot.url; },
      'edit-bookmark': () => { bookmarkEditingId = button.dataset.id; render(); },
      'save-bookmark': saveBookmark,
      'add-task': () => addTask(),
      'add-task-input': () => addTask($('#taskInput')?.value),
      'add-note': () => addNote(),
      'complete-task': () => completeTask(button.dataset.id),
      'delete-task': () => deleteTask(button.dataset.id),
      'task-filter': () => { activeTaskFilter = button.dataset.filter || 'open'; render(); },
      'pet-feed': () => petAction('feed'),
      'pet-play': () => petAction('play'),
      'pet-rest': () => petAction('rest'),
      'google-sign-in': googleSignIn,
      'email-sign-in': async () => { state.profile.email = $('#authEmail')?.value.trim() || state.profile.email || ''; state.profile.signedIn = true; state.profile.backendConnected = false; accountOpen = false; await save(); render(); },
      'sign-out': signOut,
      'refresh-cloud': refreshCloud,
      'toggle-dock': async () => { state.settings.showDock = state.settings.showDock === false; await save(); render(); },
      theme: async () => { state.settings.theme = button.dataset.theme; await save(); render(); },
      'pomo-toggle': async () => { state.focus.running = !state.focus.running; await save(); startTimer(); render(); },
      'pomo-reset': async () => { state.focus.running = false; state.focus.remaining = (state.settings.focusMinutes || 25) * 60; await save(); render(); },
      'pomo-mode': async () => { state.focus.mode = state.focus.mode === 'work' ? 'break' : 'work'; state.focus.remaining = state.focus.mode === 'work' ? (state.settings.focusMinutes || 25) * 60 : 5 * 60; await save(); render(); },
      refresh: async () => { toast('Updated'); },
      export: exportBackup,
      reset: resetDashboard
    };
    if (actions[action]) await actions[action]();
  }
  function startTimer() { if (timerId) clearInterval(timerId); timerId = setInterval(async () => { if (!state?.focus?.running) return; state.focus.remaining = Math.max(0, (state.focus.remaining || 0) - 1); if (state.focus.remaining === 0) { state.focus.running = false; notice('Focus session complete', 'Take a break.', 'success'); await save(); render(); } const time = $('.pomo-ring strong'); if (time) { const r = state.focus.remaining || 0; time.textContent = `${Math.floor(r/60).toString().padStart(2,'0')}:${(r%60).toString().padStart(2,'0')}`; } if ((state.focus.remaining || 0) % 15 === 0) await window.LiveDashStore.setState(state); }, 1000); }
  root.addEventListener('error', (event) => {
    const img = event.target;
    if (img && img.tagName === 'IMG' && img.closest('.app-favicon')) {
      const wrapper = img.closest('.app-favicon');
      wrapper.innerHTML = fallbackIcon(img.dataset.fallback || wrapper.dataset.label || 'App');
    }
  }, true);

  root.addEventListener('click', async (event) => { const button = event.target.closest('button, [data-action], [data-route]'); if (!button) return; await handleAction(button.dataset.action, button); });
  document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); commandOpen = true; render(); } if (event.key === 'Escape') { accountOpen = false; bookmarkEditingId = null; commandOpen = false; settingsOpen = false; render(); } });
  async function boot() { state = await window.LiveDashStore.getState(); state.settings.route = state.settings.route || 'home'; if (state.profile?.authToken && !state.profile.cloudLoaded) await hydrateCloud('boot'); render(); startTimer(); }
  boot().catch((e) => { root.innerHTML = `<section class="account-modal"><h2>LiveDash could not start</h2><p>${escapeHtml(e.message)}</p></section>`; });
})();
