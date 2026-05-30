(function(global){
  const VERSION = 6;
  const STORAGE_KEY = "livedash.v6.state";
  const LEGACY_KEYS = ["livedash.v5.state", "livedash.v4.state", "livedashState", "LiveDashState", "livedash-v3-state", "livedash.v3.state"];

  const savedViews = [
    { id: "executive", name: "Executive Overview", description: "High-signal overview with launcher, metrics, priority queue, schedule, and alerts." },
    { id: "focus", name: "Personal Focus", description: "Calm work mode with timer, top tasks, notes, and time context." },
    { id: "operations", name: "Operations", description: "Signals, schedule, weather readiness, timezones, links, and activity." },
    { id: "metrics", name: "Metrics", description: "Trend analysis, KPI cards, status distribution, and source freshness." },
    { id: "minimal", name: "Minimal", description: "Widgetify-style launcher with only clock, search, links, and focus." }
  ];

  const navItems = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "focus", label: "Focus", icon: "◎" },
    { id: "tasks", label: "Tasks", icon: "✓" },
    { id: "metrics", label: "Metrics", icon: "↗" },
    { id: "calendar", label: "Calendar", icon: "□" },
    { id: "notes", label: "Notes", icon: "✎" },
    { id: "activity", label: "Activity", icon: "◌" },
    { id: "settings", label: "Settings", icon: "⚙" }
  ];

  const moduleCatalog = [
    { id: "launchpad", title: "Launcher Hub", category: "core", span: 8, description: "Search, command entry, and bookmark launch grid inspired by the reference extension." },
    { id: "day", title: "Day Capsule", category: "core", span: 4, description: "Clock, local date, weather readiness, and timezone context." },
    { id: "focusTimer", title: "Focus Command", category: "focus", span: 4, description: "Local focus timer with quick start and session tracking." },
    { id: "priorities", title: "Priority Board", category: "focus", span: 8, description: "Production-grade task queue with status, due dates, priority, and filters." },
    { id: "notes", title: "WigiPad Notes", category: "knowledge", span: 4, description: "Quick notes, tags, timestamps, and search." },
    { id: "metrics", title: "Operating Metrics", category: "analytics", span: 8, description: "KPI cards with deltas, targets, sparklines, source, and freshness." },
    { id: "trend", title: "Trend Console", category: "analytics", span: 8, description: "Large trend chart with target and freshness metadata." },
    { id: "distribution", title: "Status Map", category: "analytics", span: 4, description: "Task and alert distribution chart." },
    { id: "schedule", title: "Agenda", category: "calendar", span: 4, description: "Today’s commitments and compact calendar." },
    { id: "signals", title: "Signals", category: "operations", span: 4, description: "Local notification center with reminders and warnings." },
    { id: "activity", title: "Activity Trail", category: "history", span: 4, description: "Local audit history for dashboard actions." },
    { id: "timezones", title: "World Clocks", category: "operations", span: 4, description: "US and Europe timezones for globally usable planning." },
    { id: "weather", title: "Weather Readiness", category: "signals", span: 4, description: "Offline-safe weather context with explicit local fallback." }
  ];

  const backgrounds = [
    { id: "aurora", name: "Aurora Command", from: "#07111f", mid: "#14273f", to: "#05070c" },
    { id: "graphite", name: "Graphite", from: "#070707", mid: "#15171c", to: "#030304" },
    { id: "midnight", name: "Midnight Blue", from: "#07142b", mid: "#0f2444", to: "#050811" },
    { id: "paper", name: "Light Paper", from: "#f6f8fc", mid: "#e9eef7", to: "#ffffff" }
  ];

  function iso(offsetDays){
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString();
  }

  function uid(prefix){
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  }

  function createDefaultState(){
    const now = new Date().toISOString();
    return {
      schemaVersion: VERSION,
      createdAt: now,
      updatedAt: now,
      settings: {
        theme: "dark",
        density: "comfortable",
        background: "aurora",
        defaultView: "executive",
        selectedView: "executive",
        activeSection: "overview",
        timeRange: "7d",
        timeFormat: "auto",
        filterOpen: false,
        editMode: false,
        reducedMotion: false,
        showSignals: true,
        dockVisible: true,
        searchEngine: "google",
        weatherLocation: "New York",
        hiddenModules: []
      },
      filters: {
        priority: "all",
        status: "all",
        signal: "all",
        query: ""
      },
      focus: {
        active: false,
        startedAt: null,
        endsAt: null,
        durationMin: 25,
        completedToday: 1
      },
      tasks: [
        { id: uid("task"), title: "Review operating plan", priority: "critical", status: "open", due: iso(0), source: "Manual", owner: "You" },
        { id: uid("task"), title: "Prepare release follow-ups", priority: "high", status: "open", due: iso(1), source: "Notes", owner: "You" },
        { id: uid("task"), title: "Validate metrics targets", priority: "medium", status: "blocked", due: iso(2), source: "Metrics", owner: "You" },
        { id: uid("task"), title: "Archive shipped checklist", priority: "low", status: "done", due: iso(-1), source: "Activity", owner: "You" }
      ],
      notes: [
        { id: uid("note"), title: "Release quality bar", body: "Validate install flow, persistence, keyboard access, responsive layout, reset, and import/export before shipping.", tags: ["release", "qa"], createdAt: iso(-1), updatedAt: iso(-1) },
        { id: uid("note"), title: "Dashboard direction", body: "Keep the launcher calm, make widgets useful, and hide editing controls until edit mode.", tags: ["product", "ux"], createdAt: iso(-2), updatedAt: iso(-2) }
      ],
      metrics: [
        { id: "readiness", label: "Readiness", value: 94, suffix: "%", delta: 5.2, target: 95, period: "7d", source: "Local dashboard", freshnessMin: 3, series: [72, 76, 80, 84, 88, 91, 94] },
        { id: "focus", label: "Focus hours", value: 15.5, suffix: "h", delta: 2.4, target: 18, period: "7d", source: "Focus timer", freshnessMin: 8, series: [6, 7.5, 9, 10.5, 12, 14, 15.5] },
        { id: "completion", label: "Completion", value: 81, suffix: "%", delta: 1.8, target: 85, period: "7d", source: "Task board", freshnessMin: 1, series: [65, 69, 72, 75, 78, 80, 81] },
        { id: "signals", label: "Healthy signals", value: 12, suffix: "", delta: 3, target: 12, period: "today", source: "Extension runtime", freshnessMin: 5, series: [7, 8, 8, 9, 10, 11, 12] }
      ],
      commitments: [
        { id: uid("commit"), time: "09:00", title: "Planning review", type: "Calendar", status: "confirmed" },
        { id: uid("commit"), time: "11:30", title: "Protected focus block", type: "Focus", status: "protected" },
        { id: uid("commit"), time: "15:00", title: "Metrics checkpoint", type: "Review", status: "tentative" }
      ],
      links: [
        { id: uid("link"), title: "Calendar", url: "https://calendar.google.com", category: "Work", color: "blue" },
        { id: uid("link"), title: "Gmail", url: "https://mail.google.com", category: "Work", color: "red" },
        { id: uid("link"), title: "Docs", url: "https://docs.google.com", category: "Work", color: "green" },
        { id: uid("link"), title: "GitHub", url: "https://github.com", category: "Engineering", color: "slate" },
        { id: uid("link"), title: "Figma", url: "https://figma.com", category: "Design", color: "purple" },
        { id: uid("link"), title: "Linear", url: "https://linear.app", category: "Planning", color: "indigo" },
        { id: uid("link"), title: "Notion", url: "https://notion.so", category: "Knowledge", color: "gray" },
        { id: uid("link"), title: "Vercel", url: "https://vercel.com", category: "Deploy", color: "slate" }
      ],
      weather: {
        location: "New York",
        condition: "Partly cloudy",
        temperature: 68,
        high: 72,
        low: 61,
        unit: "F",
        status: "offline-safe",
        updatedAt: now,
        source: "Local fallback"
      },
      timezones: [
        { id: "nyc", label: "New York", timezone: "America/New_York" },
        { id: "lon", label: "London", timezone: "Europe/London" },
        { id: "ber", label: "Berlin", timezone: "Europe/Berlin" },
        { id: "la", label: "Los Angeles", timezone: "America/Los_Angeles" }
      ],
      notifications: [
        { id: uid("notice"), title: "LiveDash v6 is ready", body: "New tab, popup, options, dock, storage, and command palette are active.", severity: "success", read: false, createdAt: now },
        { id: uid("notice"), title: "Blocked task needs review", body: "One task is blocked and should be resolved before adding scope.", severity: "warning", read: false, createdAt: iso(-1) }
      ],
      activity: [
        { id: uid("activity"), type: "system", title: "LiveDash v6 initialized", detail: "Widgetify-inspired English command center created with global defaults.", createdAt: now }
      ],
      lastBackup: null
    };
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function mergeState(input){
    const base = createDefaultState();
    if(!input || typeof input !== "object") return base;
    const merged = Object.assign(base, input);
    merged.schemaVersion = VERSION;
    merged.settings = Object.assign(base.settings, input.settings || {});
    merged.filters = Object.assign(base.filters, input.filters || {});
    merged.focus = Object.assign(base.focus, input.focus || {});
    merged.tasks = Array.isArray(input.tasks) ? input.tasks : base.tasks;
    merged.notes = Array.isArray(input.notes) ? input.notes : base.notes;
    merged.metrics = Array.isArray(input.metrics) ? input.metrics : base.metrics;
    merged.commitments = Array.isArray(input.commitments) ? input.commitments : base.commitments;
    merged.links = Array.isArray(input.links) ? input.links : base.links;
    merged.weather = Object.assign(base.weather, input.weather || {});
    merged.timezones = Array.isArray(input.timezones) ? input.timezones : base.timezones;
    merged.notifications = Array.isArray(input.notifications) ? input.notifications : base.notifications;
    merged.activity = Array.isArray(input.activity) ? input.activity : base.activity;
    merged.updatedAt = new Date().toISOString();
    return merged;
  }

  global.LiveDashDefaults = { VERSION, STORAGE_KEY, LEGACY_KEYS, savedViews, navItems, moduleCatalog, backgrounds, createDefaultState, mergeState, clone, uid };
})(globalThis);
