(function(global){
  const VERSION = 7;
  const STORAGE_KEY = "livedash.v7.state";
  const LEGACY_KEYS = ["livedash.v6.state", "livedash.v5.state", "livedash.v4.state", "livedashState", "LiveDashState", "livedash-v3-state", "livedash.v3.state"];

  const savedViews = [
    { id: "home", name: "Home Command", description: "Widgetify-style launcher with utilities, notes, focus, tasks, and local signals.", sections: ["launcher", "tools", "tasks", "notes", "signals"] },
    { id: "focus", name: "Deep Focus", description: "Search, timer, top priorities, notes, and calendar with fewer distractions.", sections: ["launcher", "focus", "tasks", "notes"] },
    { id: "operations", name: "Operations", description: "Signals, agenda, world clocks, weather, links, and activity history.", sections: ["launcher", "tools", "signals", "activity", "agenda"] },
    { id: "metrics", name: "Metrics", description: "Operational metrics, trend console, status map, and task records.", sections: ["launcher", "metrics", "activity", "tasks"] },
    { id: "minimal", name: "Minimal", description: "Search, bookmarks, clock, and a compact dock only.", sections: ["launcher", "tools"] }
  ];

  const navItems = [
    { id: "home", label: "Home", glyph: "H" },
    { id: "focus", label: "Focus", glyph: "F" },
    { id: "tasks", label: "Tasks", glyph: "T" },
    { id: "notes", label: "Notes", glyph: "N" },
    { id: "metrics", label: "Metrics", glyph: "M" },
    { id: "activity", label: "Activity", glyph: "A" },
    { id: "settings", label: "Settings", glyph: "S" }
  ];

  const moduleCatalog = [
    { id: "launcher", title: "Search and Launch", type: "core", span: "wide", enabled: true },
    { id: "commandCard", title: "Command Card", type: "core", span: "side", enabled: true },
    { id: "timeWeather", title: "Time and Weather", type: "utility", span: "side", enabled: true },
    { id: "focus", title: "Focus Timer", type: "focus", span: "small", enabled: true },
    { id: "tasks", title: "Priority Tasks", type: "work", span: "wide", enabled: true },
    { id: "notes", title: "Quick Notes", type: "work", span: "medium", enabled: true },
    { id: "metrics", title: "Metrics", type: "analytics", span: "wide", enabled: true },
    { id: "trend", title: "Trend Console", type: "analytics", span: "wide", enabled: true },
    { id: "status", title: "Status Map", type: "analytics", span: "small", enabled: true },
    { id: "agenda", title: "Agenda", type: "calendar", span: "medium", enabled: true },
    { id: "signals", title: "Signals", type: "system", span: "small", enabled: true },
    { id: "activity", title: "Activity", type: "system", span: "medium", enabled: true },
    { id: "world", title: "World Clocks", type: "utility", span: "small", enabled: true }
  ];

  const wallpapers = [
    { id: "mist", name: "Morning Mist", mode: "light", a: "#dce8f8", b: "#a9bdd9", c: "#f5f7fb", accent: "#3b82f6" },
    { id: "aurora", name: "Aurora Glass", mode: "dark", a: "#0d1024", b: "#16365c", c: "#050810", accent: "#79b8ff" },
    { id: "carbon", name: "Carbon Studio", mode: "dark", a: "#060608", b: "#17191f", c: "#101215", accent: "#a1a1aa" },
    { id: "violet", name: "Violet Beam", mode: "dark", a: "#14081f", b: "#422267", c: "#08050f", accent: "#c4b5fd" },
    { id: "sage", name: "Sage Paper", mode: "light", a: "#ecf4ea", b: "#cdddc9", c: "#fffdf8", accent: "#23745a" }
  ];

  function uid(prefix){
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function iso(offsetDays, hour){
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    if(typeof hour === "number") date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  function createDefaultState(){
    const now = new Date().toISOString();
    return {
      schemaVersion: VERSION,
      createdAt: now,
      updatedAt: now,
      settings: {
        theme: "auto",
        wallpaper: "aurora",
        glass: "medium",
        blur: true,
        density: "balanced",
        selectedView: "home",
        defaultView: "home",
        activeNav: "home",
        editMode: false,
        dockVisible: true,
        greetingName: "Operator",
        searchEngine: "google",
        timeRange: "7d",
        timeFormat: "auto",
        quickLinksSource: "local",
        weatherLocation: "New York",
        reducedMotion: false,
        showBrowserBookmarks: true,
        compactWidgets: false
      },
      focus: {
        active: false,
        startedAt: null,
        endsAt: null,
        durationMin: 25,
        completedToday: 2,
        dailyGoal: 4
      },
      filters: {
        taskStatus: "all",
        priority: "all",
        query: ""
      },
      links: [
        { id: uid("link"), title: "Gmail", url: "https://mail.google.com", group: "Work", color: "#ef4444" },
        { id: uid("link"), title: "Calendar", url: "https://calendar.google.com", group: "Work", color: "#2563eb" },
        { id: uid("link"), title: "Drive", url: "https://drive.google.com", group: "Files", color: "#22c55e" },
        { id: uid("link"), title: "Notion", url: "https://notion.so", group: "Knowledge", color: "#f8fafc" },
        { id: uid("link"), title: "Linear", url: "https://linear.app", group: "Planning", color: "#8b5cf6" },
        { id: uid("link"), title: "Figma", url: "https://figma.com", group: "Design", color: "#f97316" },
        { id: uid("link"), title: "GitHub", url: "https://github.com", group: "Code", color: "#94a3b8" },
        { id: uid("link"), title: "Vercel", url: "https://vercel.com", group: "Deploy", color: "#e5e7eb" },
        { id: uid("link"), title: "Docs", url: "https://docs.google.com", group: "Docs", color: "#3b82f6" },
        { id: uid("link"), title: "ChatGPT", url: "https://chatgpt.com", group: "AI", color: "#10b981" }
      ],
      tasks: [
        { id: uid("task"), title: "Review launch checklist", priority: "critical", status: "open", due: iso(0, 10), source: "Release", owner: "You" },
        { id: uid("task"), title: "Plan focused work block", priority: "high", status: "open", due: iso(0, 12), source: "Focus", owner: "You" },
        { id: uid("task"), title: "Clean up stale notes", priority: "medium", status: "open", due: iso(1, 14), source: "Notes", owner: "You" },
        { id: uid("task"), title: "Update dashboard metrics", priority: "medium", status: "blocked", due: iso(2, 9), source: "Metrics", owner: "You" },
        { id: uid("task"), title: "Archive completed sprint items", priority: "low", status: "done", due: iso(-1, 17), source: "Activity", owner: "You" }
      ],
      notes: [
        { id: uid("note"), title: "Command center direction", body: "Keep the new tab useful first: search, bookmarks, tasks, notes, focus, calendar, and signals in one calm surface.", tags: ["product", "ux"], createdAt: iso(-1), updatedAt: iso(-1) },
        { id: uid("note"), title: "Useful widgets", body: "Prioritize widgets that help start work quickly: launcher, task table, notes, focus, time, weather, activity, and status.", tags: ["widgets"], createdAt: iso(-2), updatedAt: iso(-2) }
      ],
      metrics: [
        { id: "readiness", label: "Readiness", value: 92, suffix: "%", delta: 4.1, target: 95, period: "7d", source: "Local state", freshnessMin: 2, series: [69, 72, 78, 80, 84, 88, 92] },
        { id: "flow", label: "Focus Flow", value: 11.5, suffix: "h", delta: 2.3, target: 14, period: "7d", source: "Focus timer", freshnessMin: 6, series: [4, 5, 6.5, 8, 9.5, 10, 11.5] },
        { id: "tasks", label: "Task Closure", value: 76, suffix: "%", delta: 3.6, target: 85, period: "7d", source: "Task board", freshnessMin: 1, series: [52, 55, 60, 66, 71, 73, 76] },
        { id: "notes", label: "Captured Notes", value: 18, suffix: "", delta: 5, target: 20, period: "30d", source: "Notes", freshnessMin: 3, series: [3, 5, 7, 9, 12, 14, 18] }
      ],
      weather: {
        location: "New York",
        condition: "Partly cloudy",
        temperature: 68,
        high: 72,
        low: 61,
        unit: "F",
        source: "Local fallback",
        status: "offline-ready",
        updatedAt: now
      },
      timezones: [
        { id: "nyc", label: "New York", timezone: "America/New_York" },
        { id: "lon", label: "London", timezone: "Europe/London" },
        { id: "ber", label: "Berlin", timezone: "Europe/Berlin" },
        { id: "la", label: "Los Angeles", timezone: "America/Los_Angeles" }
      ],
      agenda: [
        { id: uid("agenda"), time: "09:00", title: "Planning review", category: "Work", status: "confirmed" },
        { id: uid("agenda"), time: "11:30", title: "Protected focus block", category: "Focus", status: "protected" },
        { id: uid("agenda"), time: "15:00", title: "Metrics check", category: "Review", status: "tentative" }
      ],
      notifications: [
        { id: uid("notice"), title: "Welcome to LiveDash v7", body: "Widgetify-style layout, launcher, dock, widgets, storage, and settings are active.", severity: "success", read: false, createdAt: now },
        { id: uid("notice"), title: "Offline safe", body: "Local modules continue working without network access.", severity: "info", read: false, createdAt: now }
      ],
      activity: [
        { id: uid("activity"), type: "system", title: "LiveDash v7 initialized", detail: "New Widgetify-inspired Chrome new tab dashboard created with English global defaults.", createdAt: now }
      ],
      widgetOrder: ["launcher", "commandCard", "timeWeather", "focus", "tasks", "notes", "metrics", "trend", "status", "agenda", "signals", "activity", "world"],
      hiddenWidgets: [],
      lastBackup: null
    };
  }

  function clone(value){ return JSON.parse(JSON.stringify(value)); }

  function mergeState(input){
    const base = createDefaultState();
    if(!input || typeof input !== "object") return base;
    const merged = Object.assign(base, input);
    merged.schemaVersion = VERSION;
    merged.settings = Object.assign(base.settings, input.settings || {});
    merged.filters = Object.assign(base.filters, input.filters || {});
    merged.focus = Object.assign(base.focus, input.focus || {});
    merged.links = Array.isArray(input.links) ? input.links : base.links;
    merged.tasks = Array.isArray(input.tasks) ? input.tasks : base.tasks;
    merged.notes = Array.isArray(input.notes) ? input.notes : base.notes;
    merged.metrics = Array.isArray(input.metrics) ? input.metrics : base.metrics;
    merged.weather = Object.assign(base.weather, input.weather || {});
    merged.timezones = Array.isArray(input.timezones) ? input.timezones : base.timezones;
    merged.agenda = Array.isArray(input.agenda || input.commitments) ? (input.agenda || input.commitments) : base.agenda;
    merged.notifications = Array.isArray(input.notifications) ? input.notifications : base.notifications;
    merged.activity = Array.isArray(input.activity) ? input.activity : base.activity;
    merged.widgetOrder = Array.isArray(input.widgetOrder) ? input.widgetOrder : base.widgetOrder;
    merged.hiddenWidgets = Array.isArray(input.hiddenWidgets) ? input.hiddenWidgets : base.hiddenWidgets;
    merged.updatedAt = new Date().toISOString();
    return merged;
  }

  global.LiveDashDefaults = { VERSION, STORAGE_KEY, LEGACY_KEYS, savedViews, navItems, moduleCatalog, wallpapers, createDefaultState, mergeState, clone, uid };
})(globalThis);
