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

  function formatCityTime(offset) {
    const numericOffset = Number(offset);
    const targetDate = Number.isFinite(numericOffset)
      ? new Date(Date.now() + numericOffset * 60 * 60 * 1000)
      : now();
    return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: state?.profile?.timeFormat !== '24h',
      timeZone: Number.isFinite(numericOffset) ? 'UTC' : undefined
    }).format(targetDate);
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

  const ICON_ALIASES = {
    daily: 'daily',
    public: 'public',
    tools: 'tools',
    google: 'google',
    ai: 'ai',
    travel: 'travel',
    social: 'social',
    gmail: 'gmail',
    'google-calendar': 'calendar',
    calendar: 'calendar',
    'google-drive': 'drive',
    drive: 'drive',
    notion: 'notion',
    todoist: 'todoist',
    slack: 'slack',
    zoom: 'zoom',
    dropbox: 'dropbox',
    outlook: 'outlook',
    'microsoft-to-do': 'todo',
    github: 'github',
    figma: 'figma',
    canva: 'canva',
    spotify: 'spotify',
    youtube: 'youtube',
    wikipedia: 'wikipedia',
    trello: 'trello',
    miro: 'miro',
    loom: 'loom',
    tinypng: 'tinypng',
    cloudconvert: 'cloudconvert',
    'removebg': 'removebg',
    'remove-bg': 'removebg',
    unsplash: 'unsplash',
    'google-translate': 'translate',
    speedtest: 'speedtest',
    'archiveorg': 'archive',
    'archive-org': 'archive',
    search: 'search',
    maps: 'maps',
    docs: 'docs',
    sheets: 'sheets',
    slides: 'slides',
    meet: 'meet',
    keep: 'keep',
    news: 'news',
    photos: 'photos',
    chatgpt: 'chatgpt',
    claude: 'claude',
    perplexity: 'perplexity',
    gemini: 'gemini',
    copilot: 'copilot',
    'hugging-face': 'huggingface',
    huggingface: 'huggingface',
    runway: 'runway',
    midjourney: 'midjourney',
    'google-flights': 'flights',
    'bookingcom': 'booking',
    booking: 'booking',
    airbnb: 'airbnb',
    uber: 'uber',
    wise: 'wise',
    revolut: 'revolut',
    'yahoo-finance': 'finance',
    'xe-currency': 'currency',
    facebook: 'facebook',
    instagram: 'instagram',
    x: 'x',
    reddit: 'reddit',
    discord: 'discord',
    whatsapp: 'whatsapp',
    telegram: 'telegram',
    pinterest: 'pinterest',
    irs: 'irs',
    'usps-tracking': 'usps',
    'govuk': 'govuk',
    'eu-portal': 'eup',
    nhs: 'nhs',
    'dhl-tracking': 'dhl',
    'royal-mail': 'royalmail',
    ups: 'ups',
    mail: 'gmail',
    weather: 'weather',
    rates: 'rates',
    focus: 'focus',
    tasks: 'tasks',
    notes: 'notes',
    notifications: 'notifications',
    user: 'user',
    settings: 'settings',
    grid: 'grid',
    explore: 'explore',
    home: 'home',
    close: 'close',
    refresh: 'refresh',
    add: 'add',
    open: 'open'
  };

  function normalizeIconKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function inferIconKey(label, url = '') {
    const domain = String(url || '').toLowerCase();
    if (domain.includes('mail.google')) return 'gmail';
    if (domain.includes('calendar.google')) return 'calendar';
    if (domain.includes('drive.google')) return 'drive';
    if (domain.includes('docs.google')) return 'docs';
    if (domain.includes('sheets.google')) return 'sheets';
    if (domain.includes('slides.google')) return 'slides';
    if (domain.includes('meet.google')) return 'meet';
    if (domain.includes('maps.google')) return 'maps';
    if (domain.includes('news.google')) return 'news';
    if (domain.includes('photos.google')) return 'photos';
    if (domain.includes('translate.google')) return 'translate';
    if (domain.includes('chat.openai')) return 'chatgpt';
    if (domain.includes('claude.ai')) return 'claude';
    if (domain.includes('perplexity')) return 'perplexity';
    if (domain.includes('copilot')) return 'copilot';
    if (domain.includes('web.telegram')) return 'telegram';
    const normalized = normalizeIconKey(label);
    return ICON_ALIASES[normalized] || normalized;
  }

  function getInitials(label) {
    const parts = String(label || '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '+';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function svgBox(content, viewBox = '0 0 24 24') {
    return `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${content}</svg>`;
  }

  function iconSvg(key, label = '') {
    const icons = {
      daily: svgBox('<path d="M12 3l2.4 4.8 5.3.8-3.8 3.7.9 5.4L12 15.8l-4.8 2.6.9-5.4L4.3 8.6l5.3-.8L12 3z" fill="currentColor"/>'),
      public: svgBox('<path d="M3 9l9-5 9 5v2H3V9zm2 4h2v6H5v-6zm6 0h2v6h-2v-6zm6 0h2v6h-2v-6zM3 20h18v1H3z" fill="currentColor"/>'),
      tools: svgBox('<path d="M15.7 3a4 4 0 0 0 1.1 4.1l-6.2 6.2a4 4 0 0 0-4.1-1.1L4 14.8a1 1 0 0 0 0 1.4l3.8 3.8a1 1 0 0 0 1.4 0l2.6-2.6a4 4 0 0 0 1.1-4.1l6.2-6.2A4 4 0 0 0 21 6.3 5 5 0 0 1 15.7 3z" fill="currentColor"/>'),
      google: svgBox('<path d="M12 4a8 8 0 1 0 0 16c4 0 7-2.7 7-6.6 0-.4 0-.8-.1-1.2H12v2.8h4c-.4 1.8-1.9 3.2-4 3.2a4.8 4.8 0 0 1 0-9.6c1.3 0 2.2.5 3 1.2l2.1-2.1A7.8 7.8 0 0 0 12 4z" fill="currentColor"/>'),
      ai: svgBox('<path d="M12 3a3 3 0 0 1 3 3v1.1a5.9 5.9 0 0 1 2.4 1.4l.8-.5a3 3 0 1 1 3 5.2l-.8.5c.1.4.1.9.1 1.3s0 .9-.1 1.3l.8.5a3 3 0 1 1-3 5.2l-.8-.5A5.9 5.9 0 0 1 15 22.9V24h-6v-1.1a5.9 5.9 0 0 1-2.4-1.4l-.8.5a3 3 0 1 1-3-5.2l.8-.5A6.3 6.3 0 0 1 3 15c0-.4 0-.9.1-1.3l-.8-.5a3 3 0 1 1 3-5.2l.8.5A5.9 5.9 0 0 1 9 7.1V6a3 3 0 0 1 3-3zm0 6.3A5.7 5.7 0 1 0 12 21a5.7 5.7 0 0 0 0-11.4z" fill="currentColor"/>'),
      travel: svgBox('<path d="M3 13.5V11l8-2.5V4.7c0-.9.8-1.7 1.7-1.7h.6c1 0 1.7.8 1.7 1.7v3.8L23 11v2.5l-8-1.2v4.1l2 1.4V20l-5-1.5L7 20v-2.2l2-1.4v-4.1L3 13.5z" fill="currentColor"/>'),
      social: svgBox('<path d="M13.5 21v-7h2.4l.5-3H13.5V9.2c0-.9.3-1.5 1.6-1.5h1.4V5.1c-.2 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.7V11H8v3h2.9v7h2.6z" fill="currentColor"/>'),
      gmail: svgBox('<path d="M3 7.2 12 14l9-6.8V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.2z" fill="currentColor" opacity=".22"/><path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18V8.2l8 6.2 8-6.2V18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
      calendar: svgBox('<rect x="4" y="5.5" width="16" height="14.5" rx="3" fill="currentColor" opacity=".16"/><rect x="4" y="6" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 4v4M16 4v4M4 9.5h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="7.2" y="12" width="3" height="3" rx="1" fill="currentColor"/><rect x="11.1" y="12" width="3" height="3" rx="1" fill="currentColor" opacity=".55"/><rect x="15" y="12" width="3" height="3" rx="1" fill="currentColor" opacity=".3"/>'),
      drive: svgBox('<path d="M8.1 4h3.8l4.1 7-1.9 3.2H10.3L8.1 10 10 6.8 8.1 4z" fill="#16a765"/><path d="M10.1 6.8H14L18.2 14h-3.8L10.1 6.8z" fill="#fbbc04"/><path d="M5.8 14h8.3l-2.2 3.8H3.7L5.8 14z" fill="#4285f4"/>'),
      notion: svgBox('<rect x="5" y="5" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.1 16V8h1.8l4 5.1V8h2v8h-1.7L10 10.8V16H8.1z" fill="currentColor"/>'),
      todoist: svgBox('<path d="M7 8.2 11 12l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 13.4 11 17l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>'),
      slack: svgBox('<path d="M9 4.5a2 2 0 0 1 2 2v2.5H8.5a2 2 0 1 1 0-4H9zm0 6H5.5a2 2 0 1 0 0 4H8v-2a2 2 0 0 1 1-1.7zm2 0a2 2 0 0 1 2-2V5.5a2 2 0 1 1 4 0V9h-2a2 2 0 0 1-2 1.5zm0 2a2 2 0 0 1-2 2v2.5a2 2 0 1 0 4 0V15h-2z" fill="currentColor"/>'),
      zoom: svgBox('<rect x="5" y="7" width="9.5" height="10" rx="3" fill="currentColor" opacity=".18"/><rect x="5" y="7" width="9.5" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.5 10.2 19 8.6v6.8l-4.5-1.6v-3.6z" fill="currentColor"/>'),
      dropbox: svgBox('<path d="M7.2 5.1 12 8.3 7.2 11.4 2.5 8.3 7.2 5.1zm9.6 0 4.7 3.2-4.7 3.1L12 8.3l4.8-3.2zM7.2 13l4.8 3.1 4.8-3.1v3.3L12 19.5l-4.8-3.2V13z" fill="currentColor"/>'),
      outlook: svgBox('<path d="M13 6h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-6V6z" fill="currentColor" opacity=".18"/><path d="M4 8a2 2 0 0 1 2-2h7v12H6a2 2 0 0 1-2-2V8zm4.2 6.5c1.6 0 2.8-1.3 2.8-3s-1.2-3-2.8-3c-1.7 0-2.9 1.3-2.9 3s1.2 3 2.9 3z" fill="currentColor"/>'),
      todo: svgBox('<rect x="5" y="6" width="14" height="12" rx="3" fill="currentColor" opacity=".16"/><path d="M8 12l2.2 2.2L16 8.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>'),
      github: svgBox('<path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.6v-2.8c-2.3.5-2.8-1-2.8-1-.4-1-.9-1.2-.9-1.2-.8-.5.1-.5.1-.5.9.1 1.4 1 1.4 1 .8 1.3 2 1 2.5.7.1-.6.3-1 .6-1.3-1.8-.2-3.7-.9-3.7-4 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .8-.3 2.5.9a8.7 8.7 0 0 1 4.6 0c1.7-1.2 2.5-.9 2.5-.9.5 1.2.2 2.1.1 2.3.6.6.9 1.4.9 2.3 0 3.1-1.9 3.8-3.8 4 .3.3.6.8.6 1.7v2.7A8.5 8.5 0 0 0 12 3.5z" fill="currentColor"/>'),
      figma: svgBox('<path d="M10.2 4a3.2 3.2 0 1 1 0 6.4H8.7A3.2 3.2 0 1 1 8.7 4h1.5zm0 6.4a3.2 3.2 0 1 1 0 6.4H8.7a3.2 3.2 0 1 1 0-6.4h1.5zM15.3 4a3.2 3.2 0 1 1 0 6.4h-1.5V4h1.5zm0 6.4a3.2 3.2 0 1 1-1.5 6V10.4h1.5z" fill="currentColor"/>'),
      canva: svgBox('<path d="M16.5 8.8c-.8-.8-1.9-1.2-3.3-1.2-3 0-5.3 2.1-5.3 5s2.2 4.9 5.2 4.9c1.3 0 2.5-.4 3.4-1.1l-1.2-1.6c-.6.4-1.2.6-2 .6-1.7 0-3-1.2-3-2.8s1.3-2.8 3-2.8c.8 0 1.4.2 2 .7l1.2-1.7z" fill="currentColor"/>'),
      spotify: svgBox('<path d="M7 10.1c3.5-1 7.3-.8 10.3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7.8 13.1c2.7-.7 5.5-.5 7.8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".8"/><path d="M8.5 16c2-.5 4-.3 5.7.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>'),
      youtube: svgBox('<rect x="4" y="6.5" width="16" height="11" rx="4" fill="currentColor" opacity=".18"/><path d="M10 9.4 15.5 12 10 14.6V9.4z" fill="currentColor"/><rect x="4.2" y="6.7" width="15.6" height="10.6" rx="3.8" fill="none" stroke="currentColor" stroke-width="1.4"/>'),
      wikipedia: svgBox('<path d="M6.5 8h2.1l1.9 5.9L12.4 8h1.7l1.8 5.9L17.7 8h1.8L16.7 16h-1.6L13.3 10 11.5 16H10L6.5 8z" fill="currentColor"/>'),
      trello: svgBox('<rect x="4.5" y="5" width="15" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7.5" y="8" width="3.5" height="8" rx="1.2" fill="currentColor"/><rect x="13" y="8" width="3.5" height="5.5" rx="1.2" fill="currentColor" opacity=".6"/>'),
      miro: svgBox('<path d="M7 17 10 7h2l-3 10H7zm4 0 3-10h2l-3 10h-2zm4 0 2-7h2l-2 7h-2z" fill="currentColor"/>'),
      loom: svgBox('<path d="M12 5.5 13.7 9h4l-3.2 2.3 1.2 3.8L12 13l-3.7 2.1 1.2-3.8L6.3 9h4L12 5.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'),
      tinypng: svgBox('<path d="M7 17c.4-2.7 2.4-4.5 5-4.5S16.6 14.3 17 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><path d="M10.6 8.5c.4-1.2 1.1-2 1.4-2.5.3.5 1 1.3 1.4 2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
      cloudconvert: svgBox('<path d="M8.5 17h7a3.5 3.5 0 0 0 .5-7 4.5 4.5 0 0 0-8.7 1.2A3 3 0 0 0 8.5 17z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v5m0 0-2-2m2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
      removebg: svgBox('<path d="M6 8h6a3 3 0 0 1 0 6H8a2 2 0 0 0 0 4h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m14 8 4 4m0-4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      unsplash: svgBox('<path d="M11 5h2v5h5v2h-5v5h-2v-5H6v-2h5V5z" fill="currentColor"/>'),
      translate: svgBox('<path d="M7 8h8M11 8c0 4.5-2 7.3-4.2 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.3 10h4.7m-2.3 0c0 3-1.3 5.2-2.8 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m14 14 3 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      speedtest: svgBox('<path d="M5.5 15a6.5 6.5 0 1 1 13 0" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m12 12 4-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/>'),
      archive: svgBox('<path d="M5 7h14v11H5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 7h16v3H4z" fill="currentColor" opacity=".18"/><path d="M9 12h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      search: svgBox('<circle cx="11" cy="11" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15 15 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      maps: svgBox('<path d="M12 20c3.5-4 5.5-7 5.5-9.5a5.5 5.5 0 1 0-11 0C6.5 13 8.5 16 12 20z" fill="currentColor" opacity=".22"/><circle cx="12" cy="10.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 20c3.5-4 5.5-7 5.5-9.5a5.5 5.5 0 1 0-11 0C6.5 13 8.5 16 12 20z" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
      docs: svgBox('<path d="M8 4h6l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 12h6M10 15h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      sheets: svgBox('<path d="M8 4h6l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 12h6M10 15h6M12.5 10v7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'),
      slides: svgBox('<path d="M8 4h6l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="11" width="6" height="4" rx="1" fill="currentColor" opacity=".7"/>'),
      meet: svgBox('<rect x="5" y="8" width="8.5" height="8" rx="2.2" fill="currentColor" opacity=".18"/><path d="M5 9.2A2.2 2.2 0 0 1 7.2 7h4.6A2.2 2.2 0 0 1 14 9.2v5.6a2.2 2.2 0 0 1-2.2 2.2H7.2A2.2 2.2 0 0 1 5 14.8V9.2zm9 2 5-2.4v6.4L14 12.8v-1.6z" fill="currentColor"/>'),
      keep: svgBox('<path d="M12 4a5 5 0 0 1 5 5c0 1.9-.9 3-2 4v3H9v-3c-1.1-1-2-2.1-2-4a5 5 0 0 1 5-5z" fill="currentColor" opacity=".18"/><path d="M10 19h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 4a5 5 0 0 1 5 5c0 1.9-.9 3-2 4v3H9v-3c-1.1-1-2-2.1-2-4a5 5 0 0 1 5-5z" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
      news: svgBox('<rect x="5" y="6" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7.5" y="8.5" width="4" height="4" rx="1" fill="currentColor" opacity=".25"/><path d="M13 9h4M13 12h4M7.5 15h9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      photos: svgBox('<circle cx="12" cy="7.5" r="2" fill="currentColor" opacity=".9"/><circle cx="16.5" cy="12" r="2" fill="currentColor" opacity=".75"/><circle cx="12" cy="16.5" r="2" fill="currentColor" opacity=".6"/><circle cx="7.5" cy="12" r="2" fill="currentColor" opacity=".45"/><path d="M12 10v4m-2-2h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
      chatgpt: svgBox('<path d="M12 4.2a3.8 3.8 0 0 1 3.6 2.5 3.6 3.6 0 0 1 4.1 5.1 3.7 3.7 0 0 1-1.1 6.7 3.8 3.8 0 0 1-6.6 2.1 3.8 3.8 0 0 1-6.6-2.1 3.7 3.7 0 0 1-1.1-6.7 3.6 3.6 0 0 1 4.1-5.1A3.8 3.8 0 0 1 12 4.2zm0 3.3-1.8 1 0 2-1.7 1 1.7 1v2l1.8 1 1.8-1v-2l1.7-1-1.7-1 0-2-1.8-1z" fill="currentColor"/>'),
      claude: svgBox('<path d="M12 5.5c3 0 5.5 2.5 5.5 5.5s-2.5 5.5-5.5 5.5S6.5 14 6.5 11 9 5.5 12 5.5zm0 2.5A3 3 0 1 0 12 14a3 3 0 0 0 0-6z" fill="currentColor"/><path d="M4 12h3M17 12h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      perplexity: svgBox('<path d="M8 6h5.5A4.5 4.5 0 1 1 13.5 15H10v3H8V6zm2 2v5h3.5a2.5 2.5 0 1 0 0-5H10z" fill="currentColor"/>'),
      gemini: svgBox('<path d="M12 4.5 14 10l5.5 2-5.5 2L12 19.5 10 14 4.5 12 10 10 12 4.5z" fill="currentColor"/>'),
      copilot: svgBox('<path d="M8.5 7.2A3.7 3.7 0 0 1 12 5a3.7 3.7 0 0 1 3.5 2.2A3.7 3.7 0 1 1 17 14h-1.5A3.5 3.5 0 0 1 12 17a3.5 3.5 0 0 1-3.5-3H7a3.7 3.7 0 1 1 1.5-6.8z" fill="currentColor"/>'),
      huggingface: svgBox('<circle cx="9" cy="11" r="1.3" fill="currentColor"/><circle cx="15" cy="11" r="1.3" fill="currentColor"/><path d="M8 14c1 1 2.3 1.5 4 1.5S15 15 16 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8.2 8.6 6.6 7M15.8 8.6 17.4 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      runway: svgBox('<path d="M8 6h5.5A4.5 4.5 0 1 1 13.5 15H10v3H8V6zm2 2v5h3.2l-1.7-2.3L13.2 8H10z" fill="currentColor"/>'),
      midjourney: svgBox('<path d="M6 17c1.2-4 3.4-6.5 6-7.6 2.7 1.1 4.9 3.6 6 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 6c1.3 1.6 2.3 2.5 4 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      flights: svgBox('<path d="M3 13.2 11 11V7.2l-2-1V4.8l3 1 3-1v1.4l-2 1V11l8 2.2v1.6l-8-1.2v3l2 1.4v1.4L12 18l-5 1.2v-1.4l2-1.4v-3l-6 1.2v-1.4z" fill="currentColor"/>'),
      booking: svgBox('<path d="M8 5h5.5a3.7 3.7 0 1 1 0 7.4H8V5zm2.2 2v3.2h2.8a1.6 1.6 0 1 0 0-3.2h-2.8zm-2.2 6h6a3.2 3.2 0 1 1 0 6.4H8V13zm2.2 2v2.3H14a1.15 1.15 0 1 0 0-2.3h-3.8z" fill="currentColor"/>'),
      airbnb: svgBox('<path d="M12 6.5c1.4 0 2.3 1 2.9 2.3l2.6 5c.8 1.6-.4 3.2-2.1 3.2-1 0-1.9-.6-2.7-1.9-.8 1.3-1.7 1.9-2.7 1.9-1.7 0-2.9-1.6-2.1-3.2l2.6-5c.6-1.3 1.5-2.3 2.9-2.3zm0 2.1c-.5 0-1 .5-1.6 1.8l-1.5 3c-.2.5.1 1 .6 1 .5 0 1.1-.5 1.8-1.8.7 1.3 1.3 1.8 1.8 1.8.5 0 .8-.5.6-1l-1.5-3c-.6-1.3-1.1-1.8-1.6-1.8z" fill="currentColor"/>'),
      uber: svgBox('<path d="M7 7h2v6a3 3 0 0 0 6 0V7h2v6a5 5 0 0 1-10 0V7z" fill="currentColor"/>'),
      wise: svgBox('<path d="M7 8.5 14.5 6 10 16l7-2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
      revolut: svgBox('<path d="M7 7h6.2a2.8 2.8 0 1 1 0 5.6H9.2l4.8 4.4H11L7 13.3V7zm2.2 2v1.8h3.4a.9.9 0 1 0 0-1.8H9.2z" fill="currentColor"/>'),
      finance: svgBox('<path d="M7 15.5 10.2 12l2.2 2.2L17 9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 9.5V13h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
      currency: svgBox('<path d="M14.5 6.5H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H9.5M12 5v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      facebook: svgBox('<path d="M13.5 20v-6.5h2.2l.4-2.8h-2.6V9c0-.8.3-1.3 1.5-1.3h1.2V5.2c-.2 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.5v2.1H8.8v2.8H11V20h2.5z" fill="currentColor"/>'),
      instagram: svgBox('<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.2" cy="7.8" r="1" fill="currentColor"/>'),
      x: svgBox('<path d="M6.5 6h3.2l2.7 3.9L15.7 6H18l-4.4 5.8L18 18h-3.2l-3-4.2L8.7 18H6.4l4.6-6.2L6.5 6z" fill="currentColor"/>'),
      reddit: svgBox('<circle cx="9.2" cy="12" r="1.1" fill="currentColor"/><circle cx="14.8" cy="12" r="1.1" fill="currentColor"/><path d="M8.2 14c.9.8 1.9 1.2 3.8 1.2s2.9-.4 3.8-1.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m13 7.4 2-.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="16.2" cy="7.2" r="1" fill="currentColor"/>'),
      discord: svgBox('<path d="M8.2 8.5a13 13 0 0 1 7.6 0c.6 1 1.1 2.1 1.4 3.2-.8.6-1.7 1.1-2.7 1.4-.2-.3-.4-.7-.6-1-.9.2-1.8.3-2.6.3s-1.7-.1-2.6-.3c-.2.3-.4.7-.6 1-1-.3-1.9-.8-2.7-1.4.3-1.1.8-2.2 1.4-3.2zm2.1 3.8a1 1 0 1 0 0-2.1 1 1 0 0 0 0 2.1zm3.4 0a1 1 0 1 0 0-2.1 1 1 0 0 0 0 2.1z" fill="currentColor"/>'),
      whatsapp: svgBox('<path d="M12 5a7 7 0 0 1 6 10.5L19 19l-3.6-.9A7 7 0 1 1 12 5zm-2 4.2c-.2 0-.4.1-.6.4-.2.2-.7.7-.7 1.6 0 .9.6 1.8.8 2 .2.2 1.5 2.4 3.8 3.2 1.8.7 2.2.5 2.6.5s1.3-.5 1.5-1.1c.2-.6.2-1 .1-1.1-.1-.1-.4-.2-.8-.4-.4-.2-.9-.5-1-.6-.1-.2-.3-.2-.5.1s-.6.8-.8.9c-.2.1-.3.1-.6 0-.3-.2-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5s0-.4 0-.6-.5-1.2-.7-1.6c-.2-.4-.4-.4-.6-.4z" fill="currentColor"/>'),
      telegram: svgBox('<path d="m5 11.2 12.8-5c.8-.3 1.6.4 1.4 1.2l-2.1 10.2c-.2.8-1.1 1.2-1.7.8l-3.3-2.4-1.9 1.8c-.5.4-1.2.1-1.2-.6v-2.7l6.2-5.8-7.8 5-2.5-.8c-.9-.3-.9-1.5.1-1.9z" fill="currentColor"/>'),
      pinterest: svgBox('<path d="M12 5.2c-3.6 0-5.5 2.6-5.5 5 0 1.4.5 2.7 1.6 3.2.2.1.4 0 .4-.2l.3-1.2c0-.2 0-.3-.2-.5-.4-.4-.7-.9-.7-1.7 0-2.2 1.7-4.1 4.3-4.1 2.3 0 3.6 1.4 3.6 3.3 0 2.5-1.1 4.6-2.7 4.6-.9 0-1.5-.7-1.3-1.6.3-1 1-2 1-3 0-.7-.4-1.3-1.2-1.3-1 0-1.8 1-1.8 2.4 0 .9.3 1.5.3 1.5l-1.1 4.6c-.3 1.4 0 3 .1 3.1 0 .1.2.1.3 0 .1-.2 1.3-1.6 1.8-2.9.1-.4.5-1.8.5-1.8.2.4 1.1.8 2 .8 2.7 0 4.6-2.5 4.6-5.8 0-2.5-2.1-4.8-5.3-4.8z" fill="currentColor"/>'),
      irs: svgBox('<path d="M7 7h10v10H7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      usps: svgBox('<path d="M5 8h14v8H5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 10h14" stroke="currentColor" stroke-width="1.8"/><path d="m13 12 3-2v4l-3-2z" fill="currentColor"/>'),
      govuk: svgBox('<path d="M6 18V9l6-3 6 3v9H6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 18v-5h6v5" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
      eup: svgBox('<circle cx="12" cy="12" r="6.8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.8 12.7 9l1.3.2-1 .9.2 1.3-1.2-.6-1.2.6.2-1.3-1-.9 1.3-.2.7-1.2z" fill="currentColor"/>'),
      nhs: svgBox('<path d="M7 16V8h2.1l2.1 3.5V8h2v8h-2l-2.2-3.6V16H7zm7.4 0V8h2v3h2.3V8h2v8h-2v-3h-2.3v3h-2z" fill="currentColor"/>'),
      dhl: svgBox('<path d="M4 10h11M6 13h10M8 16h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 9.5h2.5v6H18z" fill="currentColor"/>'),
      royalmail: svgBox('<path d="M12 5.5 17 12l-5 6.5L7 12 12 5.5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      ups: svgBox('<path d="M12 4.8 18 7v4.5c0 3.3-2.3 6.3-6 7.7-3.7-1.4-6-4.4-6-7.7V7l6-2.2z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 12h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      weather: svgBox('<path d="M8 17h8a3 3 0 0 0 .3-6 4 4 0 0 0-7.8 1.1A2.8 2.8 0 0 0 8 17z" fill="currentColor" opacity=".22"/><path d="M8 17h8a3 3 0 0 0 .3-6 4 4 0 0 0-7.8 1.1A2.8 2.8 0 0 0 8 17z" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
      rates: svgBox('<path d="M7.5 15.5 10.5 12l2.2 2.2L16.8 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.8 9v3.4h-3.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
      focus: svgBox('<circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>'),
      tasks: svgBox('<rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 10.5 10.6 12 15 8.5M9 15h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
      notes: svgBox('<path d="M8 4h8l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 12h6M10 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      notifications: svgBox('<path d="M12 5a4 4 0 0 1 4 4v2.8l1.4 2.4H6.6L8 11.8V9a4 4 0 0 1 4-4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      user: svgBox('<circle cx="12" cy="8.2" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 18c1.1-2.7 3.1-4 5.5-4s4.4 1.3 5.5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      settings: svgBox('<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4v2M12 18v2M20 12h-2M6 12H4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
      grid: svgBox('<path d="M5.5 5.5h5v5h-5zm8 0h5v5h-5zm-8 8h5v5h-5zm8 0h5v5h-5z" fill="currentColor"/>'),
      explore: svgBox('<circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m14.8 9.2-2 5.6-3.6 1.2 2-5.6 3.6-1.2z" fill="currentColor"/>'),
      home: svgBox('<path d="M5.2 10.8 12 5l6.8 5.8V19H5.2v-8.2z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 19v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
      close: svgBox('<path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
      refresh: svgBox('<path d="M17 11a5 5 0 1 0 1 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 7v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
      add: svgBox('<path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
      open: svgBox('<path d="M12 5h7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 13 19 5M7 8H5v11h11v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>')
    };
    if (icons[key]) return icons[key];
    const text = getInitials(label);
    return svgBox(`<text x="12" y="15" text-anchor="middle" font-size="9.5" font-family="Inter, Arial, sans-serif" font-weight="900" fill="currentColor">${escapeHtml(text)}</text>`);
  }

  function iconPalette(key, label = '') {
    const palettes = {
      daily: ['#eef0ff', '#5b6eff'], public: ['#f3f5fa', '#4b5565'], tools: ['#eef7ff', '#2c82ff'], google: ['#eef8ff', '#4285f4'], ai: ['#f5efff', '#7b61ff'], travel: ['#fff6e8', '#ff9f1a'], social: ['#eef3ff', '#4f7cff'],
      gmail: ['#fff1f1', '#ea4335'], calendar: ['#eef5ff', '#4285f4'], drive: ['#eff9f1', '#16a765'], notion: ['#f4f5f7', '#111827'], todoist: ['#fff3ef', '#ef5b3f'], slack: ['#f8f1ff', '#7c4dff'], zoom: ['#edf3ff', '#2d8cff'], dropbox: ['#eef5ff', '#0061ff'], outlook: ['#edf5ff', '#2563eb'], todo: ['#eef5ff', '#4f7cff'], github: ['#f1f4f7', '#111827'], figma: ['#fff1f4', '#a259ff'], canva: ['#ecfbff', '#00c4cc'], spotify: ['#eefaf2', '#1db954'], youtube: ['#fff0f2', '#ff0033'], wikipedia: ['#f5f6f8', '#334155'], trello: ['#edf5ff', '#2563eb'], miro: ['#fff6e8', '#ffb020'], loom: ['#f7f0ff', '#7b61ff'], tinypng: ['#f6f6fb', '#7c5cff'], cloudconvert: ['#eef8ff', '#3b82f6'], removebg: ['#fff3f4', '#fb7185'], unsplash: ['#f4f7fb', '#0f172a'], translate: ['#eef8ff', '#3b82f6'], speedtest: ['#fff5ef', '#f97316'], archive: ['#f8f6ef', '#8b5e3c'], search: ['#eef8ff', '#2991ff'], maps: ['#edf8ff', '#0ea5e9'], docs: ['#eef5ff', '#2563eb'], sheets: ['#effaf2', '#16a34a'], slides: ['#fff7ed', '#f59e0b'], meet: ['#edfef8', '#10b981'], keep: ['#fff9e8', '#f59e0b'], news: ['#f4f7fb', '#475569'], photos: ['#fff2f6', '#ec4899'], chatgpt: ['#ecfbf7', '#10a37f'], claude: ['#fff7ec', '#d97706'], perplexity: ['#eef7ff', '#2563eb'], gemini: ['#f4f0ff', '#7c3aed'], copilot: ['#f0f5ff', '#6366f1'], huggingface: ['#fff8e7', '#f59e0b'], runway: ['#f3f4f6', '#111827'], midjourney: ['#eef8ff', '#2563eb'], flights: ['#eef4ff', '#4f7cff'], booking: ['#eef5ff', '#2563eb'], airbnb: ['#fff0f4', '#ff385c'], uber: ['#f4f6f8', '#111827'], wise: ['#eefcf6', '#14b87a'], revolut: ['#eef5ff', '#2563eb'], finance: ['#eefcf4', '#22c55e'], currency: ['#fff8ef', '#f59e0b'], facebook: ['#eef3ff', '#1877f2'], instagram: ['#fff0f9', '#d946ef'], x: ['#f4f6f8', '#111827'], reddit: ['#fff4ef', '#ff4500'], discord: ['#eef0ff', '#5865f2'], whatsapp: ['#eefcf3', '#22c55e'], telegram: ['#eef8ff', '#229ed9'], pinterest: ['#fff1f2', '#e60023'], irs: ['#eef4ff', '#2563eb'], usps: ['#fff7ed', '#ef4444'], govuk: ['#f2f6f8', '#334155'], eup: ['#eef0ff', '#4f46e5'], nhs: ['#eef8ff', '#1d4ed8'], dhl: ['#fff8e7', '#d97706'], royalmail: ['#fff4ef', '#dc2626'], ups: ['#f9f3ea', '#8b5e3c'], weather: ['#eef8ff', '#60a5fa'], rates: ['#edfef6', '#10b981'], focus: ['#eef0ff', '#5b6eff'], tasks: ['#eef5ff', '#4f7cff'], notes: ['#fff9e8', '#f59e0b'], notifications: ['#fff1f2', '#ef4444'], user: ['#f4f7fb', '#64748b'], settings: ['#f4f7fb', '#64748b'], grid: ['#eef0ff', '#5b6eff'], explore: ['#eefcf6', '#0ea5e9'], home: ['#eef0ff', '#5b6eff'], close: ['#f4f7fb', '#64748b'], refresh: ['#f4f7fb', '#64748b'], add: ['#eef0ff', '#5b6eff'], open: ['#eef8ff', '#0ea5e9']
    };
    if (palettes[key]) return palettes[key];
    return ['#f4f7fb', appColor(label || key)];
  }

  function renderIcon(key, label = '', size = 'md', className = '') {
    const normalized = ICON_ALIASES[normalizeIconKey(key)] || normalizeIconKey(key);
    const [bg, fg] = iconPalette(normalized, label);
    return `<span class="ld-icon ld-icon-${size} ${className}" style="--icon-bg:${escapeHtml(bg)};--icon-fg:${escapeHtml(fg)}">${iconSvg(normalized, label)}</span>`;
  }

  function renderAppIcon(app, size = 'md') {
    const key = inferIconKey(app?.name || app?.label || '', app?.url || '');
    return renderIcon(key, app?.name || app?.label || '', size);
  }

  function appUrl(app) {
    return escapeHtml(app.url || '#');
  }

  function renderTopTabs() {
    return `<nav class="top-tabs widget-nav" aria-label="App categories">
      ${state.categories.map((category) => `<button class="top-tab ${state.settings.appCategory === category.id ? 'active' : ''}" data-action="category" data-category="${escapeHtml(category.id)}" type="button">
        ${renderIcon(category.id, category.label, 'sm', 'tab-icon')}<span>${escapeHtml(category.label)}</span>
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
      <button class="status-row" data-action="open-url" data-url="https://weather.com" type="button">${renderIcon('weather', 'Weather', 'xs')}<span>${escapeHtml(state.weather.city)} · ${escapeHtml(state.weather.summary)}</span><strong>${escapeHtml(String(state.weather.tempC))}°C</strong></button>
      <button class="status-row" data-action="open-url" data-url="https://web.telegram.org" type="button">${renderIcon('telegram', 'Telegram', 'xs')}<span>Telegram Web</span><strong>Open</strong></button>
      <div class="status-row muted">${renderIcon('home', 'Dashboard', 'xs')}<span>Local dashboard</span><strong>Saved just now</strong></div>
    </section>`;
  }

  function renderCurrencyCard() {
    const flags = { USD: 'US', EUR: 'EU', GBP: 'GB' };
    return `<section class="widget-card rates-card premium-card" aria-label="Currency rates">
      <div class="card-title-row"><div><div class="card-title">${renderIcon('rates', 'Rates', 'xs')}Rates</div><div class="card-subtitle">Base ${escapeHtml(state.settings.currencyBase || 'USD')}</div></div><button class="mini-button" data-action="refresh" type="button" aria-label="Refresh rates">${renderIcon('refresh', 'Refresh', 'xs')}</button></div>
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
    const chipApps = [
      { name: 'ChatGPT', url: 'https://chat.openai.com' },
      { name: 'Google Calendar', url: 'https://calendar.google.com' },
      { name: 'Gmail', url: 'https://mail.google.com' },
      { name: 'Google Drive', url: 'https://drive.google.com' }
    ];
    return `<section class="search-hero premium-card" aria-label="Search and quick commands">
      <div class="search-pod">
        <button class="search-tool" data-action="open-command" type="button" aria-label="Open command search">${renderIcon('search', 'Search', 'xs')}</button>
        <button class="search-tool" data-action="open-command" type="button" aria-label="Open quick scanner">${renderIcon('grid', 'Scanner', 'xs')}</button>
        <div class="search-input-wrap">
          <input id="mainSearch" type="search" placeholder="Search Google or run a LiveDash command" autocomplete="off" aria-label="Search or command">
        </div>
        <select class="search-engine" id="searchEngine" aria-label="Search engine">
          <option value="google" ${engine === 'google' ? 'selected' : ''}>Google</option>
          <option value="bing" ${engine === 'bing' ? 'selected' : ''}>Bing</option>
          <option value="duckduckgo" ${engine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
        </select>
        <button class="command-button" data-action="open-command" type="button" aria-label="Open command palette">${renderIcon('grid', 'Command', 'xs')}</button>
      </div>
      <div class="search-chips" aria-label="Quick actions">
        ${chipApps.map((app) => `<button class="search-chip" data-action="open-url" data-url="${escapeHtml(app.url)}" type="button">${renderAppIcon(app, 'xs')}<span>${escapeHtml(app.name.replace('Google ', ''))}</span></button>`).join('')}
        <button class="search-chip" data-action="add-note" type="button">${renderIcon('notes', 'Quick note', 'xs')}<span>Quick note</span></button>
        <button class="search-chip" data-action="add-task" type="button">${renderIcon('tasks', 'Quick task', 'xs')}<span>Quick task</span></button>
      </div>
    </section>`;
  }

  function renderBookmarkSlots() {
    return `<section class="bookmark-grid" aria-label="Bookmark slots">
      ${state.bookmarkSlots.map((slot) => {
        const filled = Boolean(slot.url);
        const color = slot.color || appColor(slot.label || slot.id);
        const icon = filled ? renderAppIcon(slot, 'md') : renderIcon('add', 'Add site', 'xl', 'bookmark-add-icon');
        return `<button class="bookmark-slot ${filled ? 'filled' : 'empty'}" style="--slot-color:${escapeHtml(color)}" data-action="${filled ? 'open-bookmark' : 'edit-bookmark'}" data-id="${escapeHtml(slot.id)}" type="button" aria-label="${filled ? `Open ${slot.label}` : 'Add bookmark'}">
          <span class="bookmark-icon">${icon}</span>
          <span class="bookmark-label">${escapeHtml(filled ? slot.label : 'Add site')}</span>
        </button>`;
      }).join('')}
    </section>`;
  }

  function renderPetCard() {
    const openTasks = (state.tasks || []).filter((task) => task.status !== 'done').length;
    return `<section class="widget-card pet-card premium-card" aria-label="Daily quick win">
      <div class="pet-banner">
        <div class="pet-avatar">${renderIcon('tasks', 'Tasks', 'sm')}</div>
        <div><div class="pet-title">Need a quick win?</div><div class="pet-subtitle">${openTasks} open tasks · capture one page, review priorities, or open your calendar.</div></div>
      </div>
      <div class="pet-character" aria-hidden="true"><div class="pet-face"></div></div>
      <div class="pet-hearts">♥ ♥ ♥ ♥ ♥</div>
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
      <div class="card-title-row"><div><div class="card-title">${renderIcon('focus', 'Focus', 'xs')}Focus</div><div class="card-subtitle">${state.focus.mode === 'break' ? 'Break' : 'Work'} session</div></div><span class="mode-pill">${state.focus.running ? 'Live' : 'Ready'}</span></div>
      <div class="pomo-ring" style="--pomo-deg:${deg}deg"><div><div class="pomo-time">${minutes}:${seconds}</div><div class="pomo-label">${state.focus.running ? 'In progress' : 'Ready'}</div></div></div>
      <div class="pomo-controls">
        <button class="mini-button" data-action="pomo-reset" type="button" aria-label="Reset focus timer">${renderIcon('refresh', 'Reset', 'xs')}</button>
        <button class="play-button" data-action="pomo-toggle" type="button" aria-label="Start or pause focus timer">${state.focus.running ? '❚❚' : '▶'}</button>
        <button class="mini-button" data-action="pomo-mode" type="button" aria-label="Switch focus mode">⇄</button>
      </div>
    </section>`;
  }

  function renderTasks() {
    const openTasks = (state.tasks || []).filter((task) => task.status !== 'done').slice(0, 4);
    return `<section class="widget-card compact task-card premium-card" aria-label="Tasks">
      <div class="card-title-row"><div><div class="card-title">${renderIcon('tasks', 'Tasks', 'xs')}Tasks</div><div class="card-subtitle">Today’s list</div></div><button class="mini-button" data-action="clear-done" type="button" aria-label="Clear completed tasks">${renderIcon('close', 'Clear', 'xs')}</button></div>
      <div class="task-list">
        ${openTasks.length ? openTasks.map((task) => `<div class="task-row ${task.status === 'done' ? 'done' : ''}">
          <button class="task-check" data-action="complete-task" data-id="${escapeHtml(task.id)}" type="button" aria-label="Complete ${escapeHtml(task.title)}">${task.status === 'done' ? '✓' : ''}</button>
          <div class="task-copy"><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta"><span class="priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span> · ${escapeHtml(task.source || 'LiveDash')}</div></div>
          <button class="mini-button row-action" data-action="delete-task" data-id="${escapeHtml(task.id)}" type="button">${renderIcon('close', 'Delete', 'xs')}</button>
        </div>`).join('') : '<div class="empty-state">No open tasks right now.</div>'}
      </div>
      <div class="task-compose"><button class="play-button" data-action="add-task-input" type="button">+</button><input id="taskInput" class="form-input" placeholder="New task title..." aria-label="Quick task"></div>
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

  function renderAppTile(app) {
    const color = app.color || appColor(app.name);
    return `<a class="app-tile" style="--app-color:${escapeHtml(color)}" href="${appUrl(app)}" target="_self" rel="noreferrer" aria-label="Open ${escapeHtml(app.name)}">
      <span class="app-icon">${renderAppIcon(app, 'lg')}</span>
      <span class="app-label">${escapeHtml(app.name)}</span>
      <span class="app-note">${escapeHtml(app.note || '')}</span>
    </a>`;
  }

  function renderAppPanel(category, options = {}) {
    const apps = category.apps.slice(0, options.limit || category.apps.length);
    return `<section class="app-panel premium-card ${options.featured ? 'featured-panel' : ''}">
      <div class="app-panel-header"><div class="app-panel-title">${renderIcon(category.id, category.label, 'xs')}${escapeHtml(category.label)}</div>${options.featured ? '<span class="badge">Featured</span>' : ''}</div>
      <div class="app-grid ${options.compact ? 'compact-app-grid' : ''}">${apps.map(renderAppTile).join('')}</div>
    </section>`;
  }

  function renderHomePage() {
    return `<main class="dashboard-layout" aria-label="Dashboard home">
      ${renderClockCard()}
      <section class="main-stack">
        ${renderSearchHero()}
        ${renderBookmarkSlots()}
        <div class="triple-widgets">
          ${renderCurrencyCard()}
          ${renderPomodoro()}
          ${renderTasks()}
        </div>
      </section>
      <section class="side-stack">
        ${renderPetCard()}
        ${renderCalendar()}
      </section>
    </main>`;
  }

  function renderAppsPage() {
    const selected = categoryById(state.settings.appCategory);
    const secondaryA = state.settings.appCategory === 'tools' ? categoryById('daily') : categoryById('tools');
    const secondaryB = state.settings.appCategory === 'public' ? categoryById('google') : categoryById('public');
    return `<main class="apps-grid-page" aria-label="Apps library">
      ${renderTopTabs()}
      ${renderAppPanel(selected, { featured: true })}
      <div class="two-col-panels">
        ${renderAppPanel(secondaryA, { limit: 9 })}
        ${renderAppPanel(secondaryB, { limit: 8 })}
      </div>
    </main>`;
  }

  function renderExplorePage() {
    return `<main class="apps-grid-page explore-grid" aria-label="Notes, clocks, and notifications">
      <div class="two-col-panels">
        <section class="app-panel premium-card">
          <div class="app-panel-header"><div class="app-panel-title">${renderIcon('explore', 'World clocks', 'xs')}World clocks</div><span class="badge">Global teams</span></div>
          <div class="currency-list">${state.worldClocks.map((clock) => `<div class="currency-row"><span class="currency-flag">${renderIcon('explore', clock.city, 'xs')}</span><span class="currency-name">${escapeHtml(clock.city)}</span><strong class="currency-value">${escapeHtml(formatCityTime(clock.offset))}</strong><span></span></div>`).join('')}</div>
        </section>
        <section class="app-panel premium-card">
          <div class="app-panel-header"><div class="app-panel-title">${renderIcon('notes', 'Notes', 'xs')}Notes</div><button class="secondary-button" data-action="add-note" type="button">Add note</button></div>
          <div class="task-list">${state.notes.slice(0, 6).map((note) => `<div class="task-row"><div class="task-check">#</div><div class="task-copy"><div class="task-title">${escapeHtml(note.title)}</div><div class="task-meta">${escapeHtml(note.tag)} · ${escapeHtml(new Date(note.createdAt).toLocaleDateString())}</div></div><button class="mini-button row-action" data-action="delete-note" data-id="${escapeHtml(note.id)}" type="button">${renderIcon('close', 'Delete', 'xs')}</button></div>`).join('')}</div>
        </section>
      </div>
      <section class="app-panel premium-card">
        <div class="app-panel-header"><div class="app-panel-title">${renderIcon('notifications', 'Notifications', 'xs')}Notifications</div><button class="secondary-button" data-action="mark-read" type="button">Mark read</button></div>
        <div class="timeline-list">${state.notifications.slice(0, 8).map((notice) => `<div class="timeline-row ${notice.read ? 'read' : 'unread'}"><span class="timeline-dot"></span><div><div class="task-title">${escapeHtml(notice.title)}</div><div class="task-meta">${escapeHtml(notice.body)} · ${escapeHtml(new Date(notice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</div></div><button class="mini-button row-action" data-action="dismiss-notice" data-id="${escapeHtml(notice.id)}" type="button">${renderIcon('close', 'Delete', 'xs')}</button></div>`).join('')}</div>
      </section>
    </main>`;
  }

  function renderDock() {
    if (!state.settings.showDock) return '';
    const route = state.settings.route;
    return `<nav class="bottom-dock" aria-label="LiveDash navigation">
      <div class="dock-side">
        <button class="dock-button" data-action="login" type="button" aria-label="Account">${renderIcon('user', 'Account', 'xs')}</button>
        <button class="dock-button" data-action="open-apps-category" data-category="daily" type="button" aria-label="Daily essentials">${renderIcon('daily', 'Daily', 'xs')}</button>
        <button class="dock-button" data-action="settings" type="button" aria-label="Settings">${renderIcon('settings', 'Settings', 'xs')}</button>
        <button class="dock-button" data-action="toggle-dock" type="button" aria-label="Hide dock">${renderIcon('close', 'Hide', 'xs')}</button>
      </div>
      <div class="dock-center">
        <button class="dock-button ${route === 'apps' ? 'active' : ''}" data-route="apps" type="button" aria-label="App grid">${renderIcon('grid', 'Apps', 'xs')}</button>
        <button class="dock-button ${route === 'explore' ? 'active' : ''}" data-route="explore" type="button" aria-label="Explore">${renderIcon('explore', 'Explore', 'xs')}</button>
        <button class="dock-button ${route === 'home' ? 'active' : ''}" data-route="home" type="button" aria-label="Widgets home">${renderIcon('home', 'Home', 'xs')}</button>
      </div>
      <div class="brand-side"><span class="brand-text">LiveDash</span><span class="brand-mark">L</span></div>
    </nav>`;
  }

  function renderModal() {
    return `<div class="modal-backdrop ${loginOpen || bookmarkEditingId ? 'open' : ''}" data-action="close-modal"></div>
      ${loginOpen ? `<section class="modal-card" role="dialog" aria-modal="true" aria-label="Sign in">
        <div class="modal-head"><button class="icon-button" data-action="close-modal" type="button" aria-label="Close">${renderIcon('close', 'Close', 'xs')}</button><div class="modal-title">Sign in to LiveDash</div></div>
        <div class="auth-card">
          <div class="auth-title">Sign in or create account</div>
          <div class="auth-sub">Save favorites and dashboard preferences locally first.</div>
          <label><strong>Email address</strong><input id="authEmail" class="form-input" type="email" placeholder="you@example.com" aria-label="Email address"></label>
          <button class="primary-button" data-action="sign-in" type="button">Continue</button>
        </div>
        <div class="divider">or</div>
        <div class="auth-actions"><button class="secondary-button" data-action="google-sign-in" type="button">${renderIcon('google', 'Google', 'xs')} Continue with Google</button><button class="secondary-button" data-action="password-sign-in" type="button">${renderIcon('user', 'Password', 'xs')} Use password</button></div>
      </section>` : ''}
      ${bookmarkEditingId ? renderBookmarkModal() : ''}`;
  }

  function renderBookmarkModal() {
    const slot = state.bookmarkSlots.find((item) => item.id === bookmarkEditingId) || state.bookmarkSlots[0];
    return `<section class="modal-card" role="dialog" aria-modal="true" aria-label="Edit bookmark">
      <div class="modal-head"><button class="icon-button" data-action="close-modal" type="button" aria-label="Close">${renderIcon('close', 'Close', 'xs')}</button><div class="modal-title">Bookmark slot</div></div>
      <div class="auth-card">
        <label><strong>Name</strong><input id="bookmarkName" class="form-input" value="${escapeHtml(slot.label === 'Add site' ? '' : slot.label)}" placeholder="Example: Gmail" aria-label="Bookmark name"></label>
        <label><strong>URL</strong><input id="bookmarkUrl" class="form-input" value="${escapeHtml(slot.url || '')}" placeholder="https://example.com" aria-label="Bookmark URL"></label>
        <button class="primary-button" data-action="save-bookmark" type="button">Save slot</button>
      </div>
    </section>`;
  }

  function renderDrawer() {
    return `<div class="drawer-backdrop ${drawerOpen ? 'open' : ''}" data-action="close-drawer"></div>
      <aside class="drawer ${drawerOpen ? 'open' : ''}" aria-label="Settings drawer">
        <div class="modal-head"><div class="modal-title">Customize LiveDash</div><button class="icon-button" data-action="close-drawer" type="button" aria-label="Close settings">${renderIcon('close', 'Close', 'xs')}</button></div>
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
      ['home', 'Open widgets home', 'Dashboard widgets and cards', 'home'],
      ['apps', 'Open app library', 'Daily, tools, public services, Google, AI', 'grid'],
      ['explore', 'Open explore', 'Notes, clocks, notifications', 'explore'],
      ['add-task', 'Add task', 'Create a quick task', 'tasks'],
      ['add-note', 'Add note', 'Create a quick note', 'notes'],
      ['settings', 'Customize dashboard', 'Themes, search, backup', 'settings'],
      ['export', 'Export backup', 'Download local dashboard data', 'open'],
      ['login', 'Sign in', 'Local-first profile flow', 'user']
    ];
    return `<div class="command-backdrop ${commandOpen ? 'open' : ''}" data-action="close-command"></div>
      <section class="command-card ${commandOpen ? 'open' : ''}" role="dialog" aria-label="Command palette">
        <input id="commandInput" placeholder="Type a command, app, or website..." aria-label="Command search">
        <div class="command-list" id="commandList">
          ${commands.map(([action, title, sub, icon]) => `<button class="command-row" data-action="${escapeHtml(action)}" type="button"><span class="command-glyph">${renderIcon(icon, title, 'xs')}</span><span><span class="command-row-title">${escapeHtml(title)}</span><span class="command-row-sub">${escapeHtml(sub)}</span></span><span class="kbd">Enter</span></button>`).join('')}
        </div>
      </section>`;
  }

  function render() {
    setBodyTheme();
    const route = state.settings.route || 'home';
    root.innerHTML = `<div class="widgetify-shell route-${escapeHtml(route)}">
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
    const icon = inferIconKey(name, url);
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
