(function(global){
  const VERSION = 8;
  const STORAGE_KEY = "livedash:v8:state";
  const LEGACY_KEYS = ["livedash:v7:state", "livedash:v6:state", "livedash:v5:state", "livedash:v4:state", "livedash-state", "LiveDashState"];

  const spans = [3, 4, 6, 8, 12];

  const savedViews = [
    { id: "executive", name: "Executive Overview", nav: "overview", template: "executive", description: "Outcome summary, critical signals, revenue trend, and owner activity." },
    { id: "focus", name: "Personal Focus", nav: "operations", template: "personal", description: "Tasks, focus session, schedule, notes, and quick links for daily execution." },
    { id: "operations", name: "Operations", nav: "operations", template: "operator", description: "Alerts, commitments, queues, activity, and operational health." },
    { id: "metrics", name: "Metrics", nav: "analytics", template: "analyst", description: "KPI cards, trend analysis, status distribution, and metric records." },
    { id: "minimal", name: "Minimal", nav: "overview", template: "minimal", description: "Quiet view with summary, focus, and the most important commitments." }
  ];

  const navItems = [
    { id: "overview", label: "Overview", icon: "OV" },
    { id: "analytics", label: "Analytics", icon: "AN" },
    { id: "operations", label: "Operations", icon: "OP" },
    { id: "alerts", label: "Alerts", icon: "AL" },
    { id: "reports", label: "Reports", icon: "RP" },
    { id: "activity", label: "Activity", icon: "AC" },
    { id: "admin", label: "Admin", icon: "AD" },
    { id: "settings", label: "Settings", icon: "ST" }
  ];

  const moduleCatalog = [
    { type: "command-summary", name: "Command Summary", category: "Operations", description: "Executive operating brief with goals, blockers, freshness, and next actions.", preview: "Brief + operating status", recommendedSpan: 8, sizes: [6, 8, 12], dataSource: "Local dashboard state", freshness: "Instant local updates", roles: ["Executive", "Operator"], permission: "None", behavior: "Shows empty state when no tasks or alerts exist." },
    { type: "priority-table", name: "Priority Task Table", category: "Tasks", description: "Structured task queue with priority, due date, status, and owner fields.", preview: "Sortable table", recommendedSpan: 8, sizes: [6, 8, 12], dataSource: "Chrome storage", freshness: "Instant local updates", roles: ["Operator", "Personal"], permission: "None", behavior: "Includes empty state and quick-add controls." },
    { type: "kpi-strip", name: "Metric Scorecards", category: "Metrics", description: "KPI cards with deltas, targets, sparkline trends, and freshness metadata.", preview: "4 metric cards", recommendedSpan: 12, sizes: [8, 12], dataSource: "Local seed metrics", freshness: "Every dashboard refresh", roles: ["Executive", "Analyst"], permission: "None", behavior: "Shows stale badge when freshness exceeds selected range." },
    { type: "revenue-trend", name: "Trend Analysis", category: "Metrics", description: "Large trend chart for operational momentum and period-over-period comparison.", preview: "Line chart", recommendedSpan: 8, sizes: [6, 8, 12], dataSource: "Local metric history", freshness: "Every dashboard refresh", roles: ["Analyst", "Executive"], permission: "None", behavior: "Includes drill-down drawer and export action." },
    { type: "status-distribution", name: "Status Distribution", category: "Metrics", description: "Distribution chart for workload, alert, or project status health.", preview: "Segmented bars", recommendedSpan: 4, sizes: [3, 4, 6], dataSource: "Tasks and alerts", freshness: "Instant local updates", roles: ["Operator", "Analyst"], permission: "None", behavior: "Falls back to empty state if no records exist." },
    { type: "schedule-commitments", name: "Schedule / Commitments", category: "Operations", description: "Today’s commitments and near-term operating timeline.", preview: "Agenda list", recommendedSpan: 4, sizes: [3, 4, 6], dataSource: "Local schedule", freshness: "Daily", roles: ["Operator", "Personal"], permission: "None", behavior: "Shows empty state for days without commitments." },
    { type: "alerts-queue", name: "Signals / Alerts", category: "Alerts", description: "Severity-ranked alerts with source, timestamp, acknowledgement, and stale-data handling.", preview: "Alert queue", recommendedSpan: 6, sizes: [4, 6, 8], dataSource: "Local signals", freshness: "Instant local updates", roles: ["Operator", "Admin"], permission: "None", behavior: "Includes acknowledged and unresolved states." },
    { type: "notes-followups", name: "Notes / Follow-ups", category: "Notes", description: "Searchable notes with tags, timestamps, edit, delete, and quick capture.", preview: "Notes grid", recommendedSpan: 6, sizes: [4, 6, 8], dataSource: "Chrome storage", freshness: "Instant local updates", roles: ["Personal", "Operator"], permission: "None", behavior: "Includes tagged empty state." },
    { type: "activity-feed", name: "Activity / History", category: "Team Activity", description: "Local audit trail for changes to modules, views, tasks, notes, imports, and settings.", preview: "Event stream", recommendedSpan: 4, sizes: [4, 6, 8, 12], dataSource: "Local activity log", freshness: "Instant local updates", roles: ["Admin", "Operator"], permission: "None", behavior: "Records important local actions automatically." },
    { type: "reports-surface", name: "Reports", category: "Reports", description: "Saved local report cards with status, time range, and export action.", preview: "Report cards", recommendedSpan: 6, sizes: [4, 6, 8], dataSource: "Local generated summaries", freshness: "Manual export", roles: ["Executive", "Analyst"], permission: "None", behavior: "Includes export and generated timestamps." },
    { type: "module-health", name: "Module Health", category: "Integrations", description: "Source health, refresh cadence, storage status, and offline readiness.", preview: "Health checks", recommendedSpan: 4, sizes: [3, 4, 6], dataSource: "Extension runtime", freshness: "Live", roles: ["Admin"], permission: "Storage", behavior: "Shows local-first capability and stale warnings." },
    { type: "quick-links", name: "Quick Links", category: "Personal Productivity", description: "Global-friendly launcher for work apps and frequently used URLs.", preview: "Link grid", recommendedSpan: 4, sizes: [3, 4, 6], dataSource: "Chrome bookmarks optional", freshness: "Manual sync", roles: ["Personal"], permission: "Bookmarks optional", behavior: "Supports add, edit, remove in edit mode." },
    { type: "focus-session", name: "Focus Session", category: "Personal Productivity", description: "A restrained focus timer for execution blocks without turning the product into a toy.", preview: "Timer card", recommendedSpan: 3, sizes: [3, 4], dataSource: "Local timer state", freshness: "Live", roles: ["Personal"], permission: "None", behavior: "Runs locally and logs session activity." },
    { type: "world-clock", name: "World Clocks", category: "Operations", description: "US/EU-friendly timezones for distributed operating rhythm.", preview: "Timezone rows", recommendedSpan: 3, sizes: [3, 4], dataSource: "Intl API", freshness: "Live", roles: ["Operator", "Personal"], permission: "None", behavior: "Uses user locale and configurable time format." },
    { type: "weather-readiness", name: "Weather Readiness", category: "Operations", description: "Global location label with offline-safe readiness summary.", preview: "Readiness status", recommendedSpan: 3, sizes: [3, 4], dataSource: "Local fallback", freshness: "Manual refresh", roles: ["Operations"], permission: "None", behavior: "Graceful fallback without region-locked APIs." },
    { type: "metrics-records", name: "Metric Records", category: "Metrics", description: "Accessible data table behind the headline metric cards.", preview: "Records table", recommendedSpan: 8, sizes: [6, 8, 12], dataSource: "Local metric records", freshness: "Every dashboard refresh", roles: ["Analyst"], permission: "None", behavior: "Sort-ready table with source metadata." }
  ];

  const templates = [
    { id: "executive", name: "Executive", density: "balanced", nav: "overview", modules: [
      { id: "m-summary", type: "command-summary", span: 8 },
      { id: "m-status", type: "status-distribution", span: 4 },
      { id: "m-kpis", type: "kpi-strip", span: 12 },
      { id: "m-trend", type: "revenue-trend", span: 8 },
      { id: "m-activity", type: "activity-feed", span: 4 },
      { id: "m-tasks", type: "priority-table", span: 8 },
      { id: "m-alerts", type: "alerts-queue", span: 4 },
      { id: "m-reports", type: "reports-surface", span: 6 },
      { id: "m-notes", type: "notes-followups", span: 6 }
    ]},
    { id: "operator", name: "Operator", density: "compact", nav: "operations", modules: [
      { id: "m-op-summary", type: "command-summary", span: 6 },
      { id: "m-op-alerts", type: "alerts-queue", span: 6 },
      { id: "m-op-tasks", type: "priority-table", span: 8 },
      { id: "m-op-schedule", type: "schedule-commitments", span: 4 },
      { id: "m-op-health", type: "module-health", span: 4 },
      { id: "m-op-world", type: "world-clock", span: 4 },
      { id: "m-op-activity", type: "activity-feed", span: 4 },
      { id: "m-op-notes", type: "notes-followups", span: 8 }
    ]},
    { id: "analyst", name: "Analyst", density: "balanced", nav: "analytics", modules: [
      { id: "m-an-kpis", type: "kpi-strip", span: 12 },
      { id: "m-an-trend", type: "revenue-trend", span: 8 },
      { id: "m-an-dist", type: "status-distribution", span: 4 },
      { id: "m-an-records", type: "metrics-records", span: 8 },
      { id: "m-an-reports", type: "reports-surface", span: 4 },
      { id: "m-an-activity", type: "activity-feed", span: 12 }
    ]},
    { id: "personal", name: "Personal Productivity", density: "balanced", nav: "operations", modules: [
      { id: "m-p-focus", type: "focus-session", span: 3 },
      { id: "m-p-weather", type: "weather-readiness", span: 3 },
      { id: "m-p-world", type: "world-clock", span: 3 },
      { id: "m-p-links", type: "quick-links", span: 3 },
      { id: "m-p-tasks", type: "priority-table", span: 8 },
      { id: "m-p-schedule", type: "schedule-commitments", span: 4 },
      { id: "m-p-notes", type: "notes-followups", span: 8 },
      { id: "m-p-activity", type: "activity-feed", span: 4 }
    ]},
    { id: "minimal", name: "Minimal", density: "spacious", nav: "overview", modules: [
      { id: "m-min-summary", type: "command-summary", span: 8 },
      { id: "m-min-focus", type: "focus-session", span: 4 },
      { id: "m-min-tasks", type: "priority-table", span: 6 },
      { id: "m-min-notes", type: "notes-followups", span: 6 }
    ]}
  ];

  const defaultLayouts = {
    executive: cloneTemplate("executive"),
    focus: cloneTemplate("personal"),
    operations: cloneTemplate("operator"),
    metrics: cloneTemplate("analyst"),
    minimal: cloneTemplate("minimal")
  };

  const wallpapers = [
    { id: "graphite", name: "Graphite Grid", mode: "dark", a: "#070a12", b: "#111827", c: "#263142", accent: "#7dd3fc" },
    { id: "deep-blue", name: "Deep Blue Operations", mode: "dark", a: "#06111f", b: "#0b1e36", c: "#123a59", accent: "#8ab4ff" },
    { id: "slate", name: "Slate Command", mode: "dark", a: "#0a0d12", b: "#171923", c: "#334155", accent: "#a7f3d0" },
    { id: "paper", name: "Light Paper", mode: "light", a: "#f8fafc", b: "#eef2f7", c: "#dce7f3", accent: "#2563eb" }
  ];

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function uid(prefix){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function iso(offsetHours){ return new Date(Date.now() + offsetHours * 3600000).toISOString(); }

  function cloneTemplate(id){
    const template = templates.find((item) => item.id === id) || templates[0];
    return clone(template.modules);
  }

  function createDefaultState(){
    const now = new Date().toISOString();
    return {
      schemaVersion: VERSION,
      createdAt: now,
      updatedAt: now,
      selectedView: "executive",
      selectedNav: "overview",
      editMode: false,
      timeRange: "7d",
      filters: { priority: "all", status: "all", query: "", source: "all" },
      settings: {
        theme: "dark",
        density: "balanced",
        wallpaper: "graphite",
        accent: "#7dd3fc",
        defaultView: "executive",
        timeFormat: "auto",
        reducedMotion: false,
        greetingName: "Operator",
        weatherLocation: "New York",
        showQuickDock: true,
        openModuleLibraryOnEdit: true,
        defaultModuleSpan: 4,
        refreshInterval: "manual"
      },
      views: {
        executive: { layout: clone(defaultLayouts.executive), versions: [] },
        focus: { layout: clone(defaultLayouts.focus), versions: [] },
        operations: { layout: clone(defaultLayouts.operations), versions: [] },
        metrics: { layout: clone(defaultLayouts.metrics), versions: [] },
        minimal: { layout: clone(defaultLayouts.minimal), versions: [] }
      },
      tasks: [
        { id: "task-1", title: "Review weekly operating risks", priority: "critical", status: "open", due: iso(8), owner: "You", source: "Operations", tags: ["ops", "risk"] },
        { id: "task-2", title: "Prepare dashboard export for Monday standup", priority: "high", status: "open", due: iso(28), owner: "You", source: "Reports", tags: ["report"] },
        { id: "task-3", title: "Follow up on blocked onboarding checklist", priority: "medium", status: "blocked", due: iso(48), owner: "You", source: "Tasks", tags: ["people"] },
        { id: "task-4", title: "Clean stale notes from yesterday", priority: "low", status: "open", due: iso(72), owner: "You", source: "Notes", tags: ["admin"] }
      ],
      notes: [
        { id: "note-1", title: "Operating principle", body: "Keep the dashboard workflow-first. Widgets are modules, not the product hierarchy.", tags: ["product", "principle"], createdAt: iso(-18), updatedAt: iso(-4) },
        { id: "note-2", title: "Weekly focus", body: "Measure flow, remove blockers, keep alerts actionable, and export a concise report.", tags: ["weekly"], createdAt: iso(-24), updatedAt: iso(-8) }
      ],
      links: [
        { id: "link-1", title: "Gmail", url: "https://mail.google.com", group: "Communication", color: "#fda4af" },
        { id: "link-2", title: "Calendar", url: "https://calendar.google.com", group: "Schedule", color: "#93c5fd" },
        { id: "link-3", title: "Drive", url: "https://drive.google.com", group: "Files", color: "#86efac" },
        { id: "link-4", title: "GitHub", url: "https://github.com", group: "Engineering", color: "#c4b5fd" },
        { id: "link-5", title: "Linear", url: "https://linear.app", group: "Operations", color: "#f0abfc" },
        { id: "link-6", title: "Notion", url: "https://notion.so", group: "Docs", color: "#d1d5db" }
      ],
      metrics: [
        { id: "metric-1", label: "Execution Index", value: 87, unit: "%", delta: 6.4, target: 90, period: "7 days", source: "Local score", freshness: now, trend: [68, 71, 72, 76, 81, 84, 87] },
        { id: "metric-2", label: "Open Risk", value: 5, unit: "", delta: -2, target: 3, period: "7 days", source: "Alerts", freshness: now, trend: [11, 9, 8, 7, 6, 5, 5] },
        { id: "metric-3", label: "Task Flow", value: 72, unit: "%", delta: 4.1, target: 80, period: "7 days", source: "Tasks", freshness: now, trend: [54, 59, 61, 64, 68, 69, 72] },
        { id: "metric-4", label: "Focus Hours", value: 9.5, unit: "h", delta: 1.8, target: 12, period: "7 days", source: "Focus", freshness: now, trend: [3, 4, 5, 5.5, 7, 8, 9.5] }
      ],
      metricRecords: [
        { id: "rec-1", metric: "Execution Index", owner: "Operations", value: "87%", target: "90%", status: "Watch", source: "Local score", updatedAt: now },
        { id: "rec-2", metric: "Open Risk", owner: "Admin", value: "5", target: "3", status: "Needs action", source: "Alerts", updatedAt: now },
        { id: "rec-3", metric: "Task Flow", owner: "Execution", value: "72%", target: "80%", status: "On track", source: "Tasks", updatedAt: now },
        { id: "rec-4", metric: "Focus Hours", owner: "Personal", value: "9.5h", target: "12h", status: "On track", source: "Focus", updatedAt: now }
      ],
      alerts: [
        { id: "alert-1", title: "Two critical tasks are due soon", severity: "critical", status: "open", source: "Tasks", createdAt: iso(-2), detail: "Review priorities and confirm owners." },
        { id: "alert-2", title: "Weather module is using offline fallback", severity: "warning", status: "open", source: "Weather", createdAt: iso(-7), detail: "No external API dependency is required. Configure location label if needed." },
        { id: "alert-3", title: "Report export is ready", severity: "info", status: "acknowledged", source: "Reports", createdAt: iso(-20), detail: "Weekly summary can be exported from Reports." }
      ],
      reports: [
        { id: "report-1", title: "Weekly Operations Brief", range: "7 days", status: "Ready", lastGenerated: iso(-4), owner: "You" },
        { id: "report-2", title: "Metrics Snapshot", range: "30 days", status: "Draft", lastGenerated: iso(-48), owner: "You" },
        { id: "report-3", title: "Alert Review", range: "7 days", status: "Ready", lastGenerated: iso(-10), owner: "You" }
      ],
      schedule: [
        { id: "sched-1", time: "09:00", title: "Operating review", type: "Review", status: "confirmed" },
        { id: "sched-2", time: "11:30", title: "Focus block", type: "Execution", status: "planned" },
        { id: "sched-3", time: "15:00", title: "Metrics cleanup", type: "Analytics", status: "planned" }
      ],
      worldClocks: [
        { id: "tz-ny", label: "New York", timeZone: "America/New_York" },
        { id: "tz-lon", label: "London", timeZone: "Europe/London" },
        { id: "tz-ber", label: "Berlin", timeZone: "Europe/Berlin" },
        { id: "tz-sf", label: "San Francisco", timeZone: "America/Los_Angeles" }
      ],
      weather: { location: "New York", temperature: 64, condition: "Operational", updatedAt: iso(-1), source: "Offline-safe local fallback" },
      focus: { active: false, durationMin: 25, startedAt: null, endsAt: null, completedSessions: 3 },
      notifications: [
        { id: "notice-1", title: "Welcome to LiveDash v8", body: "Module-first personalization is now constrained by enterprise dashboard structure.", severity: "info", read: false, createdAt: now },
        { id: "notice-2", title: "Local-first storage active", body: "Dashboard state persists with chrome.storage.local and offline fallback.", severity: "success", read: false, createdAt: now }
      ],
      activity: [
        { id: "activity-1", type: "release", title: "LiveDash v8 initialized", detail: "Enterprise module system, saved templates, and local audit trail are active.", createdAt: now }
      ],
      undoStack: [],
      redoStack: [],
      lastBackup: null
    };
  }

  function sanitizeModule(module){
    const item = Object.assign({ id: uid("module"), type: "command-summary", span: 4 }, module || {});
    item.span = spans.includes(Number(item.span)) ? Number(item.span) : 4;
    if(!moduleCatalog.some((catalog) => catalog.type === item.type)) item.type = "command-summary";
    return item;
  }

  function normalizeLayout(layout, fallback){
    const source = Array.isArray(layout) && layout.length ? layout : fallback;
    return source.map(sanitizeModule);
  }

  function mergeState(input){
    const base = createDefaultState();
    if(!input || typeof input !== "object") return base;
    const state = Object.assign(base, clone(input));
    state.schemaVersion = VERSION;
    state.settings = Object.assign(base.settings, input.settings || {});
    state.filters = Object.assign(base.filters, input.filters || {});
    state.views = Object.assign({}, base.views, input.views || {});
    savedViews.forEach((view) => {
      const existing = state.views[view.id] || {};
      state.views[view.id] = {
        layout: normalizeLayout(existing.layout, defaultLayouts[view.id] || defaultLayouts.executive),
        versions: Array.isArray(existing.versions) ? existing.versions.slice(0, 20) : []
      };
    });
    state.selectedView = savedViews.some((view) => view.id === state.selectedView) ? state.selectedView : state.settings.defaultView || "executive";
    state.selectedNav = navItems.some((item) => item.id === state.selectedNav) ? state.selectedNav : savedViews.find((view) => view.id === state.selectedView)?.nav || "overview";
    state.tasks = Array.isArray(input.tasks) ? input.tasks : base.tasks;
    state.notes = Array.isArray(input.notes) ? input.notes : base.notes;
    state.links = Array.isArray(input.links) ? input.links : base.links;
    state.metrics = Array.isArray(input.metrics) ? input.metrics : base.metrics;
    state.metricRecords = Array.isArray(input.metricRecords) ? input.metricRecords : base.metricRecords;
    state.alerts = Array.isArray(input.alerts) ? input.alerts : base.alerts;
    state.reports = Array.isArray(input.reports) ? input.reports : base.reports;
    state.schedule = Array.isArray(input.schedule) ? input.schedule : base.schedule;
    state.worldClocks = Array.isArray(input.worldClocks) ? input.worldClocks : base.worldClocks;
    state.notifications = Array.isArray(input.notifications) ? input.notifications : base.notifications;
    state.activity = Array.isArray(input.activity) ? input.activity : base.activity;
    state.undoStack = Array.isArray(input.undoStack) ? input.undoStack.slice(0, 25) : [];
    state.redoStack = Array.isArray(input.redoStack) ? input.redoStack.slice(0, 25) : [];
    state.updatedAt = input.updatedAt || base.updatedAt;
    return state;
  }

  global.LiveDashDefaults = { VERSION, STORAGE_KEY, LEGACY_KEYS, spans, savedViews, navItems, moduleCatalog, templates, wallpapers, createDefaultState, mergeState, clone, uid };
})(globalThis);
