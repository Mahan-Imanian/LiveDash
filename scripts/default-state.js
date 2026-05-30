(function(global){
  const VERSION = 5;
  const STORAGE_KEY = "livedash.v5.state";
  const LEGACY_KEYS = ["livedash.v4.state", "livedashState", "LiveDashState", "livedash-v3-state", "livedash.v3.state"];

  const savedViews = [
    { id: "executive", name: "Executive Overview", description: "Command summary, metrics, priority risk, and schedule." },
    { id: "focus", name: "Personal Focus", description: "Current time, focus timer, priority queue, notes, and activity." },
    { id: "operations", name: "Operations", description: "Signals, agenda, weather readiness, links, and history." },
    { id: "metrics", name: "Metrics", description: "KPI cards, trend panel, distribution, and source freshness." },
    { id: "minimal", name: "Minimal", description: "Quiet operating surface with only essentials." }
  ];

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "focus", label: "Focus" },
    { id: "tasks", label: "Tasks" },
    { id: "metrics", label: "Metrics" },
    { id: "calendar", label: "Calendar" },
    { id: "notes", label: "Notes" },
    { id: "activity", label: "Activity" },
    { id: "settings", label: "Settings" }
  ];

  const moduleCatalog = [
    { id: "summary", title: "Command Summary", category: "overview", span: 12, description: "Executive state, risk, and next operating move." },
    { id: "clock", title: "Clock", category: "overview", span: 3, description: "Local time, date, and timezone-aware operating context." },
    { id: "search", title: "Command Search", category: "tools", span: 5, description: "Quick web search and command entry point." },
    { id: "weather", title: "Weather Readiness", category: "signals", span: 4, description: "Offline-safe weather context with explicit freshness." },
    { id: "timezones", title: "Global Timezones", category: "operations", span: 4, description: "US and European business-hour awareness." },
    { id: "priorities", title: "Today’s Priorities", category: "focus", span: 8, description: "Priority task table with due dates and status." },
    { id: "focusTimer", title: "Focus Command", category: "focus", span: 4, description: "Local focus session and completion tracking." },
    { id: "metrics", title: "Operational Metrics", category: "metrics", span: 12, description: "Metric cards with trends, targets, source, and freshness." },
    { id: "trend", title: "Trend Analysis", category: "metrics", span: 8, description: "Primary trend panel for the selected time range." },
    { id: "distribution", title: "Status Distribution", category: "metrics", span: 4, description: "Status distribution for tasks and alerts." },
    { id: "schedule", title: "Schedule / Commitments", category: "calendar", span: 6, description: "Agenda and compact local calendar." },
    { id: "signals", title: "Signals / Alerts", category: "operations", span: 6, description: "Local notification center and stale-data warnings." },
    { id: "notes", title: "Notes / Follow-ups", category: "notes", span: 6, description: "Searchable notes with tags and timestamps." },
    { id: "activity", title: "Activity / History", category: "activity", span: 6, description: "Persistent local activity and audit history." },
    { id: "links", title: "Launchpad", category: "tools", span: 4, description: "Global quick links for daily work." }
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
        defaultView: "executive",
        selectedView: "executive",
        activeSection: "overview",
        timeRange: "7d",
        timeFormat: "auto",
        filterOpen: false,
        editMode: false,
        reducedMotion: false,
        showSignals: true,
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
        { id: uid("task"), title: "Review weekly operating plan", priority: "critical", status: "open", due: iso(0), source: "Manual", owner: "You" },
        { id: uid("task"), title: "Prepare product review follow-ups", priority: "high", status: "open", due: iso(1), source: "Notes", owner: "You" },
        { id: uid("task"), title: "Validate dashboard metrics targets", priority: "medium", status: "blocked", due: iso(2), source: "Metrics", owner: "You" },
        { id: uid("task"), title: "Archive completed release checklist", priority: "low", status: "done", due: iso(-1), source: "Activity", owner: "You" }
      ],
      notes: [
        { id: uid("note"), title: "Release quality bar", body: "Validate install flow, storage persistence, keyboard access, responsive layout, and import/export before shipping.", tags: ["release", "qa"], createdAt: iso(-1), updatedAt: iso(-1) },
        { id: uid("note"), title: "Metrics review", body: "Prioritize freshness, target variance, and drill-down clarity before adding more modules.", tags: ["metrics"], createdAt: iso(-2), updatedAt: iso(-2) }
      ],
      metrics: [
        { id: "readiness", label: "Readiness", value: 92, suffix: "%", delta: 4.8, target: 95, period: "7d", source: "Local dashboard", freshnessMin: 3, series: [72, 76, 75, 81, 86, 89, 92] },
        { id: "focus", label: "Focus hours", value: 14.5, suffix: "h", delta: 2.1, target: 18, period: "7d", source: "Focus timer", freshnessMin: 8, series: [6, 7.5, 8, 10, 11.5, 13, 14.5] },
        { id: "completion", label: "Task completion", value: 78, suffix: "%", delta: -1.2, target: 85, period: "7d", source: "Task table", freshnessMin: 1, series: [67, 70, 73, 75, 81, 80, 78] },
        { id: "signals", label: "Healthy signals", value: 11, suffix: "", delta: 3, target: 12, period: "today", source: "Extension runtime", freshnessMin: 5, series: [7, 8, 8, 9, 10, 10, 11] }
      ],
      commitments: [
        { id: uid("commit"), time: "09:00", title: "Planning review", type: "Calendar", status: "confirmed" },
        { id: uid("commit"), time: "11:30", title: "Protected focus block", type: "Focus", status: "protected" },
        { id: uid("commit"), time: "15:00", title: "Metrics checkpoint", type: "Review", status: "tentative" }
      ],
      links: [
        { id: uid("link"), title: "Calendar", url: "https://calendar.google.com", category: "Work" },
        { id: uid("link"), title: "Gmail", url: "https://mail.google.com", category: "Work" },
        { id: uid("link"), title: "Docs", url: "https://docs.google.com", category: "Work" },
        { id: uid("link"), title: "GitHub", url: "https://github.com", category: "Engineering" }
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
        { id: uid("notice"), title: "LiveDash is extension-native", body: "New tab, popup, options, and background refresh are active with local storage.", severity: "success", read: false, createdAt: now },
        { id: uid("notice"), title: "Review blocked task", body: "One task is marked blocked and needs a decision.", severity: "warning", read: false, createdAt: iso(-1) }
      ],
      activity: [
        { id: uid("activity"), type: "system", title: "LiveDash v5 initialized", detail: "Chrome extension state created with English global defaults and command-center layout.", createdAt: now }
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

  global.LiveDashDefaults = { VERSION, STORAGE_KEY, LEGACY_KEYS, savedViews, navItems, moduleCatalog, createDefaultState, mergeState, clone, uid };
})(globalThis);
