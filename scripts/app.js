(function () {
  const root = document.getElementById('app');
  let state = null;
  let timerId = null;
  let commandOpen = false;
  let settingsOpen = false;
  let accountOpen = false;
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

  const brand = {
    gmail: { label: 'Gmail', colors: ['#fff3f0', '#EA4335'], type: 'mail' },
    calendar: { label: 'Calendar', colors: ['#edf5ff', '#4285F4'], type: 'calendar' },
    drive: { label: 'Drive', colors: ['#eefbf4', '#0F9D58'], type: 'drive' },
    docs: { label: 'Docs', colors: ['#eef5ff', '#4285F4'], type: 'doc' },
    sheets: { label: 'Sheets', colors: ['#ecfbf2', '#0F9D58'], type: 'sheet' },
    slides: { label: 'Slides', colors: ['#fff7e8', '#F4B400'], type: 'slide' },
    maps: { label: 'Maps', colors: ['#ecfdf8', '#34A853'], type: 'pin' },
    meet: { label: 'Meet', colors: ['#edfdf7', '#00AC47'], type: 'video' },
    keep: { label: 'Keep', colors: ['#fff9dc', '#F4B400'], type: 'bulb' },
    news: { label: 'News', colors: ['#eef4ff', '#4285F4'], type: 'news' },
    photos: { label: 'Photos', colors: ['#fff0f8', '#DB4437'], type: 'flower' },
    chatgpt: { label: 'ChatGPT', colors: ['#ecfbf7', '#10A37F'], type: 'spark' },
    claude: { label: 'Claude', colors: ['#fff4e8', '#D97706'], type: 'claude' },
    perplexity: { label: 'Perplexity', colors: ['#e9fbff', '#20A8B8'], type: 'p' },
    gemini: { label: 'Gemini', colors: ['#f3efff', '#7C3AED'], type: 'diamond' },
    copilot: { label: 'Copilot', colors: ['#eef3ff', '#2563EB'], type: 'cloud' },
    notion: { label: 'Notion', colors: ['#f5f5f5', '#111111'], type: 'n' },
    todoist: { label: 'Todoist', colors: ['#fff3ef', '#E44332'], type: 'check' },
    slack: { label: 'Slack', colors: ['#f6f0ff', '#611F69'], type: 'hash' },
    zoom: { label: 'Zoom', colors: ['#edf4ff', '#2D8CFF'], type: 'video' },
    dropbox: { label: 'Dropbox', colors: ['#eef5ff', '#0061FF'], type: 'box' },
    outlook: { label: 'Outlook', colors: ['#eef5ff', '#0078D4'], type: 'mail' },
    github: { label: 'GitHub', colors: ['#f3f4f6', '#111827'], type: 'github' },
    figma: { label: 'Figma', colors: ['#fff0f5', '#A259FF'], type: 'figma' },
    canva: { label: 'Canva', colors: ['#ecfbff', '#00C4CC'], type: 'c' },
    spotify: { label: 'Spotify', colors: ['#ecfbf1', '#1DB954'], type: 'waves' },
    youtube: { label: 'YouTube', colors: ['#fff0f0', '#FF0000'], type: 'play' },
    wikipedia: { label: 'Wikipedia', colors: ['#f4f5f7', '#111827'], type: 'w' },
    trello: { label: 'Trello', colors: ['#edf5ff', '#0079BF'], type: 'columns' },
    miro: { label: 'Miro', colors: ['#fff9dd', '#FFD02F'], type: 'm' },
    loom: { label: 'Loom', colors: ['#f5efff', '#625DF5'], type: 'star' },
    tinypng: { label: 'TinyPNG', colors: ['#fbfff0', '#8BC34A'], type: 'panda' },
    cloudconvert: { label: 'CloudConvert', colors: ['#eef7ff', '#2563EB'], type: 'cloud' },
    removebg: { label: 'Remove.bg', colors: ['#fff1f5', '#EC4899'], type: 'cut' },
    unsplash: { label: 'Unsplash', colors: ['#f4f5f7', '#111827'], type: 'u' },
    translate: { label: 'Translate', colors: ['#eef5ff', '#4285F4'], type: 'translate' },
    speedtest: { label: 'Speedtest', colors: ['#fff4eb', '#F97316'], type: 'gauge' },
    archive: { label: 'Archive', colors: ['#f7f1e7', '#8B5E3C'], type: 'archive' },
    irs: { label: 'IRS', colors: ['#eef5ff', '#1D4ED8'], type: 'bank' },
    usps: { label: 'USPS', colors: ['#fff8e8', '#004B93'], type: 'mail' },
    govuk: { label: 'GOV.UK', colors: ['#f4f7fa', '#1D70B8'], type: 'crown' },
    eup: { label: 'EU Portal', colors: ['#eef0ff', '#003399'], type: 'stars' },
    nhs: { label: 'NHS', colors: ['#eef5ff', '#005EB8'], type: 'nhs' },
    dhl: { label: 'DHL', colors: ['#fff8e1', '#D40511'], type: 'truck' },
    royalmail: { label: 'Royal Mail', colors: ['#fff2f2', '#DA202A'], type: 'crownmail' },
    ups: { label: 'UPS', colors: ['#f8f2ea', '#351C15'], type: 'shield' },
    booking: { label: 'Booking', colors: ['#edf5ff', '#003B95'], type: 'b' },
    airbnb: { label: 'Airbnb', colors: ['#fff0f4', '#FF385C'], type: 'airbnb' },
    uber: { label: 'Uber', colors: ['#f3f4f6', '#111827'], type: 'u' },
    wise: { label: 'Wise', colors: ['#ecfff5', '#00B67A'], type: 'wise' },
    revolut: { label: 'Revolut', colors: ['#eef5ff', '#2563EB'], type: 'r' },
    finance: { label: 'Finance', colors: ['#ecfbf4', '#22C55E'], type: 'chart' },
    currency: { label: 'Currency', colors: ['#fff7ed', '#F59E0B'], type: 'dollar' },
    facebook: { label: 'Facebook', colors: ['#eef3ff', '#1877F2'], type: 'f' },
    instagram: { label: 'Instagram', colors: ['#fff0fa', '#E1306C'], type: 'camera' },
    x: { label: 'X', colors: ['#f3f4f6', '#111827'], type: 'x' },
    reddit: { label: 'Reddit', colors: ['#fff3ef', '#FF4500'], type: 'reddit' },
    discord: { label: 'Discord', colors: ['#eef0ff', '#5865F2'], type: 'discord' },
    whatsapp: { label: 'WhatsApp', colors: ['#ecfbf1', '#25D366'], type: 'phone' },
    telegram: { label: 'Telegram', colors: ['#eef8ff', '#229ED9'], type: 'paperplane' },
    pinterest: { label: 'Pinterest', colors: ['#fff1f2', '#E60023'], type: 'p' },
    live: { label: 'LiveDash', colors: ['#eef3ff', '#536DFE'], type: 'spark' },
    add: { label: 'Add', colors: ['#f4f7fb', '#64748B'], type: 'plus' },
    search: { label: 'Search', colors: ['#eef8ff', '#2991FF'], type: 'search' },
    settings: { label: 'Settings', colors: ['#f4f7fb', '#64748B'], type: 'gear' },
    tasks: { label: 'Tasks', colors: ['#eef5ff', '#536DFE'], type: 'check' },
    notes: { label: 'Notes', colors: ['#fff9e8', '#F59E0B'], type: 'note' },
    focus: { label: 'Focus', colors: ['#eef0ff', '#536DFE'], type: 'target' },
    home: { label: 'Home', colors: ['#eef0ff', '#536DFE'], type: 'home' },
    apps: { label: 'Apps', colors: ['#eef0ff', '#536DFE'], type: 'grid' },
    explore: { label: 'Explore', colors: ['#eefcf6', '#0EA5E9'], type: 'compass' },
    user: { label: 'Account', colors: ['#f4f7fb', '#64748B'], type: 'user' },
    close: { label: 'Close', colors: ['#f4f7fb', '#64748B'], type: 'xmark' },
    refresh: { label: 'Refresh', colors: ['#f4f7fb', '#64748B'], type: 'refresh' },
    daily: { label: 'Daily', colors: ['#eef0ff', '#536DFE'], type: 'star' },
    public: { label: 'Public', colors: ['#f3f5fa', '#4B5565'], type: 'bank' },
    tools: { label: 'Tools', colors: ['#eef7ff', '#2C82FF'], type: 'tool' },
    google: { label: 'Google', colors: ['#eef8ff', '#4285F4'], type: 'g' },
    ai: { label: 'AI', colors: ['#f5efff', '#7B61FF'], type: 'spark' },
    travel: { label: 'Travel', colors: ['#fff6e8', '#FF9F1A'], type: 'plane' },
    social: { label: 'Social', colors: ['#eef3ff', '#4F7CFF'], type: 'chat' }
  };

  const aliases = {
    'google calendar': 'calendar', calendar: 'calendar', gmail: 'gmail', mail: 'gmail', 'google drive': 'drive', drive: 'drive', docs: 'docs', 'google docs': 'docs', sheets: 'sheets', slides: 'slides', maps: 'maps', meet: 'meet', keep: 'keep', news: 'news', photos: 'photos',
    'microsoft to do': 'todoist', todoist: 'todoist', chatgpt: 'chatgpt', claude: 'claude', perplexity: 'perplexity', gemini: 'gemini', copilot: 'copilot', notion: 'notion', github: 'github', figma: 'figma', canva: 'canva', youtube: 'youtube', spotify: 'spotify', wikipedia: 'wikipedia', trello: 'trello', miro: 'miro', loom: 'loom', tinypng: 'tinypng', 'cloudconvert': 'cloudconvert', 'removebg': 'removebg', 'remove.bg': 'removebg', unsplash: 'unsplash', 'google translate': 'translate', speedtest: 'speedtest', 'archive.org': 'archive',
    'royal mail': 'royalmail', royalmail: 'royalmail', 'gov.uk': 'govuk', nhs: 'nhs', dhl: 'dhl', ups: 'ups', irs: 'irs', usps: 'usps', 'eu portal': 'eup', booking: 'booking', 'booking.com': 'booking', airbnb: 'airbnb', uber: 'uber', wise: 'wise', revolut: 'revolut', 'yahoo finance': 'finance', 'xe currency': 'currency', facebook: 'facebook', instagram: 'instagram', x: 'x', reddit: 'reddit', discord: 'discord', whatsapp: 'whatsapp', telegram: 'telegram', pinterest: 'pinterest'
  };

  function backendConfig() { return window.LiveDashBackendConfig || { enabled: false, apiBaseUrl: '' }; }
  function backendUrl(path) {
    const base = String(backendConfig().apiBaseUrl || '').replace(/\/$/, '');
    const suffix = String(path || '').startsWith('/') ? path : `/${path}`;
    return base ? `${base}${suffix}` : '';
  }
  function backendHeaders() {
    return { 'Content-Type': 'application/json', ...(state?.profile?.authToken ? { Authorization: `Bearer ${state.profile.authToken}` } : {}) };
  }

  function normalizeKey(value) {
    return String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9.]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  function host(url) {
    try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return ''; }
  }
  function keyFor(label = '', url = '') {
    const h = host(url);
    const byHost = {
      'mail.google.com': 'gmail', 'calendar.google.com': 'calendar', 'drive.google.com': 'drive', 'docs.google.com': 'docs', 'sheets.google.com': 'sheets', 'slides.google.com': 'slides', 'maps.google.com': 'maps', 'meet.google.com': 'meet', 'keep.google.com': 'keep', 'news.google.com': 'news', 'photos.google.com': 'photos', 'translate.google.com': 'translate',
      'chat.openai.com': 'chatgpt', 'claude.ai': 'claude', 'perplexity.ai': 'perplexity', 'gemini.google.com': 'gemini', 'copilot.microsoft.com': 'copilot', 'github.com': 'github', 'figma.com': 'figma', 'notion.so': 'notion', 'youtube.com': 'youtube', 'open.spotify.com': 'spotify', 'wikipedia.org': 'wikipedia', 'trello.com': 'trello', 'miro.com': 'miro', 'loom.com': 'loom', 'tinypng.com': 'tinypng', 'cloudconvert.com': 'cloudconvert', 'remove.bg': 'removebg', 'unsplash.com': 'unsplash', 'speedtest.net': 'speedtest', 'archive.org': 'archive',
      'royalmail.com': 'royalmail', 'gov.uk': 'govuk', 'nhs.uk': 'nhs', 'dhl.com': 'dhl', 'ups.com': 'ups', 'irs.gov': 'irs', 'usps.com': 'usps', 'european-union.europa.eu': 'eup', 'booking.com': 'booking', 'airbnb.com': 'airbnb', 'uber.com': 'uber', 'wise.com': 'wise', 'revolut.com': 'revolut', 'finance.yahoo.com': 'finance', 'xe.com': 'currency', 'facebook.com': 'facebook', 'instagram.com': 'instagram', 'x.com': 'x', 'reddit.com': 'reddit', 'discord.com': 'discord', 'web.whatsapp.com': 'whatsapp', 'web.telegram.org': 'telegram', 'pinterest.com': 'pinterest'
    };
    if (byHost[h]) return byHost[h];
    return aliases[normalizeKey(label)] || normalizeKey(label).replace(/\s+/g, '') || 'live';
  }

  function svg(type) {
    const s = {
      mail: '<path d="M4 7.5 12 13l8-5.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" fill="currentColor" opacity=".18"/><path d="M4.5 7 12 12.4 19.5 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 18V7h14v11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      calendar: '<rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3.8v4M16 3.8v4M4 9.5h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="7" y="12" width="3" height="3" rx="1" fill="currentColor"/><rect x="11" y="12" width="3" height="3" rx="1" fill="currentColor" opacity=".55"/>',
      drive: '<path d="M8.1 4h3.8l4.1 7-1.9 3.2H10.3L8.1 10 10 6.8 8.1 4z" fill="#16a765"/><path d="M10.1 6.8H14L18.2 14h-3.8L10.1 6.8z" fill="#fbbc04"/><path d="M5.8 14h8.3l-2.2 3.8H3.7L5.8 14z" fill="#4285f4"/>',
      doc: '<path d="M8 4h6l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v4h4M10 12h6M10 15h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      sheet: '<path d="M8 4h6l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v4h4M10 12h6M10 15h6M12.5 10v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      slide: '<path d="M8 4h6l4 4v12H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v4h4" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="11" width="6" height="4" rx="1" fill="currentColor" opacity=".75"/>',
      pin: '<path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.2" fill="currentColor"/>',
      video: '<rect x="5" y="7" width="9.5" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14.5 10.2 19 8.6v6.8l-4.5-1.6v-3.6z" fill="currentColor"/>',
      bulb: '<path d="M12 4a5 5 0 0 1 5 5c0 2-1 3.2-2.2 4.3V16H9.2v-2.7C8 12.2 7 11 7 9a5 5 0 0 1 5-5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 19h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      news: '<rect x="5" y="6" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7.5" y="8.5" width="4" height="4" rx="1" fill="currentColor" opacity=".25"/><path d="M13 9h4M13 12h4M7.5 15h9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      flower: '<circle cx="12" cy="7.5" r="2" fill="currentColor"/><circle cx="16.5" cy="12" r="2" fill="currentColor" opacity=".75"/><circle cx="12" cy="16.5" r="2" fill="currentColor" opacity=".6"/><circle cx="7.5" cy="12" r="2" fill="currentColor" opacity=".45"/>',
      spark: '<path d="M12 4.5 14 10l5.5 2-5.5 2L12 19.5 10 14 4.5 12 10 10 12 4.5Z" fill="currentColor"/>',
      claude: '<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>',
      p: '<path d="M8 6h5.5A4.5 4.5 0 1 1 13.5 15H10v3H8V6Zm2 2v5h3.5a2.5 2.5 0 1 0 0-5H10Z" fill="currentColor"/>',
      diamond: '<path d="M12 4.5 19 12l-7 7.5L5 12l7-7.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5 16 12l-4 4.5L8 12l4-4.5Z" fill="currentColor"/>',
      cloud: '<path d="M8.5 17h7a3.5 3.5 0 0 0 .5-7 4.5 4.5 0 0 0-8.7 1.2A3 3 0 0 0 8.5 17Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      n: '<path d="M7 17V7h2.2l5.3 6.7V7H17v10h-2.1L9.6 10.2V17H7Z" fill="currentColor"/>',
      check: '<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 12 2.4 2.4 5-5.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      hash: '<path d="M9 5 7.5 19M16.5 5 15 19M6 9h13M5 15h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      box: '<path d="M7.2 5 12 8.3 7.2 11.5 2.5 8.3 7.2 5Zm9.6 0 4.7 3.3-4.7 3.2L12 8.3 16.8 5ZM7.2 13 12 16.2 16.8 13v3.3L12 19.5l-4.8-3.2V13Z" fill="currentColor"/>',
      github: '<path d="M12 4a8 8 0 0 0-2.5 15.6v-2.7c-2.1.5-2.6-.9-2.6-.9-.3-.9-.8-1.1-.8-1.1-.7-.5.1-.5.1-.5.8.1 1.2.9 1.2.9.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.7-.2-3.4-.8-3.4-3.7 0-.8.3-1.5.8-2.1-.1-.2-.3-1 .1-2.1 0 0 .7-.2 2.3.8a8 8 0 0 1 4.2 0c1.6-1 2.3-.8 2.3-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 2.9-1.7 3.5-3.4 3.7.3.2.5.7.5 1.5v3.2A8 8 0 0 0 12 4Z" fill="currentColor"/>',
      figma: '<path d="M10.5 4a2.5 2.5 0 1 1 0 5H8a2.5 2.5 0 0 1 0-5h2.5Zm0 5a2.5 2.5 0 1 1 0 5H8a2.5 2.5 0 0 1 0-5h2.5Zm2.5-5h2.5a2.5 2.5 0 0 1 0 5H13V4Zm0 5h2.5a2.5 2.5 0 1 1-2.5 2.5V9Zm-2.5 5v2.5A2.5 2.5 0 1 1 8 14h2.5Z" fill="currentColor"/>',
      c: '<path d="M16.5 8.8a5.5 5.5 0 1 0 0 6.4l-1.7-1.3a3.3 3.3 0 1 1 0-4l1.7-1.1Z" fill="currentColor"/>',
      waves: '<path d="M7 10c3.5-1 7.2-.7 10.2.6M7.7 13c2.7-.7 5.6-.5 7.9.5M8.5 16c2-.4 4-.3 5.7.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      play: '<path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor"/>',
      w: '<path d="M5.5 8h2l2 6 2-6h1.7l2 6 2-6h1.8l-3 8h-1.7l-2-5.8L10.2 16H8.5l-3-8Z" fill="currentColor"/>',
      columns: '<rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7.5" y="8" width="3.5" height="8" rx="1" fill="currentColor"/><rect x="13" y="8" width="3.5" height="5" rx="1" fill="currentColor" opacity=".65"/>',
      m: '<path d="M6.5 17V7h2.2l3.3 5.2L15.3 7h2.2v10h-2.3v-6l-2.8 4.3h-.8L8.8 11v6H6.5Z" fill="currentColor"/>',
      star: '<path d="m12 5.2 1.8 4 4.3.5-3.2 2.9.9 4.2-3.8-2.2-3.8 2.2.9-4.2-3.2-2.9 4.3-.5 1.8-4Z" fill="currentColor"/>',
      panda: '<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9.8" cy="11.5" r="1" fill="currentColor"/><circle cx="14.2" cy="11.5" r="1" fill="currentColor"/><path d="M10.5 15c.8.5 2.2.5 3 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      cut: '<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      translate: '<path d="M6 8h8M10 8c0 4-1.8 6.7-4 8.5M8.2 12.5c1.4 1.5 3 2.6 5 3.2M13.5 17l3.5-8h1.2l3.3 8M15 14h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      gauge: '<path d="M5.5 15a6.5 6.5 0 1 1 13 0" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m12 12 4-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="15" r="1.3" fill="currentColor"/>',
      archive: '<path d="M5 8h14v10H5V8Zm-1-3h16v3H4V5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 12h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      bank: '<path d="M4 9h16L12 4 4 9Zm2 2h2v6H6v-6Zm5 0h2v6h-2v-6Zm5 0h2v6h-2v-6ZM4 19h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      crown: '<path d="m5 10 3.5 3 3.5-6 3.5 6L19 10v7H5v-7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
      stars: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m12 7 1 2.2 2.4.3-1.7 1.6.4 2.4-2.1-1.2-2.1 1.2.4-2.4-1.7-1.6 2.4-.3L12 7Z" fill="currentColor"/>',
      nhs: '<path d="M6 16V8h2.1l2.2 3.6V8h2v8h-2.1L8 12.3V16H6Zm7.5 0V8h2v3h2.5V8h2v8h-2v-3h-2.5v3h-2Z" fill="currentColor"/>',
      truck: '<path d="M4 10h10v6H4v-6Zm10 2h3l2 2v2h-5v-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="17" r="1.2" fill="currentColor"/><circle cx="17" cy="17" r="1.2" fill="currentColor"/>',
      crownmail: '<path d="M6 9.5 9 12l3-5 3 5 3-2.5V15H6V9.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.5 17.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      shield: '<path d="M12 4.5 18 7v4.5c0 3.4-2.4 6.3-6 7.9-3.6-1.6-6-4.5-6-7.9V7l6-2.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      b: '<path d="M8 5h5.2a3.4 3.4 0 0 1 .4 6.8H8V5Zm2.2 2v3h2.7a1.5 1.5 0 1 0 0-3h-2.7Zm-2.2 6h5.8a3 3 0 1 1 0 6H8v-6Zm2.2 2v2h3.2a1 1 0 1 0 0-2h-3.2Z" fill="currentColor"/>',
      airbnb: '<path d="M12 6.5c1.3 0 2.1.9 2.8 2.1l2.6 5c.7 1.5-.4 3-2 3-1 0-1.9-.6-2.7-1.9-.8 1.3-1.7 1.9-2.7 1.9-1.6 0-2.7-1.5-2-3l2.6-5c.7-1.2 1.5-2.1 2.8-2.1Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      u: '<path d="M7 7h2v6a3 3 0 1 0 6 0V7h2v6a5 5 0 1 1-10 0V7Z" fill="currentColor"/>',
      wise: '<path d="M7 8.5 15 6l-4.5 10 6.5-2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      r: '<path d="M8 7h6a3 3 0 1 1 0 6h-2l4 4h-3l-5-5V7Zm2 2v2h3.5a1 1 0 1 0 0-2H10Z" fill="currentColor"/>',
      chart: '<path d="M6 16.5 10 12l2.5 2.5L18 8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 8.5V13h-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      dollar: '<path d="M14.5 6.5H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H9.5M12 5v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      f: '<path d="M13.5 20v-6.5h2.2l.4-2.8h-2.6V9c0-.8.3-1.3 1.5-1.3h1.2V5.2c-.3 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.5v2.1H8.8v2.8H11V20h2.5Z" fill="currentColor"/>',
      camera: '<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="8" r="1" fill="currentColor"/>',
      x: '<path d="M6.5 6h3l2.7 3.8L15.5 6H18l-4.5 5.6L18.2 18h-3l-3-4.2L8.7 18H6.2l4.7-6.1L6.5 6Z" fill="currentColor"/>',
      reddit: '<circle cx="9.2" cy="12" r="1" fill="currentColor"/><circle cx="14.8" cy="12" r="1" fill="currentColor"/><path d="M8.2 14c1 .8 2.2 1.2 3.8 1.2s2.8-.4 3.8-1.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.7"/>',
      discord: '<path d="M8.2 8.5a13 13 0 0 1 7.6 0c.7 1.1 1.2 2.3 1.5 3.8-.9.7-1.8 1.2-2.8 1.5l-.6-1a9 9 0 0 1-3.8 0l-.6 1a8.4 8.4 0 0 1-2.8-1.5c.3-1.5.8-2.7 1.5-3.8Zm2.1 3.7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3.4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>',
      phone: '<path d="M8.8 5.5 10 8.8l-1.4 1.4c.8 1.8 2.3 3.3 4.1 4.1l1.5-1.4 3.3 1.2-.4 2.6c-.1.8-.8 1.3-1.6 1.2-5.3-.7-9.6-5-10.3-10.3-.1-.8.4-1.5 1.2-1.6l2.4-.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
      paperplane: '<path d="m5 11.2 12.8-5c.8-.3 1.6.4 1.4 1.2l-2.1 10.2c-.2.8-1.1 1.2-1.7.8l-3.3-2.4-1.9 1.8c-.5.4-1.2.1-1.2-.6v-2.7l6.2-5.8-7.8 5-2.5-.8c-.9-.3-.9-1.5.1-1.9Z" fill="currentColor"/>',
      search: '<circle cx="11" cy="11" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15 15 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      gear: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4v2M12 18v2M20 12h-2M6 12H4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      target: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
      note: '<path d="M7 4h8l4 4v12H7V4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 4v4h4M10 12h5M10 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      home: '<path d="M5.2 10.8 12 5l6.8 5.8V19H5.2v-8.2Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 19v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      grid: '<path d="M5.5 5.5h5v5h-5v-5Zm8 0h5v5h-5v-5Zm-8 8h5v5h-5v-5Zm8 0h5v5h-5v-5Z" fill="currentColor"/>',
      compass: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m14.8 9.2-2 5.6-3.6 1.2 2-5.6 3.6-1.2Z" fill="currentColor"/>',
      user: '<circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 18c1.1-2.7 3.1-4 5.5-4s4.4 1.3 5.5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      xmark: '<path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
      refresh: '<path d="M17 11a5 5 0 1 0 1 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 7v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      plus: '<path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
      plane: '<path d="M3 13.2 11 11V7.2l-2-1V4.8l3 1 3-1v1.4l-2 1V11l8 2.2v1.6l-8-1.2v3l2 1.4v1.4L12 18l-5 1.2v-1.4l2-1.4v-3l-6 1.2v-1.4Z" fill="currentColor"/>',
      tool: '<path d="M15.5 4a4 4 0 0 0 4.5 4.5l-7.1 7.1-3-3L17 5.5A4 4 0 0 0 15.5 4ZM5 16l3 3 2.2-2.2-3-3L5 16Z" fill="currentColor"/>',
      chat: '<path d="M6 6h12a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-4.5L9 19v-3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      g: '<path d="M12 4a8 8 0 1 0 0 16c4 0 7-2.7 7-6.6 0-.4 0-.8-.1-1.2H12v2.8h4c-.4 1.8-1.9 3.2-4 3.2a4.8 4.8 0 0 1 0-9.6c1.3 0 2.2.5 3 1.2l2.1-2.1A7.8 7.8 0 0 0 12 4Z" fill="currentColor"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${s[type] || s.spark}</svg>`;
  }

  function icon(key, size = 'md', label = '') {
    const item = brand[key] || brand[keyFor(label, '')] || brand.live;
    return `<span class="brand-icon brand-icon-${size}" style="--icon-bg:${item.colors[0]};--icon-fg:${item.colors[1]}" aria-hidden="true">${svg(item.type)}<span class="brand-letter">${escapeHtml((label || item.label || 'L').slice(0, 2).toUpperCase())}</span></span>`;
  }

  function appIcon(app, size = 'app') {
    return icon(keyFor(app?.name || app?.label || '', app?.url || ''), size, app?.name || app?.label || 'App');
  }

  function formatTime(date = now()) {
    return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', { hour: '2-digit', minute: '2-digit', hour12: state?.profile?.timeFormat !== '24h' }).format(date);
  }
  function shortDate(date = now()) { return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date); }
  function timeParts() { const clean = formatTime().replace(/\s?(AM|PM)$/i, ''); const [h = '00', m = '00'] = clean.split(':'); return { h, m }; }
  function cityTime(offset) { return new Intl.DateTimeFormat(state?.profile?.locale || 'en-US', { hour: '2-digit', minute: '2-digit', hour12: state?.profile?.timeFormat !== '24h' }).format(new Date(Date.now() + Number(offset || 0) * 3600000)); }
  function profileInitials() { const value = state?.profile?.name || state?.profile?.email || 'LD'; return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'LD'; }
  function signedIn() { return Boolean(state?.profile?.signedIn || state?.profile?.authToken); }

  function toast(message) {
    let wrap = $('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; wrap.appendChild(el); setTimeout(() => el.remove(), 2800);
  }
  function activity(title, body) { state.activity = [{ id: uid('activity'), title, body, createdAt: new Date().toISOString() }, ...(state.activity || [])].slice(0, 40); }
  function notice(title, body, type = 'info') { state.notifications = [{ id: uid('notice'), title, body, type, read: false, createdAt: new Date().toISOString() }, ...(state.notifications || [])].slice(0, 25); }

  async function save() {
    state = await window.LiveDashStore.setState(state);
    if (state?.profile?.authToken) scheduleSync('state-update');
  }
  let syncTimer = null;
  function scheduleSync(reason) { if (syncTimer) clearTimeout(syncTimer); syncTimer = setTimeout(() => syncCloud(reason), 1000); }
  async function syncCloud(reason = 'manual') {
    if (!state?.profile?.authToken || !backendConfig().enabled) return;
    try {
      await fetch(backendUrl(backendConfig().syncPath || '/api/livedash/sync.php'), { method: 'POST', headers: backendHeaders(), body: JSON.stringify({ reason, schema: state.schemaVersion, state }) });
      state.profile.lastCloudSyncAt = new Date().toISOString();
      await window.LiveDashStore.setState(state);
    } catch (error) {
      state.profile.lastCloudSyncError = error.message || 'Cloud sync failed';
      await window.LiveDashStore.setState(state);
    }
  }
  function mergeCloud(localState, cloudState) {
    if (!cloudState || typeof cloudState !== 'object') return localState;
    const profile = { ...(localState.profile || {}) };
    return { ...localState, ...cloudState, profile: { ...(cloudState.profile || {}), ...profile } };
  }
  async function hydrateCloud(reason = 'refresh') {
    if (!state?.profile?.authToken || !backendConfig().enabled) return false;
    try {
      const res = await fetch(backendUrl(backendConfig().mePath || '/api/me.php'), { headers: backendHeaders() });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || 'Cloud profile unavailable');
      if (payload.state) state = mergeCloud(state, payload.state);
      state.profile = {
        ...(state.profile || {}),
        signedIn: true,
        backendConnected: true,
        cloudLoaded: true,
        email: payload.user?.email || state.profile.email || '',
        name: payload.user?.displayName || state.profile.name || payload.user?.email?.split('@')[0] || 'LiveDash user',
        avatarUrl: payload.user?.avatarUrl || payload.user?.picture || state.profile.avatarUrl || '',
        plan: payload.user?.plan || 'Cloud',
        lastCloudReason: reason,
        lastCloudSyncAt: payload.stateUpdatedAt || new Date().toISOString()
      };
      await window.LiveDashStore.setState(state);
      return true;
    } catch (error) {
      state.profile.lastCloudSyncError = error.message || 'Cloud load failed';
      await window.LiveDashStore.setState(state);
      return false;
    }
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
    return `<header class="profile-bar">
      <button class="brand-chip" data-route="home" type="button">${icon('live','sm')}<strong>LiveDash</strong></button>
      <div class="profile-status ${signed ? 'signed' : 'local'}"><span></span>${signed ? 'Cloud profile active' : 'Local dashboard'}</div>
      <button class="profile-pill ${signed ? 'signed' : 'local'}" data-action="account" type="button" aria-label="${signed ? 'Open profile' : 'Sign in'}">${avatar}<span><strong>${escapeHtml(signed ? (state.profile.name || state.profile.email?.split('@')[0] || 'Profile') : 'Sign in')}</strong><small>${escapeHtml(signed ? (state.profile.email || 'Cloud synced') : 'Google sync')}</small></span></button>
    </header>`;
  }
  function renderTabs() {
    return `<nav class="top-tabs" aria-label="Categories">${(state.categories || []).map((c) => `<button class="top-tab ${state.settings.appCategory === c.id ? 'active' : ''}" data-action="category" data-category="${escapeHtml(c.id)}" type="button">${icon(c.id, 'xs')}<span>${escapeHtml(c.label)}</span></button>`).join('')}</nav>`;
  }
  function renderClock() {
    const p = timeParts();
    return `<section class="widget-card clock-card"><div class="time-tile"><span>${escapeHtml(p.h)}</span><span>${escapeHtml(p.m)}</span></div><div class="date-card"><strong>${escapeHtml(shortDate())}</strong><span>${escapeHtml(state.weather.city)} · ${escapeHtml(state.weather.summary)} · ${escapeHtml(state.weather.tempC)}°C</span></div><button class="mini-link" data-action="open-url" data-url="https://weather.com">${icon('weather','xs')}Weather</button></section>`;
  }
  function renderRates() {
    return `<section class="widget-card rates-card"><div class="card-title-row"><div><strong>Rates</strong><span>Base ${escapeHtml(state.settings.currencyBase || 'USD')}</span></div><button data-action="refresh" class="soft-icon" type="button">${icon('refresh','xs')}</button></div><div class="rates-list">${state.currency.map((c) => `<div><span>${escapeHtml(c.code)}</span><strong>${escapeHtml(c.value)}</strong><em>${c.delta === 'flat' ? '→' : '↑'}</em></div>`).join('')}</div></section>`;
  }
  function renderSearch() {
    return `<section class="search-card"><div class="search-input-wrap">${icon('search','xs')}<input id="mainSearch" type="search" placeholder="Search Google or open a LiveDash command" autocomplete="off"><button data-action="command" type="button">⌘K</button></div><div class="quick-chips">${[
      {name:'Gmail',url:'https://mail.google.com'}, {name:'Calendar',url:'https://calendar.google.com'}, {name:'ChatGPT',url:'https://chat.openai.com'}, {name:'Drive',url:'https://drive.google.com'}
    ].map((a) => `<button data-action="open-url" data-url="${escapeHtml(a.url)}" type="button">${appIcon(a,'xs')}<span>${escapeHtml(a.name)}</span></button>`).join('')}</div></section>`;
  }
  function renderBookmarks() {
    return `<section class="bookmark-grid">${(state.bookmarkSlots || []).map((slot) => {
      const full = Boolean(slot.url);
      return `<button class="bookmark-slot ${full ? '' : 'empty'}" data-action="${full ? 'open-bookmark' : 'edit-bookmark'}" data-id="${escapeHtml(slot.id)}" type="button"><span class="bookmark-icon">${full ? appIcon(slot, 'bookmark') : icon('add','bookmark')}</span><span class="bookmark-label">${escapeHtml(full ? slot.label : 'Add site')}</span><span class="bookmark-host">${escapeHtml(full ? host(slot.url) : 'Create shortcut')}</span><i></i></button>`;
    }).join('')}</section>`;
  }
  function renderPet() {
    const pet = state.pet || {};
    const mode = pet.mode || 'idle';
    const sprite = mode === 'play' ? 'assets/widgetify/animals/dog/akita_with_ball_8fps.gif' : mode === 'feed' ? 'assets/widgetify/animals/dog/akita_swipe_8fps.gif' : mode === 'rest' ? 'assets/widgetify/animals/dog/akita_lie_8fps.gif' : 'assets/widgetify/animals/dog/akita_idle_8fps.gif';
    const energy = Math.max(0, Math.min(100, Number(pet.energy || 70)));
    return `<section class="widget-card pet-card"><div class="card-title-row"><div><strong>Akita</strong><span>${escapeHtml(pet.mood || 'Ready')} · ${escapeHtml(String(pet.score || 0))} score</span></div><span class="pill">${signedIn() ? 'Cloud saved' : 'Local'}</span></div><button class="akita-stage ${escapeHtml(mode)}" data-action="pet-play" type="button"><img src="${sprite}" alt="Akita"><span class="akita-bubble">${mode === 'play' ? 'Nice throw.' : mode === 'feed' ? 'Thanks.' : mode === 'rest' ? 'Resting.' : 'Tap to play.'}</span></button><div class="energy-bar"><span style="width:${energy}%"></span></div><div class="pet-actions"><button data-action="pet-feed" type="button">Feed</button><button data-action="pet-play" type="button">Play</button><button data-action="pet-rest" type="button">Rest</button></div></section>`;
  }
  function renderTasks() {
    const tasks = (state.tasks || []).filter((t) => activeTaskFilter === 'all' ? true : activeTaskFilter === 'done' ? t.status === 'done' : t.status !== 'done').slice(0, 8);
    return `<section class="widget-card task-card"><div class="task-head"><div><strong>Tasks</strong><span>${(state.tasks || []).filter((t) => t.status !== 'done').length} open today</span></div><button data-action="add-task" type="button">New</button></div><div class="task-filters"><button class="${activeTaskFilter==='open'?'active':''}" data-action="task-filter" data-filter="open">Open</button><button class="${activeTaskFilter==='all'?'active':''}" data-action="task-filter" data-filter="all">All</button><button class="${activeTaskFilter==='done'?'active':''}" data-action="task-filter" data-filter="done">Done</button></div><div class="task-list">${tasks.length ? tasks.map((task) => `<article class="task-item priority-${escapeHtml(task.priority || 'medium')}"><button class="task-check" data-action="complete-task" data-id="${escapeHtml(task.id)}" type="button">${task.status === 'done' ? '✓' : ''}</button><div><strong>${escapeHtml(task.title)}</strong><span><b>${escapeHtml(task.priority || 'medium')}</b>${task.due ? ` · ${escapeHtml(new Date(task.due).toLocaleDateString([], {month:'short', day:'numeric'}))}` : ' · Today'} · ${escapeHtml(task.source || 'LiveDash')}</span></div><button class="task-delete" data-action="delete-task" data-id="${escapeHtml(task.id)}" type="button">×</button></article>`).join('') : '<div class="empty-state">No tasks here.</div>'}</div><div class="task-compose"><button data-action="add-task-input" type="button">+</button><input id="taskInput" placeholder="Add a task and press Enter"></div></section>`;
  }
  function renderFocus() {
    const total = (state.settings.focusMinutes || 25) * 60;
    const remaining = state.focus.remaining || total;
    const m = Math.floor(remaining / 60).toString().padStart(2,'0');
    const s = (remaining % 60).toString().padStart(2,'0');
    const deg = Math.max(0, Math.min(360, 360 - (remaining / total) * 360));
    return `<section class="widget-card focus-card"><div class="card-title-row"><div><strong>Focus</strong><span>${state.focus.running ? 'In progress' : 'Ready'}</span></div><span class="pill">${escapeHtml(state.focus.mode || 'work')}</span></div><div class="pomo-ring" style="--deg:${deg}deg"><strong>${m}:${s}</strong><span>${state.focus.running ? 'Running' : 'Start session'}</span></div><div class="pet-actions"><button data-action="pomo-reset">Reset</button><button class="primary" data-action="pomo-toggle">${state.focus.running ? 'Pause' : 'Start'}</button><button data-action="pomo-mode">Mode</button></div></section>`;
  }
  function renderCalendar() {
    return `<section class="widget-card calendar-card"><div class="card-title-row"><div><strong>Calendar</strong><span>${escapeHtml(shortDate())}</span></div>${icon('calendar','xs')}</div><div class="mini-calendar">${Array.from({length:35}, (_,i) => `<span class="${i===12?'today':''}">${(i%30)+1}</span>`).join('')}</div><button class="mini-link" data-action="open-url" data-url="https://calendar.google.com">Open Google Calendar</button></section>`;
  }
  function renderHome() { return `<main class="home-layout"><aside class="left-stack">${renderClock()}${renderRates()}</aside><section class="center-stack">${renderSearch()}${renderBookmarks()}<div class="bottom-grid">${renderFocus()}${renderTasks()}</div></section><aside class="right-stack">${renderPet()}${renderCalendar()}</aside></main>`; }
  function renderAppTile(app) { return `<a class="app-tile" href="${escapeHtml(app.url || '#')}" target="_self"><span>${appIcon(app,'app')}</span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.note || host(app.url) || 'Open')}</small></a>`; }
  function categoryById(id) { return (state.categories || []).find((c) => c.id === id) || (state.categories || [])[0]; }
  function renderApps() { const c = categoryById(state.settings.appCategory); return `<main class="apps-page"><section class="app-panel"><div class="panel-head"><div>${icon(c.id,'xs')}<strong>${escapeHtml(c.label)}</strong></div><span>${escapeHtml(c.accent || 'Apps')}</span></div><div class="app-grid">${(c.apps || []).map(renderAppTile).join('')}</div></section></main>`; }
  function renderExplore() { return `<main class="explore-page"><section class="app-panel"><div class="panel-head"><div>${icon('notes','xs')}<strong>Notes</strong></div><button data-action="add-note">New note</button></div><div class="note-list">${(state.notes || []).slice(0,8).map((n) => `<article><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.tag || 'note')} · ${escapeHtml(new Date(n.createdAt).toLocaleDateString())}</span></article>`).join('')}</div></section><section class="app-panel"><div class="panel-head"><div>${icon('explore','xs')}<strong>World clocks</strong></div></div><div class="rates-list">${(state.worldClocks || []).map((c) => `<div><span>${escapeHtml(c.city)}</span><strong>${escapeHtml(cityTime(c.offset))}</strong></div>`).join('')}</div></section></main>`; }
  function renderDock() { return `<nav class="dock"><button data-action="account" type="button">${icon('user','xs')}</button><button class="${state.settings.route==='home'?'active':''}" data-route="home">${icon('home','xs')}</button><button class="${state.settings.route==='apps'?'active':''}" data-route="apps">${icon('apps','xs')}</button><button class="${state.settings.route==='explore'?'active':''}" data-route="explore">${icon('explore','xs')}</button><button data-action="settings">${icon('settings','xs')}</button></nav>`; }
  function renderAccountModal() {
    const signed = signedIn();
    const avatar = state.profile?.avatarUrl ? `<img src="${escapeHtml(state.profile.avatarUrl)}" alt="">` : `<span>${escapeHtml(profileInitials())}</span>`;
    return `<div class="modal-backdrop open" data-action="close-modal"></div><section class="auth-modal ${signed ? 'profile-mode' : ''}"><button class="modal-close" data-action="close-modal">${icon('close','xs')}</button>${signed ? `<div class="profile-hero"><div class="profile-avatar">${avatar}</div><h2>${escapeHtml(state.profile.name || 'LiveDash user')}</h2><p>${escapeHtml(state.profile.email || 'Cloud account')}</p><span class="cloud-pill">Cloud profile loaded</span></div><div class="profile-stats"><div><strong>${(state.bookmarkSlots||[]).filter(s=>s.url).length}</strong><span>Bookmarks</span></div><div><strong>${(state.tasks||[]).filter(t=>t.status!=='done').length}</strong><span>Tasks</span></div><div><strong>${state.pet?.score||0}</strong><span>Akita score</span></div></div><div class="auth-actions"><button class="primary-button" data-action="refresh-cloud">Sync now</button><button class="secondary-button" data-action="sign-out">Sign out</button></div>` : `<div class="auth-hero"><div class="auth-logo">${icon('live','app')}</div><h2>Sign in to LiveDash</h2><p>Sync your new tab, shortcuts, tasks, notes, and Akita progress across devices.</p></div><button class="google-button" data-action="google-sign-in"><span class="google-logo">G</span><span><strong>Continue with Google</strong><small>Secure cloud profile</small></span></button><label class="auth-email"><span>Email address</span><input id="authEmail" type="email" placeholder="you@example.com"></label><button class="secondary-button" data-action="email-sign-in">Continue with email</button>`}</section>`;
  }
  function renderBookmarkModal() {
    const slot = state.bookmarkSlots.find((s) => s.id === bookmarkEditingId) || state.bookmarkSlots[0];
    return `<div class="modal-backdrop open" data-action="close-modal"></div><section class="simple-modal"><button class="modal-close" data-action="close-modal">${icon('close','xs')}</button><h2>Bookmark</h2><label>Name<input id="bookmarkName" value="${escapeHtml(slot.label === 'Add site' ? '' : slot.label)}" placeholder="Gmail"></label><label>URL<input id="bookmarkUrl" value="${escapeHtml(slot.url || '')}" placeholder="https://example.com"></label><button class="primary-button" data-action="save-bookmark">Save bookmark</button></section>`;
  }
  function renderSettings() { return settingsOpen ? `<div class="drawer-backdrop open" data-action="close-settings"></div><aside class="drawer open"><button class="modal-close" data-action="close-settings">${icon('close','xs')}</button><h2>Settings</h2><div class="setting-grid">${['sky','mist','pearl','sunset','forest'].map((t) => `<button class="${state.settings.theme===t?'active':''}" data-action="theme" data-theme="${t}">${escapeHtml(t)}</button>`).join('')}</div><button data-action="export">Export backup</button><label class="import-label">Import backup<input id="importFile" type="file" accept="application/json"></label><button data-action="reset">Reset dashboard</button></aside>` : ''; }
  function renderCommand() { return commandOpen ? `<div class="modal-backdrop open" data-action="close-command"></div><section class="command-card"><input id="commandInput" placeholder="Type a command or search"><button data-route="home">${icon('home','xs')}Home</button><button data-route="apps">${icon('apps','xs')}Apps</button><button data-action="add-task">${icon('tasks','xs')}Add task</button><button data-action="google-sign-in">${icon('google','xs')}Google sign in</button></section>` : ''; }

  function render() {
    document.body.dataset.theme = state.settings.theme || 'sky';
    const route = state.settings.route || 'home';
    root.innerHTML = `<div class="shell">${renderProfileBar()}${renderTabs()}<div class="page">${route === 'home' ? renderHome() : route === 'apps' ? renderApps() : renderExplore()}</div></div>${renderDock()}${accountOpen ? renderAccountModal() : ''}${bookmarkEditingId ? renderBookmarkModal() : ''}${renderSettings()}${renderCommand()}`;
    bindInputs();
  }
  function bindInputs() {
    $('#mainSearch')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(e.target.value); });
    $('#taskInput')?.addEventListener('keydown', async (e) => { if (e.key === 'Enter') await addTask(e.target.value); });
    $('#commandInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(e.target.value); });
    $('#importFile')?.addEventListener('change', async (e) => { if (e.target.files?.[0]) await importBackup(e.target.files[0]); });
  }
  function runSearch(value) {
    const q = String(value || '').trim();
    if (!q) { commandOpen = true; render(); return; }
    const app = (state.categories || []).flatMap((c) => c.apps || []).find((a) => a.name.toLowerCase() === q.toLowerCase());
    if (app) { location.href = app.url; return; }
    if (q.toLowerCase().startsWith('task ')) { addTask(q.slice(5)); return; }
    if (q.toLowerCase().startsWith('note ')) { addNote(q.slice(5)); return; }
    location.href = (searchEngines[state.settings.searchEngine] || searchEngines.google) + encodeURIComponent(q);
  }
  async function addTask(title) { const clean = String(title || '').trim() || prompt('Task title') || 'New task'; state.tasks = [{ id: uid('task'), title: clean, status: 'open', priority: 'medium', due: new Date().toISOString(), source: 'LiveDash' }, ...(state.tasks || [])]; activity('Task added', clean); notice('Task added', clean, 'success'); await save(); toast('Task added'); render(); }
  async function addNote(body) { const clean = String(body || '').trim() || prompt('Note') || 'New note'; state.notes = [{ id: uid('note'), title: clean.slice(0,50), body: clean, tag: 'quick', createdAt: new Date().toISOString() }, ...(state.notes || [])]; await save(); toast('Note saved'); render(); }
  async function completeTask(id) { state.tasks = (state.tasks || []).map((t) => t.id === id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t); await save(); render(); }
  async function deleteTask(id) { state.tasks = (state.tasks || []).filter((t) => t.id !== id); await save(); render(); }
  async function pet(mode) { const p = state.pet || {}; p.mode = mode; p.lastInteractionAt = new Date().toISOString(); if (mode === 'play') { p.score = Number(p.score || 0) + 5; p.energy = Math.max(10, Number(p.energy || 70) - 8); p.mood = 'Playing'; } if (mode === 'feed') { p.score = Number(p.score || 0) + 2; p.energy = Math.min(100, Number(p.energy || 70) + 15); p.mood = 'Happy'; } if (mode === 'rest') { p.energy = Math.min(100, Number(p.energy || 70) + 8); p.mood = 'Resting'; } state.pet = p; await save(); render(); setTimeout(async () => { state.pet.mode = 'idle'; state.pet.mood = 'Ready'; await save(); render(); }, 2600); }
  async function saveBookmark() { const name = $('#bookmarkName')?.value.trim() || 'New site'; let url = $('#bookmarkUrl')?.value.trim() || ''; if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`; state.bookmarkSlots = (state.bookmarkSlots || []).map((s) => s.id === bookmarkEditingId ? { ...s, label: name, url, icon: keyFor(name,url) } : s); bookmarkEditingId = null; await save(); render(); }
  async function exportBackup() { const backup = await window.LiveDashStore.exportState(); window.LiveDashStore.downloadJson(`livedash-backup-${new Date().toISOString().slice(0,10)}.json`, backup); toast('Backup exported'); }
  async function importBackup(file) { try { state = await window.LiveDashStore.importState(await window.LiveDashStore.readJsonFile(file)); toast('Backup imported'); render(); } catch (e) { toast(e.message || 'Import failed'); } }
  async function resetDashboard() { if (!confirm('Reset LiveDash dashboard?')) return; state = await window.LiveDashStore.resetState(); toast('Dashboard reset'); render(); }
  async function emailSignIn() { const email = $('#authEmail')?.value.trim(); if (!email) { toast('Enter an email'); return; } state.profile.email = email; state.profile.signedIn = true; accountOpen = false; await save(); render(); }
  function openUrl(url) { if (url) location.href = url; }

  root.addEventListener('click', async (e) => {
    const el = e.target.closest('button, [data-action], [data-route]');
    if (!el) return;
    const route = el.dataset.route;
    if (route) { state.settings.route = route; commandOpen = false; await save(); render(); return; }
    const action = el.dataset.action;
    const id = el.dataset.id;
    const actions = {
      account: () => { accountOpen = true; render(); },
      'close-modal': () => { accountOpen = false; bookmarkEditingId = null; render(); },
      settings: () => { settingsOpen = true; render(); },
      'close-settings': () => { settingsOpen = false; render(); },
      command: () => { commandOpen = true; render(); },
      'close-command': () => { commandOpen = false; render(); },
      category: async () => { state.settings.appCategory = el.dataset.category; state.settings.route = 'apps'; await save(); render(); },
      'open-url': () => openUrl(el.dataset.url),
      'open-bookmark': () => { const slot = state.bookmarkSlots.find((s) => s.id === id); if (slot?.url) openUrl(slot.url); },
      'edit-bookmark': () => { bookmarkEditingId = id; render(); },
      'save-bookmark': saveBookmark,
      'google-sign-in': googleSignIn,
      'email-sign-in': emailSignIn,
      'refresh-cloud': async () => { const ok = await hydrateCloud('manual'); toast(ok ? 'Cloud profile refreshed' : 'Cloud refresh failed'); render(); },
      'sign-out': async () => { state.profile = { ...state.profile, signedIn: false, authToken: '', backendConnected: false, cloudLoaded: false }; accountOpen = false; await save(); render(); },
      'add-task': async () => addTask(''),
      'add-task-input': async () => addTask($('#taskInput')?.value || ''),
      'task-filter': () => { activeTaskFilter = el.dataset.filter || 'open'; render(); },
      'complete-task': async () => completeTask(id),
      'delete-task': async () => deleteTask(id),
      'add-note': async () => addNote(''),
      'pet-play': async () => pet('play'),
      'pet-feed': async () => pet('feed'),
      'pet-rest': async () => pet('rest'),
      'pomo-toggle': async () => { state.focus.running = !state.focus.running; await save(); startTimer(); render(); },
      'pomo-reset': async () => { state.focus.running = false; state.focus.remaining = (state.settings.focusMinutes || 25) * 60; await save(); render(); },
      'pomo-mode': async () => { state.focus.mode = state.focus.mode === 'work' ? 'break' : 'work'; state.focus.remaining = state.focus.mode === 'work' ? (state.settings.focusMinutes || 25) * 60 : 5 * 60; await save(); render(); },
      theme: async () => { state.settings.theme = el.dataset.theme; await save(); render(); },
      export: exportBackup,
      reset: resetDashboard,
      refresh: async () => { activity('Widgets refreshed', 'Local widgets updated'); await save(); toast('Widgets refreshed'); }
    };
    if (actions[action]) await actions[action]();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); commandOpen = true; render(); }
    if (e.key === 'Escape') { accountOpen = false; bookmarkEditingId = null; settingsOpen = false; commandOpen = false; render(); }
  });
  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(async () => {
      if (!state?.focus?.running) return;
      state.focus.remaining = Math.max(0, (state.focus.remaining || 0) - 1);
      if (state.focus.remaining === 0) { state.focus.running = false; notice('Focus session complete', 'Take a break.', 'success'); await save(); render(); }
      const time = $('.pomo-ring strong'); if (time) { const r = state.focus.remaining || 0; time.textContent = `${Math.floor(r/60).toString().padStart(2,'0')}:${(r%60).toString().padStart(2,'0')}`; }
      if ((state.focus.remaining || 0) % 15 === 0) await window.LiveDashStore.setState(state);
    }, 1000);
  }
  async function boot() {
    state = await window.LiveDashStore.getState();
    state.settings.route = state.settings.route || 'home';
    state.settings.showDock = true;
    if (state.profile?.authToken && !state.profile.cloudLoaded) await hydrateCloud('boot');
    render(); startTimer();
  }
  boot().catch((e) => { root.innerHTML = `<section class="simple-modal"><h2>LiveDash could not start</h2><p>${escapeHtml(e.message)}</p></section>`; });
})();
