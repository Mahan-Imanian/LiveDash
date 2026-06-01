(function () {
  const root = document.getElementById('app');
  let state = null;
  let timerId = null;
  let commandOpen = false;
  let drawerOpen = false;
  let loginOpen = false;
  let bookmarkEditingId = null;

  const $ = (selector, node = document) => node.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const now = () => new Date();

  const searchEngines = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q='
  };

  function formatTime(date = now()) {
    return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: state?.profile?.timeFormat !== '24h'
    }).format(date);
  }

  function formatShortDate(date = now()) {
    return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function getTimeParts() {
    const clean = formatTime().replace(/\s?(AM|PM)$/i, '');
    const [hour = '00', minute = '00'] = clean.split(':');
    return { hour, minute };
  }

  function setBodyTheme() {
    document.body.classList.remove('theme-mist', 'theme-pearl', 'theme-sunset', 'theme-forest');
    const theme = state?.settings?.theme || 'sky';
    if (theme !== 'sky') document.body.classList.add(`theme-${theme}`);
  }

  async function save(next = state) {
    state = await window.LiveDashStore.setState(next);
    setBodyTheme();
  }

  function pushActivity(title, body) {
    state.activity = [{ id: uid('activity'), title, body, createdAt: new Date().toISOString() }, ...(state.activity || [])].slice(0, 30);
  }

  function pushNotification(title, body, type = 'info') {
    state.notifications = [{ id: uid('notice'), title, body, type, read: false, createdAt: new Date().toISOString() }, ...(state.notifications || [])].slice(0, 20);
  }

  function showToast(message) {
    let wrap = $('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function categoryById(id) {
    return state.categories.find((category) => category.id === id) || state.categories[0];
  }

  function appColor(name) {
    const colors = ['#5f74ff', '#23bfd3', '#2fc477', '#f2a724', '#f45d72', '#8b65ff', '#1f2937'];
    const total = String(name).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[total % colors.length];
  }

  function appUrl(app) {
    return escapeHtml(app.url || '#');
  }

  function renderTopTabs() {
    return `<nav class="top-tabs" aria-label="App categories">
      ${state.categories.map((category) => `<button class="top-tab ${state.settings.appCategory === category.id ? 'active' : ''}" data-action="category" data-category="${escapeHtml(category.id)}" type="button">
        <span class="tab-icon">${escapeHtml(category.icon)}</span><span>${escapeHtml(category.label)}</span>
      </button>`).join('')}
    </nav>`;
  }

  function renderClockCard() {
    const parts = getTimeParts();
    const weekday = new Intl.DateTimeFormat(state.profile.locale || 'en-US', { weekday: 'long' }).format(now());
    const month = new Intl.DateTimeFormat(state.profile.locale || 'en-US', { month: 'long', year: 'numeric' }).format(now());
    const day = new Intl.DateTimeFormat(state.profile.locale || 'en-US', { day: '2-digit' }).format(now());
    return `<section class="widget-card clock-card premium-card" aria-label="Clock and status">
      <div class="clock-layout">
        <div class="time-tile" aria-label="Current time"><span>${escapeHtml(parts.hour)}</span><span>${escapeHtml(parts.minute)}</span></div>
        <div class="date-stack">
          <div class="weekday">${escapeHtml(weekday)}</div>
          <div class="day">${escapeHtml(day)}</div>
          <div class="meta">${escapeHtml(month)}</div>
          <div class="meta">${escapeHtml(formatShortDate())}</div>
        </div>
      </div>
      <button class="status-row" data-action="open-url" data-url="https://weather.com" type="button"><span>☁️ ${escapeHtml(state.weather.city)} · ${escapeHtml(state.weather.summary)}</span><strong>${escapeHtml(String(state.weather.tempC))}°C</strong></button>
      <button class="status-row" data-action="open-url" data-url="https://web.telegram.org" type="button"><span>✈ Telegram Web</span><strong>Open</strong></button>
      <div class="status-row muted"><span>Local dashboard</span><strong>Saved just now</strong></div>
    </section>`;
  }

  function renderCurrencyCard() {
    const flags = { USD: 'US', EUR: 'EU', GBP: 'GB' };
    return `<section class="widget-card rates-card premium-card" aria-label="Currency rates">
      <div class="card-title-row"><div><div class="card-title">Rates</div><div class="card-subtitle">Base ${escapeHtml(state.settings.currencyBase || 'USD')}</div></div><button class="mini-button" data-action="refresh" type="button" aria-label="Refresh rates">↻</button></div>
      <div class="currency-list">
        ${state.currency.map((item) => `<div class="currency-row">
          <span class="currency-flag">${escapeHtml(flags[item.code] || item.code.slice(0, 2))}</span>
          <span class="currency-name">${escapeHtml(item.code)}</span>
          <strong class="currency-value">${escapeHtml(item.value)}</strong>
          <span class="currency-arrow ${escapeHtml(item.delta)}">${item.delta === 'flat' ? '→' : '↑'}</span>
        </div>`).join('')}
      </div>
    </section>`;
  }

  function renderSearchHero() {
    const engine = state.settings.searchEngine || 'google';
    return `<section class="search-hero premium-card" aria-label="Search and quick commands">
      <div class="search-line">
        <div class="search-input-wrap">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input id="mainSearch" type="search" placeholder="Search, open an app, or type a LiveDash command" autocomplete="off" aria-label="Search or command">
        </div>
        <select class="search-engine" id="searchEngine" aria-label="Search engine">
          <option value="google" ${engine === 'google' ? 'selected' : ''}>Google</option>
          <option value="bing" ${engine === 'bing' ? 'selected' : ''}>Bing</option>
          <option value="duckduckgo" ${engine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
        </select>
        <button class="command-button" data-action="open-command" type="button" aria-label="Open command palette">⌘K</button>
      </div>
      <div class="search-chips" aria-label="Quick actions">
        <button class="search-chip" data-action="open-url" data-url="https://chat.openai.com" type="button">✦ ChatGPT</button>
        <button class="search-chip" data-action="open-url" data-url="https://calendar.google.com" type="button">Calendar</button>
        <button class="search-chip" data-action="open-url" data-url="https://mail.google.com" type="button">Gmail</button>
        <button class="search-chip" data-action="open-url" data-url="https://drive.google.com" type="button">Drive</button>
        <button class="search-chip" data-action="add-note" type="button">Quick note</button>
        <button class="search-chip" data-action="add-task" type="button">Quick task</button>
      </div>
    </section>`;
  }

  function renderBookmarkSlots() {
    return `<section class="bookmark-grid" aria-label="Bookmark slots">
      ${state.bookmarkSlots.map((slot, index) => {
        const filled = Boolean(slot.url);
        const color = slot.color || appColor(slot.label || index);
        return `<button class="bookmark-slot ${filled ? 'filled' : ''}" style="--slot-color:${escapeHtml(color)}" data-action="${filled ? 'open-bookmark' : 'edit-bookmark'}" data-id="${escapeHtml(slot.id)}" type="button" aria-label="${filled ? `Open ${slot.label}` : 'Add bookmark'}">
          <span class="bookmark-icon">${escapeHtml(filled ? slot.icon : '+')}</span>
          <span class="bookmark-label">${escapeHtml(filled ? slot.label : 'Add site')}</span>
        </button>`;
      }).join('')}
    </section>`;
  }

  function renderPetCard() {
    const openTasks = (state.tasks || []).filter((task) => task.status !== 'done').length;
    return `<section class="widget-card pet-card premium-card" aria-label="Daily quick win">
      <div class="pet-banner">
        <div class="pet-avatar">🐶</div>
        <div><div class="pet-title">Need a quick win?</div><div class="pet-subtitle">${openTasks} open tasks · capture one link or start focus.</div></div>
      </div>
      <div class="pixel-pet" aria-hidden="true">🦊</div>
      <div class="pet-hearts" aria-label="Focus energy">♥♥♥♥♥</div>
      <button class="primary-button" data-action="add-task" type="button">Add today’s task</button>
    </section>`;
  }

  function renderPomodoro() {
    const total = (state.settings.focusMinutes || 25) * 60;
    const remaining = state.focus.remaining || total;
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    const deg = Math.max(0, Math.min(360, 360 - (remaining / total) * 360));
    return `<section class="widget-card compact pomodoro-card premium-card" aria-label="Focus timer">
      <div class="card-title-row"><div><div class="card-title">Focus</div><div class="card-subtitle">${state.focus.mode === 'break' ? 'Break' : 'Work'} session</div></div><span class="mode-pill">${state.focus.running ? 'Live' : 'Ready'}</span></div>
      <div class="pomo-ring" style="--pomo-deg:${deg}deg"><div><div class="pomo-time">${minutes}:${seconds}</div><div class="pomo-label">${state.focus.running ? 'In progress' : 'Ready'}</div></div></div>
      <div class="pomo-controls">
        <button class="mini-button" data-action="pomo-reset" type="button" aria-label="Reset focus timer">↺</button>
        <button class="play-button" data-action="pomo-toggle" type="button" aria-label="Start or pause focus timer">${state.focus.running ? 'Ⅱ' : '▶'}</button>
        <button class="mini-button" data-action="pomo-mode" type="button" aria-label="Switch focus mode">⇄</button>
      </div>
    </section>`;
  }

  function renderTasks() {
    const openTasks = (state.tasks || []).filter((task) => task.status !== 'done').slice(0, 4);
    return `<section class="widget-card compact task-card premium-card" aria-label="Tasks">
      <div class="card-title-row"><div><div class="card-title">Tasks</div><div class="card-subtitle">Today’s list</div></div><button class="mini-button" data-action="clear-done" type="button" aria-label="Clear completed tasks">⌫</button></div>
      <div class="task-list">
        ${openTasks.length ? openTasks.map((task) => `<div class="task-row ${task.status === 'done' ? 'done' : ''}">
          <button class="task-check" data-action="complete-task" data-id="${escapeHtml(task.id)}" type="button" aria-label="Complete ${escapeHtml(task.title)}">${task.status === 'done' ? '✓' : ''}</button>
          <div class="task-copy"><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta"><span class="priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span> · ${escapeHtml(task.source || 'Local')}</div></div>
          <button class="mini-button row-action" data-action="delete-task" data-id="${escapeHtml(task.id)}" type="button" aria-label="Delete task">×</button>
        </div>`).join('') : `<div class="empty-state"><div class="empty-icon">✓</div><div>No tasks waiting.<br>Add one from the command bar.</div></div>`}
      </div>
      <div class="task-input-row"><button class="primary-button" data-action="add-task-input" type="button" aria-label="Add task">＋</button><input id="taskInput" placeholder="New task title..." aria-label="New task title"></div>
    </section>`;
  }

  function renderCalendar() {
    const today = now();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOffset = start.getDay();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const prevDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const dayNumber = i - startOffset + 1;
      const muted = dayNumber < 1 || dayNumber > daysInMonth;
      const shown = dayNumber < 1 ? prevDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber;
      const isToday = !muted && shown === today.getDate();
      const event = !muted && [5, 11, 18, 24].includes(shown);
      cells.push(`<div class="calendar-day ${muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${event ? 'event' : ''}">${shown}</div>`);
    }
    return `<section class="widget-card compact calendar-card premium-card" aria-label="Calendar">
      <div class="calendar-header"><button class="mini-button" type="button" aria-label="Previous month">‹</button><div class="calendar-month">${escapeHtml(new Intl.DateTimeFormat(state.profile.locale || 'en-US', { month: 'long', year: 'numeric' }).format(today))}</div><button class="mini-button" type="button" aria-label="Next month">›</button></div>
      <div class="calendar-grid">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => `<div class="calendar-day-name">${d}</div>`).join('')}
        ${cells.join('')}
      </div>
      <div class="calendar-actions"><button class="secondary-button" data-action="open-url" data-url="https://calendar.google.com" type="button">Google Calendar</button><button class="secondary-button" data-action="add-task" type="button">Add reminder</button></div>
    </section>`;
  }

  function renderHomePage() {
    return `<main class="dashboard-grid" aria-label="Personal dashboard">
      <div class="left-stack">
        ${renderClockCard()}
        ${renderCurrencyCard()}
      </div>
      <div class="center-stack">
        ${renderSearchHero()}
        ${renderBookmarkSlots()}
        <div class="lower-widget-grid">
          ${renderPomodoro()}
          ${renderTasks()}
        </div>
      </div>
      <div class="right-stack">
        ${renderPetCard()}
        ${renderCalendar()}
      </div>
    </main>`;
  }

  function renderAppTile(app) {
    const color = app.color || appColor(app.name);
    return `<a class="app-tile" style="--app-color:${escapeHtml(color)}" href="${appUrl(app)}" target="_self" rel="noreferrer">
      <span class="app-icon">${escapeHtml(app.icon || app.name[0])}</span>
      <span class="app-label">${escapeHtml(app.name)}</span>
      <span class="app-note">${escapeHtml(app.note || '')}</span>
    </a>`;
  }

  function renderAppPanel(category, options = {}) {
    const apps = category.apps.slice(0, options.limit || category.apps.length);
    return `<section class="app-panel premium-card ${options.featured ? 'featured-panel' : ''}">
      <div class="app-panel-header"><div class="app-panel-title"><span>${escapeHtml(category.icon)}</span>${escapeHtml(category.label)}</div><span class="badge">${escapeHtml(options.badge || (options.featured ? 'Featured' : category.accent || 'Apps'))}</span></div>
      <div class="app-grid ${options.compact ? 'compact-app-grid' : ''}">${apps.map(renderAppTile).join('')}</div>
    </section>`;
  }

  function renderAppsPage() {
    const selected = categoryById(state.settings.appCategory);
    const tools = categoryById('tools');
    const publicServices = categoryById('public');
    const google = categoryById('google');
    const ai = categoryById('ai');
    return `<main class="apps-grid-page" aria-label="Application hub">
      ${renderAppPanel(selected, { featured: true, badge: 'Featured', limit: 18 })}
      <div class="panel-grid">
        ${renderAppPanel(tools, { compact: true, badge: 'Utilities', limit: 9 })}
        ${renderAppPanel(publicServices, { compact: true, badge: 'US / Europe', limit: 8 })}
      </div>
      <div class="two-col-panels">
        ${renderAppPanel(ai, { compact: true, badge: 'Assistants', limit: 8 })}
        ${renderAppPanel(google, { compact: true, badge: 'Workflows', limit: 10 })}
      </div>
    </main>`;
  }

  function formatCityTime(offset) {
    const utc = new Date(now().getTime() + now().getTimezoneOffset() * 60000);
    const date = new Date(utc.getTime() + offset * 3600000);
    return new Intl.DateTimeFormat(state.profile.locale || 'en-US', { hour: '2-digit', minute: '2-digit', hour12: state.profile.timeFormat !== '24h' }).format(date);
  }

  function renderExplorePage() {
    return `<main class="apps-grid-page explore-grid" aria-label="Notes, clocks, and notifications">
      <div class="two-col-panels">
        <section class="app-panel premium-card">
          <div class="app-panel-header"><div class="app-panel-title">🌍 World clocks</div><span class="badge">Global teams</span></div>
          <div class="currency-list">${state.worldClocks.map((clock) => `<div class="currency-row"><span class="currency-flag">🌐</span><span class="currency-name">${escapeHtml(clock.city)}</span><strong class="currency-value">${escapeHtml(formatCityTime(clock.offset))}</strong><span></span></div>`).join('')}</div>
        </section>
        <section class="app-panel premium-card">
          <div class="app-panel-header"><div class="app-panel-title">📝 Notes</div><button class="secondary-button" data-action="add-note" type="button">Add note</button></div>
          <div class="task-list">${state.notes.slice(0, 6).map((note) => `<div class="task-row"><div class="task-check">#</div><div class="task-copy"><div class="task-title">${escapeHtml(note.title)}</div><div class="task-meta">${escapeHtml(note.tag)} · ${escapeHtml(new Date(note.createdAt).toLocaleDateString())}</div></div><button class="mini-button row-action" data-action="delete-note" data-id="${escapeHtml(note.id)}" type="button">×</button></div>`).join('')}</div>
        </section>
      </div>
      <section class="app-panel premium-card">
        <div class="app-panel-header"><div class="app-panel-title">🔔 Notifications</div><button class="secondary-button" data-action="mark-read" type="button">Mark read</button></div>
        <div class="timeline-list">${state.notifications.slice(0, 8).map((notice) => `<div class="timeline-row ${notice.read ? 'read' : 'unread'}"><span class="timeline-dot"></span><div><div class="task-title">${escapeHtml(notice.title)}</div><div class="task-meta">${escapeHtml(notice.body)} · ${escapeHtml(new Date(notice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</div></div><button class="mini-button row-action" data-action="dismiss-notice" data-id="${escapeHtml(notice.id)}" type="button">×</button></div>`).join('')}</div>
      </section>
    </main>`;
  }

  function renderDock() {
    if (!state.settings.showDock) return '';
    const route = state.settings.route;
    return `<nav class="bottom-dock" aria-label="LiveDash navigation">
      <div class="dock-side">
        <button class="dock-button" data-action="login" type="button" aria-label="Account">☻</button>
        <button class="dock-button" data-action="open-apps-category" data-category="daily" type="button" aria-label="Daily essentials">□</button>
        <button class="dock-button" data-action="settings" type="button" aria-label="Settings">⚙</button>
        <button class="dock-button" data-action="toggle-dock" type="button" aria-label="Hide dock">◌</button>
      </div>
      <div class="dock-center">
        <button class="dock-button ${route === 'apps' ? 'active' : ''}" data-route="apps" type="button" aria-label="App grid">▦</button>
        <button class="dock-button ${route === 'explore' ? 'active' : ''}" data-route="explore" type="button" aria-label="Explore">◎</button>
        <button class="dock-button ${route === 'home' ? 'active' : ''}" data-route="home" type="button" aria-label="Widgets home">⌂</button>
      </div>
      <div class="brand-side"><span class="brand-text">LiveDash</span><span class="brand-mark">L</span></div>
    </nav>`;
  }

  function renderModal() {
    return `<div class="modal-backdrop ${loginOpen || bookmarkEditingId ? 'open' : ''}" data-action="close-modal"></div>
      ${loginOpen ? `<section class="modal-card" role="dialog" aria-modal="true" aria-label="Sign in">
        <div class="modal-head"><button class="icon-button" data-action="close-modal" type="button" aria-label="Close">×</button><div class="modal-title">Sign in to LiveDash</div></div>
        <div class="auth-card">
          <div class="auth-title">Sign in or create account</div>
          <div class="auth-sub">Save favorites and dashboard preferences locally first.</div>
          <label><strong>Email address</strong><input id="authEmail" class="form-input" type="email" placeholder="you@example.com" aria-label="Email address"></label>
          <button class="primary-button" data-action="sign-in" type="button">Continue</button>
        </div>
        <div class="divider">or</div>
        <div class="auth-actions"><button class="secondary-button" data-action="google-sign-in" type="button">G Continue with Google</button><button class="secondary-button" data-action="password-sign-in" type="button">Use password</button></div>
      </section>` : ''}
      ${bookmarkEditingId ? renderBookmarkModal() : ''}`;
  }

  function renderBookmarkModal() {
    const slot = state.bookmarkSlots.find((item) => item.id === bookmarkEditingId) || state.bookmarkSlots[0];
    return `<section class="modal-card" role="dialog" aria-modal="true" aria-label="Edit bookmark">
      <div class="modal-head"><button class="icon-button" data-action="close-modal" type="button" aria-label="Close">×</button><div class="modal-title">Bookmark slot</div></div>
      <div class="auth-card">
        <label><strong>Name</strong><input id="bookmarkName" class="form-input" value="${escapeHtml(slot.label === 'Add site' ? '' : slot.label)}" placeholder="Example: Gmail" aria-label="Bookmark name"></label>
        <label><strong>URL</strong><input id="bookmarkUrl" class="form-input" value="${escapeHtml(slot.url || '')}" placeholder="https://example.com" aria-label="Bookmark URL"></label>
        <label><strong>Icon</strong><input id="bookmarkIcon" class="form-input" value="${escapeHtml(slot.icon === '+' ? '' : slot.icon)}" placeholder="G" aria-label="Bookmark icon"></label>
        <button class="primary-button" data-action="save-bookmark" type="button">Save slot</button>
      </div>
    </section>`;
  }

  function renderDrawer() {
    return `<div class="drawer-backdrop ${drawerOpen ? 'open' : ''}" data-action="close-drawer"></div>
      <aside class="drawer ${drawerOpen ? 'open' : ''}" aria-label="Settings drawer">
        <div class="modal-head"><div class="modal-title">Customize LiveDash</div><button class="icon-button" data-action="close-drawer" type="button" aria-label="Close settings">×</button></div>
        <section class="drawer-section"><div class="card-title">Background</div><div class="setting-grid">
          ${['sky','mist','pearl','sunset','forest'].map((theme) => `<button class="setting-tile ${state.settings.theme === theme ? 'active' : ''}" data-action="theme" data-theme="${theme}" type="button">${escapeHtml(theme[0].toUpperCase() + theme.slice(1))}<br><span class="card-subtitle">${theme === 'sky' ? 'Soft blue workspace' : 'Dashboard theme'}</span></button>`).join('')}
        </div></section>
        <section class="drawer-section"><div class="card-title">Search</div><div class="setting-grid">
          ${Object.keys(searchEngines).map((engine) => `<button class="setting-tile ${state.settings.searchEngine === engine ? 'active' : ''}" data-action="engine" data-engine="${engine}" type="button">${escapeHtml(engine)}<br><span class="card-subtitle">Default engine</span></button>`).join('')}
        </div></section>
        <section class="drawer-section"><div class="card-title">Data</div><button class="secondary-button" data-action="export" type="button">Export backup</button><label class="secondary-button" style="cursor:pointer"><input id="importFile" type="file" accept="application/json" style="display:none">Import backup</label><button class="secondary-button" data-action="reset" type="button">Reset dashboard</button></section>
        <section class="drawer-section"><div class="card-title">Keyboard</div><div class="task-row"><div class="task-check">⌘</div><div><div class="task-title">Open command palette</div><div class="task-meta">Cmd/Ctrl + K</div></div><span></span></div></section>
      </aside>`;
  }

  function renderCommandPalette() {
    const commands = [
      ['home', 'Open widgets home', 'Dashboard widgets and cards', '⌂'],
      ['apps', 'Open app library', 'Daily, tools, public services, Google, AI', '▦'],
      ['explore', 'Open explore', 'Notes, clocks, notifications', '◎'],
      ['add-task', 'Add task', 'Create a quick task', '✓'],
      ['add-note', 'Add note', 'Create a quick note', '✎'],
      ['settings', 'Customize dashboard', 'Themes, search, backup', '⚙'],
      ['export', 'Export backup', 'Download local dashboard data', '↓'],
      ['login', 'Sign in', 'Local-first profile flow', '☻']
    ];
    return `<div class="command-backdrop ${commandOpen ? 'open' : ''}" data-action="close-command"></div>
      <section class="command-card ${commandOpen ? 'open' : ''}" role="dialog" aria-label="Command palette">
        <input id="commandInput" placeholder="Type a command, app, or website..." aria-label="Command search">
        <div class="command-list" id="commandList">
          ${commands.map(([action, title, sub, icon]) => `<button class="command-row" data-action="${escapeHtml(action)}" type="button"><span class="command-glyph">${escapeHtml(icon)}</span><span><span class="command-row-title">${escapeHtml(title)}</span><span class="command-row-sub">${escapeHtml(sub)}</span></span><span class="kbd">Enter</span></button>`).join('')}
        </div>
      </section>`;
  }

  function render() {
    setBodyTheme();
    const route = state.settings.route || 'home';
    root.innerHTML = `<div class="widgetify-shell route-${escapeHtml(route)}">
      ${renderTopTabs()}
      <div class="page-grid">
        ${route === 'home' ? renderHomePage() : route === 'apps' ? renderAppsPage() : renderExplorePage()}
      </div>
    </div>
    ${renderDock()}
    ${renderModal()}
    ${renderDrawer()}
    ${renderCommandPalette()}`;
    bindTransientInputs();
  }

  function bindTransientInputs() {
    const search = $('#mainSearch');
    if (search) {
      search.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') runSearch(search.value);
      });
    }
    const engine = $('#searchEngine');
    if (engine) {
      engine.addEventListener('change', async () => {
        state.settings.searchEngine = engine.value;
        await save();
      });
    }
    const taskInput = $('#taskInput');
    if (taskInput) {
      taskInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') await addTask(taskInput.value);
      });
    }
    const commandInput = $('#commandInput');
    if (commandInput) {
      setTimeout(() => commandInput.focus(), 0);
      commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') runSearch(commandInput.value);
      });
    }
    const importFile = $('#importFile');
    if (importFile) {
      importFile.addEventListener('change', async () => {
        if (importFile.files && importFile.files[0]) await importBackup(importFile.files[0]);
      });
    }
  }

  function runSearch(value) {
    const query = String(value || '').trim();
    if (!query) {
      commandOpen = true;
      render();
      return;
    }
    const lower = query.toLowerCase();
    const matchingApp = state.categories.flatMap((category) => category.apps).find((app) => app.name.toLowerCase() === lower);
    if (matchingApp) {
      window.location.href = matchingApp.url;
      return;
    }
    if (lower.startsWith('task ')) {
      addTask(query.slice(5));
      return;
    }
    if (lower.startsWith('note ')) {
      addNote(query.slice(5));
      return;
    }
    const engine = searchEngines[state.settings.searchEngine] || searchEngines.google;
    window.location.href = engine + encodeURIComponent(query);
  }

  async function addTask(title) {
    const clean = String(title || '').trim() || 'New task';
    state.tasks = [{ id: uid('task'), title: clean, status: 'open', priority: 'medium', due: new Date().toISOString(), source: 'LiveDash' }, ...(state.tasks || [])];
    pushActivity('Task added', clean);
    pushNotification('Task added', clean, 'success');
    await save();
    showToast('Task added');
    render();
  }

  async function addNote(body) {
    const clean = String(body || '').trim() || 'New quick note';
    state.notes = [{ id: uid('note'), title: clean.slice(0, 50), body: clean, tag: 'quick', createdAt: new Date().toISOString() }, ...(state.notes || [])];
    pushActivity('Note added', clean.slice(0, 70));
    await save();
    showToast('Note saved');
    render();
  }

  async function completeTask(id) {
    state.tasks = state.tasks.map((task) => task.id === id ? { ...task, status: 'done' } : task);
    pushActivity('Task completed', state.tasks.find((task) => task.id === id)?.title || 'Task');
    await save();
    showToast('Task completed');
    render();
  }

  async function deleteTask(id) {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    pushActivity('Task removed', 'Removed from local task list.');
    await save();
    render();
  }

  async function saveBookmark() {
    const name = $('#bookmarkName')?.value.trim() || 'New site';
    let url = $('#bookmarkUrl')?.value.trim() || '';
    const icon = $('#bookmarkIcon')?.value.trim() || name[0].toUpperCase();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    state.bookmarkSlots = state.bookmarkSlots.map((slot) => slot.id === bookmarkEditingId ? { ...slot, label: name, url, icon, color: appColor(name) } : slot);
    bookmarkEditingId = null;
    pushActivity('Bookmark updated', name);
    await save();
    render();
  }

  async function exportBackup() {
    const backup = await window.LiveDashStore.exportState();
    window.LiveDashStore.downloadJson(`livedash-backup-${new Date().toISOString().slice(0,10)}.json`, backup);
    pushActivity('Backup exported', 'Downloaded a local LiveDash backup.');
    await save();
    showToast('Backup exported');
  }

  async function importBackup(file) {
    try {
      const payload = await window.LiveDashStore.readJsonFile(file);
      state = await window.LiveDashStore.importState(payload);
      pushActivity('Backup imported', 'Dashboard data was restored from file.');
      showToast('Backup imported');
      render();
    } catch (error) {
      showToast(error.message || 'Import failed');
    }
  }

  async function resetDashboard() {
    if (!confirm('Reset LiveDash to the default dashboard? A backup is recommended before reset.')) return;
    state = await window.LiveDashStore.resetState();
    showToast('Dashboard reset');
    render();
  }

  function openUrl(url) {
    if (url) window.location.href = url;
  }

  function closeOverlays() {
    commandOpen = false;
    drawerOpen = false;
    loginOpen = false;
    bookmarkEditingId = null;
  }

  async function handleAction(action, button) {
    if (!action) return;
    if (['home', 'apps', 'explore'].includes(action)) {
      state.settings.route = action;
      commandOpen = false;
      await save();
      render();
      return;
    }
    const actions = {
      category: async () => { state.settings.appCategory = button.dataset.category; state.settings.route = 'apps'; await save(); render(); },
      'open-apps-category': async () => { state.settings.appCategory = button.dataset.category; state.settings.route = 'apps'; await save(); render(); },
      'open-url': () => openUrl(button.dataset.url),
      'open-bookmark': () => { const slot = state.bookmarkSlots.find((item) => item.id === button.dataset.id); if (slot?.url) openUrl(slot.url); },
      'edit-bookmark': () => { bookmarkEditingId = button.dataset.id; render(); },
      'save-bookmark': saveBookmark,
      login: () => { loginOpen = true; render(); },
      'sign-in': async () => { state.profile.email = $('#authEmail')?.value.trim() || ''; state.profile.signedIn = true; loginOpen = false; pushActivity('Profile updated', state.profile.email || 'Signed in locally.'); await save(); showToast('Profile saved locally'); render(); },
      'google-sign-in': async () => { state.profile.signedIn = true; state.profile.email = 'google-account@example.com'; loginOpen = false; await save(); showToast('Google sign-in saved locally'); render(); },
      'password-sign-in': async () => { state.profile.signedIn = true; loginOpen = false; await save(); showToast('Password sign-in saved locally'); render(); },
      'close-modal': () => { loginOpen = false; bookmarkEditingId = null; render(); },
      settings: () => { drawerOpen = true; commandOpen = false; render(); },
      'close-drawer': () => { drawerOpen = false; render(); },
      'open-command': () => { commandOpen = true; render(); },
      'close-command': () => { commandOpen = false; render(); },
      'toggle-dock': async () => { state.settings.showDock = !state.settings.showDock; await save(); render(); },
      theme: async () => { state.settings.theme = button.dataset.theme; await save(); showToast('Theme updated'); render(); },
      engine: async () => { state.settings.searchEngine = button.dataset.engine; await save(); showToast('Search engine updated'); render(); },
      'add-task': async () => { await addTask(prompt('Task title') || 'New task'); },
      'add-task-input': async () => { await addTask($('#taskInput')?.value || 'New task'); },
      'add-note': async () => { await addNote(prompt('Note') || 'New note'); },
      'complete-task': async () => { await completeTask(button.dataset.id); },
      'delete-task': async () => { await deleteTask(button.dataset.id); },
      'delete-note': async () => { state.notes = state.notes.filter((note) => note.id !== button.dataset.id); await save(); render(); },
      'clear-done': async () => { state.tasks = state.tasks.filter((task) => task.status !== 'done'); await save(); render(); },
      'mark-read': async () => { state.notifications = state.notifications.map((notice) => ({ ...notice, read: true })); await save(); render(); },
      'dismiss-notice': async () => { state.notifications = state.notifications.filter((notice) => notice.id !== button.dataset.id); await save(); render(); },
      'pomo-toggle': async () => { state.focus.running = !state.focus.running; state.focus.lastStartedAt = state.focus.running ? new Date().toISOString() : state.focus.lastStartedAt; await save(); startTimer(); render(); },
      'pomo-reset': async () => { state.focus.running = false; state.focus.remaining = (state.settings.focusMinutes || 25) * 60; await save(); render(); },
      'pomo-mode': async () => { state.focus.mode = state.focus.mode === 'work' ? 'break' : 'work'; state.focus.remaining = state.focus.mode === 'work' ? (state.settings.focusMinutes || 25) * 60 : 5 * 60; await save(); render(); },
      refresh: async () => { pushActivity('Widgets refreshed', 'Rates and local widgets updated.'); await save(); showToast('Widgets refreshed'); },
      export: exportBackup,
      reset: resetDashboard
    };
    if (actions[action]) await actions[action]();
  }

  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(async () => {
      if (!state?.focus?.running) return;
      state.focus.remaining = Math.max(0, (state.focus.remaining || 0) - 1);
      if (state.focus.remaining === 0) {
        state.focus.running = false;
        pushNotification('Focus session complete', 'Take a short break or start another session.', 'success');
        await save();
        render();
        return;
      }
      const ring = $('.pomo-ring');
      const time = $('.pomo-time');
      if (ring && time) {
        const total = (state.focus.mode === 'work' ? (state.settings.focusMinutes || 25) : 5) * 60;
        const minutes = Math.floor(state.focus.remaining / 60).toString().padStart(2, '0');
        const seconds = (state.focus.remaining % 60).toString().padStart(2, '0');
        ring.style.setProperty('--pomo-deg', `${360 - (state.focus.remaining / total) * 360}deg`);
        time.textContent = `${minutes}:${seconds}`;
      }
      if (state.focus.remaining % 15 === 0) await save();
    }, 1000);
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button, [data-action], [data-route]');
    if (!button) return;
    const route = button.dataset.route;
    if (route) {
      state.settings.route = route;
      await save();
      render();
      return;
    }
    await handleAction(button.dataset.action, button);
  });

  document.addEventListener('keydown', (event) => {
    const isCommand = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (isCommand) {
      event.preventDefault();
      commandOpen = true;
      render();
    }
    if (event.key === 'Escape') {
      closeOverlays();
      render();
    }
  });

  async function boot() {
    state = await window.LiveDashStore.getState();
    state.settings.route = state.settings.route || 'home';
    state.settings.showDock = state.settings.showDock !== false;
    render();
    startTimer();
    setInterval(() => {
      const timeBlock = $('.time-tile');
      if (timeBlock) {
        const parts = getTimeParts();
        timeBlock.innerHTML = `<span>${escapeHtml(parts.hour)}</span><span>${escapeHtml(parts.minute)}</span>`;
      }
    }, 10000);
  }

  boot().catch((error) => {
    root.innerHTML = `<div class="modal-card"><div class="modal-title">LiveDash could not start</div><p>${escapeHtml(error.message)}</p></div>`;
  });
})();
