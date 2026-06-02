(function () {
  const SCHEMA_VERSION = 210;

  const nowIso = () => new Date().toISOString();

  const categories = [
    {
      id: 'daily',
      label: 'Daily Essentials',
      icon: 'daily',
      accent: 'rose',
      apps: [
        { name: 'Gmail', url: 'https://mail.google.com', icon: '✉️', note: 'Inbox' },
        { name: 'Google Calendar', url: 'https://calendar.google.com', icon: '📅', note: 'Schedule' },
        { name: 'Google Drive', url: 'https://drive.google.com', icon: '🟢', note: 'Files' },
        { name: 'Notion', url: 'https://www.notion.so', icon: 'N', note: 'Docs' },
        { name: 'Todoist', url: 'https://todoist.com', icon: '✓', note: 'Tasks' },
        { name: 'Slack', url: 'https://slack.com/signin', icon: '💬', note: 'Teams' },
        { name: 'Zoom', url: 'https://zoom.us', icon: '🎥', note: 'Calls' },
        { name: 'Dropbox', url: 'https://www.dropbox.com', icon: '📦', note: 'Cloud' },
        { name: 'Outlook', url: 'https://outlook.live.com', icon: 'O', note: 'Mail' },
        { name: 'Microsoft To Do', url: 'https://to-do.office.com', icon: '☑️', note: 'Lists' },
        { name: '1Password', url: 'https://my.1password.com', icon: '🔐', note: 'Vault' },
        { name: 'LinkedIn', url: 'https://www.linkedin.com', icon: 'in', note: 'Network' },
        { name: 'GitHub', url: 'https://github.com', icon: '⌘', note: 'Code' },
        { name: 'Figma', url: 'https://www.figma.com', icon: '◈', note: 'Design' },
        { name: 'Canva', url: 'https://www.canva.com', icon: 'C', note: 'Create' },
        { name: 'Spotify', url: 'https://open.spotify.com', icon: '♫', note: 'Music' },
        { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶', note: 'Video' },
        { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'W', note: 'Reference' }
      ]
    },
    {
      id: 'public',
      label: 'Public Services',
      icon: 'public',
      accent: 'slate',
      apps: [
        { name: 'IRS', url: 'https://www.irs.gov', icon: '🇺🇸', note: 'US taxes' },
        { name: 'USPS Tracking', url: 'https://tools.usps.com/go/TrackConfirmAction_input', icon: '📮', note: 'Parcels' },
        { name: 'GOV.UK', url: 'https://www.gov.uk', icon: '🇬🇧', note: 'UK services' },
        { name: 'EU Portal', url: 'https://european-union.europa.eu', icon: '🇪🇺', note: 'EU services' },
        { name: 'NHS', url: 'https://www.nhs.uk', icon: '⚕️', note: 'Health' },
        { name: 'DHL Tracking', url: 'https://www.dhl.com', icon: '🚚', note: 'Shipping' },
        { name: 'Royal Mail', url: 'https://www.royalmail.com', icon: '📯', note: 'UK post' },
        { name: 'UPS', url: 'https://www.ups.com', icon: '📦', note: 'Shipping' }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: 'tools',
      accent: 'blue',
      apps: [
        { name: 'Trello', url: 'https://trello.com', icon: '▣', note: 'Boards' },
        { name: 'Miro', url: 'https://miro.com', icon: 'M', note: 'Whiteboard' },
        { name: 'Loom', url: 'https://www.loom.com', icon: '◧', note: 'Screen video' },
        { name: 'TinyPNG', url: 'https://tinypng.com', icon: '🐼', note: 'Compress' },
        { name: 'CloudConvert', url: 'https://cloudconvert.com', icon: '☁️', note: 'Convert' },
        { name: 'Remove.bg', url: 'https://www.remove.bg', icon: '✂️', note: 'Image edit' },
        { name: 'Unsplash', url: 'https://unsplash.com', icon: '▧', note: 'Photos' },
        { name: 'Google Translate', url: 'https://translate.google.com', icon: '🌐', note: 'Translate' },
        { name: 'Speedtest', url: 'https://www.speedtest.net', icon: '⚡', note: 'Network' },
        { name: 'Archive.org', url: 'https://archive.org', icon: '🏛', note: 'Archive' }
      ]
    },
    {
      id: 'google',
      label: 'Google Services',
      icon: 'G',
      accent: 'green',
      apps: [
        { name: 'Search', url: 'https://www.google.com', icon: 'G', note: 'Web' },
        { name: 'Maps', url: 'https://maps.google.com', icon: '🗺️', note: 'Places' },
        { name: 'Drive', url: 'https://drive.google.com', icon: '▲', note: 'Files' },
        { name: 'Docs', url: 'https://docs.google.com', icon: '📄', note: 'Docs' },
        { name: 'Sheets', url: 'https://sheets.google.com', icon: '▦', note: 'Sheets' },
        { name: 'Slides', url: 'https://slides.google.com', icon: '▣', note: 'Slides' },
        { name: 'Meet', url: 'https://meet.google.com', icon: '🎦', note: 'Calls' },
        { name: 'Keep', url: 'https://keep.google.com', icon: '💡', note: 'Notes' },
        { name: 'News', url: 'https://news.google.com', icon: '📰', note: 'News' },
        { name: 'Photos', url: 'https://photos.google.com', icon: '🌈', note: 'Photos' }
      ]
    },
    {
      id: 'ai',
      label: 'AI',
      icon: 'ai',
      accent: 'violet',
      apps: [
        { name: 'ChatGPT', url: 'https://chat.openai.com', icon: '✦', note: 'Assistant' },
        { name: 'Claude', url: 'https://claude.ai', icon: '✺', note: 'Assistant' },
        { name: 'Perplexity', url: 'https://www.perplexity.ai', icon: 'P', note: 'Research' },
        { name: 'Gemini', url: 'https://gemini.google.com', icon: '◇', note: 'Assistant' },
        { name: 'Copilot', url: 'https://copilot.microsoft.com', icon: 'C', note: 'Assistant' },
        { name: 'Hugging Face', url: 'https://huggingface.co', icon: '🤗', note: 'Models' },
        { name: 'Runway', url: 'https://runwayml.com', icon: 'R', note: 'Video' },
        { name: 'Midjourney', url: 'https://www.midjourney.com', icon: 'M', note: 'Image' }
      ]
    },
    {
      id: 'travel',
      label: 'Travel & Finance',
      icon: '🏙️',
      accent: 'amber',
      apps: [
        { name: 'Google Flights', url: 'https://www.google.com/travel/flights', icon: '✈️', note: 'Flights' },
        { name: 'Booking.com', url: 'https://www.booking.com', icon: 'B', note: 'Hotels' },
        { name: 'Airbnb', url: 'https://www.airbnb.com', icon: 'A', note: 'Stays' },
        { name: 'Uber', url: 'https://www.uber.com', icon: 'U', note: 'Rides' },
        { name: 'Wise', url: 'https://wise.com', icon: 'W', note: 'Money' },
        { name: 'Revolut', url: 'https://www.revolut.com', icon: 'R', note: 'Banking' },
        { name: 'Yahoo Finance', url: 'https://finance.yahoo.com', icon: '¥', note: 'Markets' },
        { name: 'XE Currency', url: 'https://www.xe.com', icon: '$', note: 'Rates' }
      ]
    },
    {
      id: 'social',
      label: 'Social',
      icon: 'social',
      accent: 'indigo',
      apps: [
        { name: 'Facebook', url: 'https://www.facebook.com', icon: 'social', note: 'Social' },
        { name: 'Instagram', url: 'https://www.instagram.com', icon: '◎', note: 'Social' },
        { name: 'X', url: 'https://x.com', icon: '𝕏', note: 'Social' },
        { name: 'Reddit', url: 'https://www.reddit.com', icon: 'r', note: 'Forum' },
        { name: 'Discord', url: 'https://discord.com/app', icon: '🎮', note: 'Chat' },
        { name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '☏', note: 'Chat' },
        { name: 'Telegram', url: 'https://web.telegram.org', icon: '✈', note: 'Chat' },
        { name: 'Pinterest', url: 'https://www.pinterest.com', icon: 'P', note: 'Ideas' }
      ]
    }
  ];

  const quickLinks = [
    { id: 'mail', label: 'Mail', url: 'https://mail.google.com', icon: '✉️', color: '#4f7cff' },
    { id: 'calendar', label: 'Calendar', url: 'https://calendar.google.com', icon: '📅', color: '#2eb67d' },
    { id: 'drive', label: 'Drive', url: 'https://drive.google.com', icon: '▲', color: '#fbbc05' },
    { id: 'docs', label: 'Docs', url: 'https://docs.google.com', icon: '📄', color: '#4285f4' },
    { id: 'chatgpt', label: 'ChatGPT', url: 'https://chat.openai.com', icon: '✦', color: '#10a37f' },
    { id: 'notion', label: 'Notion', url: 'https://www.notion.so', icon: 'N', color: '#111827' },
    { id: 'github', label: 'GitHub', url: 'https://github.com', icon: '⌘', color: '#24292f' },
    { id: 'figma', label: 'Figma', url: 'https://www.figma.com', icon: '◈', color: '#a259ff' },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com', icon: '▶', color: '#ff0033' },
    { id: 'spotify', label: 'Spotify', url: 'https://open.spotify.com', icon: '♫', color: '#1db954' }
  ];

  const defaultState = {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      name: 'Alex',
      signedIn: false,
      email: '',
      avatarUrl: '',
      authToken: '',
      backendConnected: false,
      cloudLoaded: false,
      plan: 'Local',
      locale: 'en-US',
      timeFormat: '12h'
    },
    settings: {
      route: 'home',
      appCategory: 'daily',
      theme: 'sky',
      background: 'blue-sky',
      density: 'comfortable',
      searchEngine: 'google',
      showDock: true,
      showWeather: true,
      focusMinutes: 25,
      currencyBase: 'USD',
      calendarWeekStarts: 'sunday'
    },
    categories,
    quickLinks,
    bookmarkSlots: [
      { id: 'slot-1', label: 'Gmail', url: 'https://mail.google.com', icon: 'G', color: '#ea4335' },
      { id: 'slot-2', label: 'Calendar', url: 'https://calendar.google.com', icon: '31', color: '#4285f4' },
      { id: 'slot-3', label: 'ChatGPT', url: 'https://chat.openai.com', icon: 'AI', color: '#10a37f' },
      { id: 'slot-4', label: 'YouTube', url: 'https://www.youtube.com', icon: '▶', color: '#ff0033' },
      { id: 'slot-5', label: 'Notion', url: 'https://www.notion.so', icon: 'N', color: '#111827' },
      { id: 'slot-6', label: 'Add site', url: '', icon: '+' },
      { id: 'slot-7', label: 'Add site', url: '', icon: '+' },
      { id: 'slot-8', label: 'Add site', url: '', icon: '+' },
      { id: 'slot-9', label: 'Add site', url: '', icon: '+' },
      { id: 'slot-10', label: 'Add site', url: '', icon: '+' }
    ],
    tasks: [
      { id: 'task-1', title: 'Review today’s priorities', status: 'open', priority: 'high', due: nowIso(), source: 'LiveDash' },
      { id: 'task-2', title: 'Capture links for the weekly plan', status: 'open', priority: 'medium', due: nowIso(), source: 'Browser' }
    ],
    notes: [
      { id: 'note-1', title: 'Quick note', body: 'Use LiveDash to capture ideas, links, and tasks without leaving the browser.', tag: 'dashboard', createdAt: nowIso() }
    ],
    captures: [],
    focus: {
      running: false,
      remaining: 25 * 60,
      mode: 'work',
      lastStartedAt: ''
    },
    pet: {
      name: 'Akita',
      mood: 'Ready',
      energy: 74,
      hearts: 5,
      mode: 'idle',
      score: 0,
      lastInteractionAt: nowIso()
    },
    weather: {
      city: 'London',
      country: 'UK',
      summary: 'Partly cloudy',
      tempC: 17,
      tempF: 63
    },
    currency: [
      { code: 'EUR', name: 'Euro', value: '0.92', delta: 'up' },
      { code: 'GBP', name: 'British Pound', value: '0.78', delta: 'up' },
      { code: 'USD', name: 'US Dollar', value: '1.00', delta: 'flat' }
    ],
    worldClocks: [
      { city: 'New York', offset: -4 },
      { city: 'London', offset: 1 },
      { city: 'Berlin', offset: 2 },
      { city: 'San Francisco', offset: -7 }
    ],
    notifications: [
      { id: 'n-1', title: 'Welcome to LiveDash', body: 'Your new tab is ready for search, widgets, tasks, and bookmarks.', type: 'info', read: false, createdAt: nowIso() }
    ],
    activity: [
      { id: 'a-1', title: 'Dashboard initialized', body: 'Local-first settings and widgets are ready.', createdAt: nowIso() }
    ],
    updatedAt: nowIso()
  };

  window.LiveDashDefaults = { SCHEMA_VERSION, defaultState };
})();
