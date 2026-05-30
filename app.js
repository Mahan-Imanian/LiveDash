(() => {
  const STORAGE_KEY = "livedash:v3-release";
  const WORKSPACE_KEY = "livedash:workspace";
  const WORKSPACE_LIST_KEY = "livedash:workspaces";
  const HISTORY_KEY = "livedash:history";
  const FIRST_LOAD_KEY = "livedash:first-load";
  const CATALOG_KEY = "livedash:catalog";
  const DEFAULTS = {
    version: 3,
    theme: "dark",
    background: "aurora",
    layout: { cols: 4, density: "comfortable", card: "glass", locked: false },
    permissions: ["network:weather", "network:prices", "network:search"],
    resources: ["geolocation"],
    widgets: []
  };

  const WIDGET_CATALOG = [
    {
      type: "clock",
      title: "Clock",
      tags: ["daily", "info"],
      desc: "Local time + date with seconds.",
      permissions: [],
      resources: [],
      defaults: { tz: "local", seconds: true, format24: false }
    },
    {
      type: "calendar",
      title: "Calendar",
      tags: ["daily", "info"],
      desc: "Month view with quick highlights.",
      permissions: [],
      resources: [],
      defaults: { highlightWeekends: true }
    },
    {
      type: "timezone",
      title: "Timezones",
      tags: ["daily", "info"],
      desc: "Track multiple cities at a glance.",
      permissions: [],
      resources: [],
      defaults: { zones: [{ label: "San Francisco", zone: "America/Los_Angeles" }, { label: "London", zone: "Europe/London" }, { label: "Tokyo", zone: "Asia/Tokyo" }] }
    },
    {
      type: "weather",
      title: "Weather",
      tags: ["daily", "info"],
      desc: "Current conditions via Open-Meteo.",
      permissions: ["network:weather"],
      resources: ["geolocation"],
      defaults: { city: "New York", units: "metric", autoLocation: true }
    },
    {
      type: "prices",
      title: "Prices",
      tags: ["info", "daily"],
      desc: "Crypto + currency tickers with caching.",
      permissions: ["network:prices"],
      resources: [],
      defaults: { assets: ["bitcoin", "ethereum"], fx: ["USD", "EUR"] }
    },
    {
      type: "focus",
      title: "Focus Timer",
      tags: ["focus", "tools"],
      desc: "Pomodoro-style timer with ambient mode.",
      permissions: [],
      resources: [],
      defaults: { workMin: 25, breakMin: 5, longBreakMin: 15, every: 4 }
    },
    {
      type: "todos",
      title: "Tasks",
      tags: ["daily", "tools"],
      desc: "Fast todo list that persists locally.",
      permissions: [],
      resources: [],
      defaults: { showCompleted: true }
    },
    {
      type: "notes",
      title: "Notes",
      tags: ["daily", "tools"],
      desc: "Quick notes with autosave.",
      permissions: [],
      resources: [],
      defaults: { placeholder: "Write anything…" }
    },
    {
      type: "search",
      title: "Smart Search",
      tags: ["daily", "tools"],
      desc: "Search the web or jump to apps fast.",
      permissions: ["network:search"],
      resources: [],
      defaults: { provider: "duckduckgo" }
    },
    {
      type: "links",
      title: "Quick Links",
      tags: ["daily", "tools"],
      desc: "Launch your daily sites fast.",
      permissions: [],
      resources: [],
      defaults: { links: [{ name: "Gmail", url: "https://mail.google.com" }, { name: "Calendar", url: "https://calendar.google.com" }] }
    },
    {
      type: "bookmarks",
      title: "Bookmarks",
      tags: ["daily", "tools"],
      desc: "Taggable bookmarks with quick filter.",
      permissions: [],
      resources: [],
      defaults: { bookmarks: [{ title: "Docs", url: "https://developer.mozilla.org", tags: ["docs"] }] }
    },
    {
      type: "stats",
      title: "Today",
      tags: ["daily", "info"],
      desc: "Simple daily KPIs you can reset.",
      permissions: [],
      resources: [],
      defaults: { counters: [{ k: "Water", v: 0 }, { k: "Steps", v: 0 }, { k: "Deep work", v: 0 }] }
    },
    {
      type: "agenda",
      title: "Agenda",
      tags: ["daily", "tools"],
      desc: "Today’s schedule with time blocks.",
      permissions: [],
      resources: [],
      defaults: { blocks: [{ time: "09:00", title: "Team standup", note: "Zoom" }, { time: "13:00", title: "Deep work", note: "Roadmap" }] }
    },
    {
      type: "habits",
      title: "Habits",
      tags: ["daily", "focus"],
      desc: "Track daily habits with streaks.",
      permissions: [],
      resources: [],
      defaults: { habits: [{ name: "Workout", streak: 3 }, { name: "Reading", streak: 7 }, { name: "Meditation", streak: 5 }] }
    },
    {
      type: "pulse",
      title: "Pulse Metrics",
      tags: ["info", "daily"],
      desc: "High-level business metrics to update daily.",
      permissions: [],
      resources: [],
      defaults: { metrics: [{ label: "MRR", value: "$24.3k", delta: "+4.2%" }, { label: "Active users", value: "12,480", delta: "+1.8%" }, { label: "Churn", value: "2.1%", delta: "-0.3%" }] }
    },
    {
      type: "quote",
      title: "Daily Inspiration",
      tags: ["info", "daily"],
      desc: "Motivational quote and focus mantra.",
      permissions: [],
      resources: [],
      defaults: { source: "Curated", quotes: ["Stay curious.", "Progress over perfection.", "Do the hard thing first."] }
    },
    {
      type: "ambient",
      title: "Ambient Focus",
      tags: ["focus", "tools"],
      desc: "Play ambient soundscapes and set focus mode.",
      permissions: [],
      resources: [],
      defaults: { sound: "Rain", durationMin: 45, volume: 60 }
    }
  ];

  const WIDGET_SKIN = {
    clock: { icon: "◷", accent: "#d8b46a", size: 1 },
    calendar: { icon: "▦", accent: "#8bd3ff", size: 2 },
    timezone: { icon: "◴", accent: "#a78bfa", size: 1 },
    weather: { icon: "☁", accent: "#67e8f9", size: 2 },
    prices: { icon: "↗", accent: "#4ade80", size: 2 },
    focus: { icon: "◎", accent: "#f59e0b", size: 2 },
    todos: { icon: "✓", accent: "#c4b5fd", size: 2 },
    notes: { icon: "✎", accent: "#f9a8d4", size: 2 },
    search: { icon: "⌕", accent: "#93c5fd", size: 2 },
    links: { icon: "↳", accent: "#5eead4", size: 2 },
    bookmarks: { icon: "◇", accent: "#fb7185", size: 2 },
    stats: { icon: "▤", accent: "#bef264", size: 1 },
    agenda: { icon: "≡", accent: "#fcd34d", size: 2 },
    habits: { icon: "◆", accent: "#86efac", size: 2 },
    pulse: { icon: "∿", accent: "#7dd3fc", size: 3 },
    quote: { icon: "“", accent: "#fda4af", size: 1 },
    ambient: { icon: "≈", accent: "#99f6e4", size: 1 }
  };

  const DASHBOARD_PRESETS = {
    daily: [
      ["clock", 1],
      ["weather", 2],
      ["focus", 2],
      ["pulse", 3],
      ["agenda", 2],
      ["todos", 2],
      ["notes", 2],
      ["calendar", 2],
      ["search", 2],
      ["links", 2],
      ["habits", 2],
      ["prices", 2],
      ["timezone", 1],
      ["stats", 1],
      ["quote", 1],
      ["ambient", 1]
    ],
    focus: [
      ["clock", 1],
      ["focus", 2],
      ["ambient", 1],
      ["todos", 2],
      ["notes", 2],
      ["quote", 1]
    ],
    minimal: [
      ["clock", 1],
      ["focus", 2],
      ["notes", 2],
      ["todos", 2]
    ]
  };

  const WIDGET_REGISTRY = new Map();

  function registerWidget(type, renderer, meta = {}) {
    if (!type || typeof renderer !== "function") return;
    WIDGET_REGISTRY.set(type, { renderer, meta });
    if (meta && Object.keys(meta).length) {
      const existing = WIDGET_CATALOG.find(item => item.type === type);
      if (existing) {
        Object.assign(existing, meta);
      } else {
        WIDGET_CATALOG.push({ type, ...meta });
      }
    }
  }

  function getWidgetMeta(type) {
    const catalog = WIDGET_CATALOG.find(item => item.type === type) || {};
    const registered = WIDGET_REGISTRY.get(type)?.meta || {};
    return { ...catalog, ...registered };
  }

  function getWidgetAccess(type) {
    const meta = getWidgetMeta(type);
    const requiredPermissions = Array.isArray(meta.permissions) ? meta.permissions : [];
    const requiredResources = Array.isArray(meta.resources) ? meta.resources : [];
    const allowedPermissions = new Set(app.state?.permissions || []);
    const allowedResources = new Set(app.state?.resources || []);
    const missingPermissions = requiredPermissions.filter(item => !allowedPermissions.has(item));
    const missingResources = requiredResources.filter(item => !allowedResources.has(item));
    return {
      allowed: missingPermissions.length === 0 && missingResources.length === 0,
      missingPermissions,
      missingResources
    };
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
  const SWR_TTL_MS = 20 * 60 * 1000;
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  let activeTrap = null;

  function trapFocus(container) {
    const focusable = () => $$(FOCUSABLE, container).filter(el => !el.disabled && el.offsetParent !== null);
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKey);
    const first = focusable()[0];
    if (first) first.focus();
    return () => container.removeEventListener("keydown", onKey);
  }

  const app = {
    state: null,
    workspace: "Work",
    workspaces: [],
    history: [],
    drag: { id: null, over: null },
    modalMode: "layout",
    catalogFilter: "all",
    ui: { catalogCollapsed: false, catalogOpen: false },
    focus: { running: false, until: 0, mode: "off", tick: null }
  };

  function nowString() {
    const d = new Date();
    return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" }) + " • " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function setTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    app.state.theme = t;
    save();
  }

  function applyBackground() {
    const bg = app.state.background || "aurora";
    document.body.dataset.bg = bg;
  }

  function applyLayout() {
    const { cols, density, card } = app.state.layout;
    const safeCols = Math.max(2, Math.min(6, Number(cols) || 4));
    const safeDensity = density === "compact" ? "compact" : "comfortable";
    const safeCard = card === "solid" ? "solid" : "glass";
    document.documentElement.style.setProperty("--cols", String(safeCols));
    document.documentElement.style.setProperty("--grid-max-cols", String(safeCols));
    document.documentElement.style.setProperty("--density", safeDensity === "compact" ? "1.35" : "1");
    document.documentElement.style.setProperty("--card", safeCard);
    document.body.dataset.locked = app.state.layout.locked ? "true" : "false";
    document.body.dataset.card = safeCard;
    document.body.dataset.density = safeDensity;
  }

  function loadCatalogState() {
    try {
      const raw = localStorage.getItem(CATALOG_KEY);
      if (!raw) return { collapsed: false };
      const parsed = JSON.parse(raw);
      return { collapsed: !!parsed.collapsed };
    } catch {
      return { collapsed: false };
    }
  }

  function saveCatalogState() {
    localStorage.setItem(CATALOG_KEY, JSON.stringify({ collapsed: app.ui.catalogCollapsed }));
  }

  function applyCatalogState() {
    document.body.classList.toggle("catalog-collapsed", app.ui.catalogCollapsed);
    $("#btnCatalog")?.setAttribute("aria-expanded", String(!app.ui.catalogCollapsed));
    if (!window.matchMedia("(max-width: 1100px)").matches) {
      document.body.classList.remove("catalog-open");
      $("#catalogBackdrop").hidden = true;
    }
  }

  function openCatalog() {
    if (window.matchMedia("(max-width: 1100px)").matches) {
      app.ui.catalogOpen = true;
      document.body.classList.add("catalog-open");
      $("#catalogBackdrop").hidden = false;
      $("#btnCatalog")?.setAttribute("aria-expanded", "true");
      activeTrap?.();
      activeTrap = trapFocus($("#catalogPanel"));
      renderGallery();
      return;
    }
    app.ui.catalogCollapsed = false;
    applyCatalogState();
    saveCatalogState();
    renderGallery();
  }

  function closeCatalog() {
    if (!window.matchMedia("(max-width: 1100px)").matches) return;
    app.ui.catalogOpen = false;
    document.body.classList.remove("catalog-open");
    $("#catalogBackdrop").hidden = true;
    $("#btnCatalog")?.setAttribute("aria-expanded", "false");
    activeTrap?.();
    activeTrap = null;
  }

  function toggleCatalog() {
    if (window.matchMedia("(max-width: 1100px)").matches) {
      if (app.ui.catalogOpen) {
        closeCatalog();
      } else {
        openCatalog();
      }
      return;
    }
    app.ui.catalogCollapsed = !app.ui.catalogCollapsed;
    applyCatalogState();
    saveCatalogState();
  }

  function getWorkspaceKey(name) {
    return `${STORAGE_KEY}:${name}`;
  }

  function loadWorkspace(name) {
    try {
      const raw = localStorage.getItem(getWorkspaceKey(name)) || localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULTS);
      const s = { ...structuredClone(DEFAULTS), ...parsed };
      if (!Array.isArray(s.widgets)) s.widgets = [];
      if (!s.layout) s.layout = structuredClone(DEFAULTS.layout);
      if (!s.layout.cols) s.layout.cols = 4;
      if (!s.layout.density) s.layout.density = "comfortable";
      if (!s.layout.card) s.layout.card = "glass";
      if (typeof s.layout.locked !== "boolean") s.layout.locked = false;
      if (!s.theme) s.theme = "dark";
      if (!s.background) s.background = "aurora";
      if (!s.version) s.version = 3;
      if (!Array.isArray(s.permissions)) s.permissions = structuredClone(DEFAULTS.permissions);
      if (!Array.isArray(s.resources)) s.resources = structuredClone(DEFAULTS.resources);
      return s;
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  function saveWorkspace(name) {
    localStorage.setItem(getWorkspaceKey(name), JSON.stringify(app.state));
  }

  function save() {
    saveWorkspace(app.workspace);
  }

  function loadWorkspaceList() {
    const fallback = ["Work", "Personal", "Minimal"];
    const raw = localStorage.getItem(WORKSPACE_LIST_KEY);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function saveWorkspaceList() {
    localStorage.setItem(WORKSPACE_LIST_KEY, JSON.stringify(app.workspaces));
  }

  function getHistoryKey(name) {
    return `${HISTORY_KEY}:${name}`;
  }

  function loadHistory(name) {
    try {
      const raw = localStorage.getItem(getHistoryKey(name));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(name) {
    localStorage.setItem(getHistoryKey(name), JSON.stringify(app.history.slice(-10)));
  }

  function pushHistory() {
    app.history.push({
      widgets: structuredClone(app.state.widgets),
      layout: structuredClone(app.state.layout)
    });
    saveHistory(app.workspace);
  }

  function undo() {
    const prev = app.history.pop();
    if (!prev) {
      toast("Nothing to undo");
      return;
    }
    app.state.widgets = prev.widgets;
    app.state.layout = prev.layout;
    save();
    applyLayout();
    renderGrid();
    updateWeatherPill();
  }

  function setWorkspace(name) {
    if (!name) return;
    if (app.workspace === name) return;
    saveWorkspace(app.workspace);
    app.workspace = name;
    localStorage.setItem(WORKSPACE_KEY, name);
    app.state = loadWorkspace(name);
    app.history = loadHistory(name);
    setTheme(app.state.theme);
    applyBackground();
    applyLayout();
    renderGrid();
    updateWeatherPill();
    syncFocusPill();
    renderWorkspaceSelect();
    updateChrome();
    toast(`Workspace: ${name}`);
  }

  function renderWorkspaceSelect() {
    const sel = $("#workspaceSel");
    if (!sel) return;
    sel.innerHTML = "";
    for (const name of app.workspaces) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === app.workspace) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function widgetSkin(type) {
    return WIDGET_SKIN[type] || { icon: "◆", accent: "#d8b46a", size: 2 };
  }

  function updateChrome() {
    const widgetCount = app.state?.widgets?.length || 0;
    const workspace = app.workspace || "Work";
    const focusWidget = app.state?.widgets?.find(w => w.type === "focus");
    const lockState = app.state?.layout?.locked ? "Locked" : "Open";
    const set = (id, value) => {
      const el = $(id);
      if (el) el.textContent = value;
    };
    set("#workspaceCount", workspace);
    set("#widgetCount", String(widgetCount));
    set("#focusState", focusWidget ? "Ready" : "Off");
    set("#systemState", navigator.onLine ? "Online" : "Offline");
    set("#boardMeta", `${lockState} board • ${widgetCount} modules • ${app.state?.layout?.cols || 4} desktop columns`);
    document.body.dataset.ready = "true";
    document.title = `${workspace} · LiveDash v3`;
  }

  function defaultDashboard(preset = "daily") {
    const mk = (type, size = 2, overrides = {}) => {
      const cat = WIDGET_CATALOG.find(x => x.type === type);
      const base = cat ? cat.defaults : {};
      return {
        id: uid(),
        type,
        title: (cat?.title ?? type),
        size: size || widgetSkin(type).size,
        accent: widgetSkin(type).accent,
        options: { ...structuredClone(base), ...overrides }
      };
    };
    const list = DASHBOARD_PRESETS[preset] || DASHBOARD_PRESETS.daily;
    return {
      ...structuredClone(DEFAULTS),
      widgets: list.map(([type, size]) => mk(type, size))
    };
  }

  function setStatus() {
    $("#pillNow").textContent = nowString();
    $("#footerNet").textContent = navigator.onLine ? "Online" : "Offline";
    $(".dot").style.background = navigator.onLine ? "var(--ok)" : "var(--warn)";
    updateChrome();
  }

  function toast(text) {
    const host = $("#toastHost") || document.body;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function openModal(mode) {
    app.modalMode = mode;
    const modal = $("#modal");
    modal.hidden = false;
    $("#layoutBox").hidden = mode !== "layout";
    if (mode === "layout") renderLayoutControls();
    activeTrap?.();
    activeTrap = trapFocus(modal);
  }

  function closeModal() {
    $("#modal").hidden = true;
    activeTrap?.();
    activeTrap = null;
  }

  function openDrawer(drawer) {
    if (!drawer) return;
    drawer.hidden = false;
    const panel = $(".drawer-panel", drawer);
    activeTrap?.();
    activeTrap = trapFocus(panel || drawer);
  }

  function closeDrawer(drawer) {
    if (!drawer) return;
    drawer.hidden = true;
    activeTrap?.();
    activeTrap = null;
  }

  function renderGallery() {
    const q = ($("#widgetSearch").value || "").trim().toLowerCase();
    const f = app.catalogFilter || "all";

    const items = WIDGET_CATALOG
      .filter(w => {
        const inText = !q || (w.title.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q) || w.tags.join(" ").includes(q));
        const inFilter = f === "all" || w.tags.includes(f);
        return inText && inFilter;
      });

    const g = $("#galleryGrid");
    if (!g) return;
    g.innerHTML = "";
    for (const w of items) {
      const skin = widgetSkin(w.type);
      const card = document.createElement("div");
      card.className = "gcard";
      card.tabIndex = 0;
      card.role = "button";
      card.setAttribute("aria-label", `Add ${w.title}`);
      card.style.setProperty("--gaccent", skin.accent);
      card.innerHTML = `
        <div class="gicon" aria-hidden="true">${escapeHtml(skin.icon)}</div>
        <div class="gbody">
          <div class="gtitle">${escapeHtml(w.title)}</div>
          <div class="gmeta">${escapeHtml(w.desc)}</div>
          <div class="gtags">${w.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
        </div>
      `;
      const add = () => addWidget(w.type);
      card.addEventListener("click", add);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          add();
        }
      });
      g.appendChild(card);
    }
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "settings-hint";
      empty.textContent = "No modules match the current filter.";
      g.appendChild(empty);
    }
  }

  function renderLayoutControls() {
    $("#densitySel").value = app.state.layout.density;
    $("#cardSel").value = app.state.layout.card;
    $("#colsRange").value = String(app.state.layout.cols);
    $("#colsVal").textContent = String(app.state.layout.cols);
    $("#bgSel").value = app.state.background || "aurora";
    $("#lockToggle").checked = !!app.state.layout.locked;
  }

  function setCatalogFilter(filter) {
    app.catalogFilter = filter;
    $$("#widgetFilters .seg-btn").forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    renderGallery();
  }

  function setIoMode(mode) {
    const tabs = $$("#ioTabs .seg-btn");
    tabs.forEach(btn => {
      const active = btn.dataset.io === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    $("#ioExport").hidden = mode !== "export";
    $("#ioImport").hidden = mode !== "import";
    if (mode === "export") {
      $("#exportText").value = JSON.stringify(app.state, null, 2);
    }
  }

  function openIoDrawer(mode) {
    setIoMode(mode);
    openDrawer($("#ioDrawer"));
  }

  function addWidget(type) {
    const cat = WIDGET_CATALOG.find(x => x.type === type);
    const w = {
      id: uid(),
      type,
      title: cat?.title ?? type,
      size: widgetSkin(type).size,
      accent: widgetSkin(type).accent,
      options: structuredClone(cat?.defaults ?? {})
    };
    pushHistory();
    app.state.widgets.unshift(w);
    save();
    renderGrid();
    closeCatalog();
    toast("Module added");
    updateWeatherPill();
    updateChrome();
  }

  function removeWidget(id) {
    pushHistory();
    app.state.widgets = app.state.widgets.filter(w => w.id !== id);
    save();
    renderGrid();
    updateWeatherPill();
    updateChrome();
  }

  function moveWidget(fromId, toId) {
    const a = app.state.widgets;
    const from = a.findIndex(w => w.id === fromId);
    const to = a.findIndex(w => w.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    pushHistory();
    const [item] = a.splice(from, 1);
    a.splice(to, 0, item);
    save();
    renderGrid();
  }

  function renderGrid() {
    applyLayout();
    const grid = $("#grid");
    grid.innerHTML = "";

    if (!app.state.widgets.length) {
      renderEmptyState();
      return;
    }

    for (const w of app.state.widgets) {
      const node = $("#tplWidget").content.firstElementChild.cloneNode(true);
      node.dataset.id = w.id;
      node.dataset.type = w.type;
      node.dataset.size = String(w.size || 2);
      node.style.setProperty("--accent", w.accent || "#7c5cff");
      node.draggable = !app.state.layout.locked;
      node.classList.toggle("is-locked", app.state.layout.locked);

      const skin = widgetSkin(w.type);
      const icon = $(".card-icon", node);
      if (icon) icon.textContent = skin.icon;

      const title = $(".card-title", node);
      title.value = w.title || w.type;
      title.addEventListener("change", () => {
        w.title = title.value.trim().slice(0, 60) || (WIDGET_CATALOG.find(x => x.type === w.type)?.title ?? w.type);
        save();
      });

      const sizeSel = $('[data-act="size"]', node);
      sizeSel.value = String(w.size || 2);
      sizeSel.addEventListener("change", () => {
        pushHistory();
        w.size = Number(sizeSel.value) || 2;
        node.dataset.size = String(w.size);
        save();
      });

      $('[data-act="remove"]', node).addEventListener("click", () => removeWidget(w.id));
      $('[data-act="refresh"]', node).addEventListener("click", () => refreshWidget(w.id));
      $('[data-act="settings"]', node).addEventListener("click", () => openSettings(w));

      if (!app.state.layout.locked) {
        wireDnD(node);
      }

      const body = $(".card-body", node);
      body.appendChild(renderWidgetBody(w));

      grid.appendChild(node);
    }
    updateChrome();
  }

  function renderEmptyState() {
    const grid = $("#grid");
    grid.innerHTML = "";
    const card = document.createElement("div");
    card.className = "empty-card";
    card.innerHTML = `
      <div class="empty-card__content">
        <div class="section-kicker">Empty workspace</div>
        <h3>Compose a serious command center.</h3>
        <p>Start from a blueprint or add individual modules. The board stays local-first, portable, and editable without accounts or servers.</p>
        <div class="preset-row">
          <button class="preset-card" type="button" data-preset="daily"><span>Daily command</span><small>Time, focus, planning, metrics</small></button>
          <button class="preset-card" type="button" data-preset="focus"><span>Deep work</span><small>Timer, notes, habits</small></button>
          <button class="preset-card" type="button" data-preset="minimal"><span>Minimal</span><small>Essentials only</small></button>
        </div>
      </div>
    `;
    const cta = document.createElement("button");
    cta.type = "button";
    cta.className = "btn primary empty-cta";
    cta.textContent = "Open module library";
    cta.addEventListener("click", () => openCatalog());
    card.appendChild(cta);
    $$("[data-preset]", card).forEach(btn => {
      btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
    });
    grid.appendChild(card);
    updateChrome();
  }

  function applyPreset(preset) {
    pushHistory();
    const next = defaultDashboard(preset);
    next.theme = app.state.theme;
    next.background = app.state.background;
    next.layout = structuredClone(app.state.layout);
    next.permissions = structuredClone(app.state.permissions);
    next.resources = structuredClone(app.state.resources);
    app.state = next;
    save();
    renderGrid();
    updateWeatherPill();
    updateChrome();
    closeCatalog();
    toast(`Blueprint applied: ${preset}`);
  }

  function refreshWidget(id) {
    const w = app.state.widgets.find(x => x.id === id);
    if (!w) return;
    renderGrid();
    updateWeatherPill();
    if (w.type === "focus") syncFocusPill();
    updateChrome();
  }

  function wireDnD(node) {
    const id = node.dataset.id;

    node.addEventListener("dragstart", (e) => {
      app.drag.id = id;
      node.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    });

    node.addEventListener("dragend", () => {
      node.classList.remove("dragging");
      $$(".card").forEach(x => x.classList.remove("over"));
      app.drag = { id: null, over: null };
    });

    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      const fromId = app.drag.id || e.dataTransfer.getData("text/plain");
      if (!fromId || fromId === id) return;
      node.classList.add("over");
      app.drag.over = id;
      e.dataTransfer.dropEffect = "move";
    });

    node.addEventListener("dragleave", () => node.classList.remove("over"));

    node.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromId = app.drag.id || e.dataTransfer.getData("text/plain");
      node.classList.remove("over");
      if (!fromId || fromId === id) return;
      moveWidget(fromId, id);
    });
  }

  function openSettings(w) {
    const panel = $("#tplSettings").content.firstElementChild.cloneNode(true);
    const drawer = $("#settingsDrawer");
    const body = $("#settingsBody");
    body.innerHTML = "";
    body.appendChild(panel);
    const title = $("#settingsTitle");
    if (title) title.textContent = `Settings · ${w.title || w.type}`;

    const t = $('[data-k="title"]', panel);
    const a = $('[data-k="accent"]', panel);
    const o = $('[data-k="options"]', panel);

    t.value = w.title || "";
    a.value = w.accent || "#7c5cff";
    o.value = JSON.stringify(w.options ?? {}, null, 2);

    const close = () => closeDrawer(drawer);

    $('[data-act="cancel"]', panel).addEventListener("click", close);

    $('[data-act="save"]', panel).addEventListener("click", () => {
      const nextTitle = t.value.trim().slice(0, 60);
      const nextAccent = a.value.trim().slice(0, 40) || "#7c5cff";

      let nextOptions = null;
      try {
        nextOptions = JSON.parse(o.value || "{}");
      } catch {
        toast("Invalid JSON options");
        return;
      }

      pushHistory();
      w.title = nextTitle || (WIDGET_CATALOG.find(x => x.type === w.type)?.title ?? w.type);
      w.accent = nextAccent;
      w.options = nextOptions;

      save();
      renderGrid();
      updateWeatherPill();
      if (w.type === "focus") syncFocusPill();
      close();
    });

    openDrawer(drawer);
  }

  function renderWidgetBody(w) {
    const type = w.type;
    const access = getWidgetAccess(type);
    if (!access.allowed) return widgetBlocked(w, access);
    const entry = WIDGET_REGISTRY.get(type);
    if (!entry || typeof entry.renderer !== "function") return widgetUnknown(w);
    return entry.renderer(w);
  }

  function widgetBlocked(w, access) {
    const el = document.createElement("div");
    el.className = "stack";
    const missing = [];
    if (access.missingPermissions.length) {
      missing.push(`Missing permissions: ${access.missingPermissions.join(", ")}`);
    }
    if (access.missingResources.length) {
      missing.push(`Missing resources: ${access.missingResources.join(", ")}`);
    }
    el.innerHTML = `
      <div class="kpi">
        <div class="k">Widget blocked by permissions</div>
        <div class="v">${escapeHtml(w.title || w.type)}</div>
      </div>
      <div class="small">${escapeHtml(missing.join(" • ") || "Update workspace permissions to allow this widget.")}</div>
    `;
    return el;
  }

  function widgetUnknown(w) {
    const el = document.createElement("div");
    el.className = "stack";
    el.innerHTML = `
      <div class="kpi">
        <div class="k">Unknown widget type</div>
        <div class="v">${escapeHtml(w.type)}</div>
      </div>
      <div class="small">Remove this widget or edit its type in exported JSON.</div>
    `;
    return el;
  }

  function widgetClock(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const big = document.createElement("div");
    big.className = "big";
    const small = document.createElement("div");
    small.className = "small";

    el.appendChild(big);
    el.appendChild(small);

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "clock")?.defaults);
    const update = () => {
      const d = new Date();
      const time = d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: opts.seconds ? "2-digit" : undefined,
        hour12: !opts.format24
      });
      const date = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      big.textContent = time;
      small.textContent = date;
      $("#pillNow").textContent = nowString();
    };

    update();
    const t = setInterval(update, 1000);
    el.addEventListener("DOMNodeRemoved", () => clearInterval(t), { once: true });
    return el;
  }

  function widgetCalendar(w) {
    const el = document.createElement("div");
    el.className = "stack";
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "calendar")?.defaults);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const daysInMonth = last.getDate();

    const card = document.createElement("div");
    card.className = "calendar";
    card.innerHTML = `
      <div class="calendar-head">
        <div class="calendar-title"></div>
        <div class="small">${today.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
      </div>
      <div class="calendar-grid" data-a="grid"></div>
    `;
    $(".calendar-title", card).textContent = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const grid = $('[data-a="grid"]', card);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const name of dayNames) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.textContent = name;
      grid.appendChild(cell);
    }
    for (let i = 0; i < startDay; i += 1) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.textContent = "";
      grid.appendChild(cell);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.textContent = String(day);
      const current = new Date(year, month, day);
      if (day === today.getDate()) cell.classList.add("today");
      if (opts.highlightWeekends && (current.getDay() === 0 || current.getDay() === 6)) {
        cell.classList.add("active");
      }
      grid.appendChild(cell);
    }

    el.appendChild(card);
    return el;
  }

  function widgetTimezone(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "timezone")?.defaults);
    const zones = Array.isArray(opts.zones) ? opts.zones : [];

    const list = document.createElement("div");
    list.className = "timezone-list";

    const render = () => {
      list.innerHTML = "";
      if (!zones.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No timezones configured.";
        list.appendChild(empty);
        return;
      }
      for (const item of zones) {
        const row = document.createElement("div");
        row.className = "timezone-item";
        row.innerHTML = `
          <div class="timezone-city"></div>
          <div class="timezone-time"></div>
        `;
        $(".timezone-city", row).textContent = item.label || item.zone;
        const fmt = new Intl.DateTimeFormat(undefined, { timeZone: item.zone, hour: "2-digit", minute: "2-digit" });
        $(".timezone-time", row).textContent = fmt.format(new Date());
        list.appendChild(row);
      }
    };

    render();
    const tick = setInterval(render, 60_000);
    el.addEventListener("DOMNodeRemoved", () => clearInterval(tick), { once: true });
    el.appendChild(list);
    return el;
  }

  function widgetPrices(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "prices")?.defaults);
    const key = `livedash:prices:${w.id}`;
    const cached = loadCache(key, {});
    let currentCache = cached;

    const grid = document.createElement("div");
    grid.className = "price-grid";
    const metaRow = document.createElement("div");
    metaRow.className = "widget-meta";
    const meta = document.createElement("div");
    meta.className = "widget-updated small";
    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "mini refresh-btn";
    refreshBtn.textContent = "Refresh";
    refreshBtn.setAttribute("aria-label", "Refresh prices");
    metaRow.appendChild(meta);
    metaRow.appendChild(refreshBtn);
    el.appendChild(grid);
    el.appendChild(metaRow);

    const render = (data, updatedAt) => {
      grid.innerHTML = "";
      const assets = Array.isArray(opts.assets) ? opts.assets : [];
      const fx = Array.isArray(opts.fx) ? opts.fx : [];
      const list = [];
      for (const a of assets) {
        if (data.crypto && data.crypto[a]) {
          list.push({ label: a.toUpperCase(), value: `$${data.crypto[a].usd}` });
        }
      }
      for (const f of fx) {
        if (data.fx && data.fx[f]) {
          list.push({ label: `USD/${f}`, value: data.fx[f].toFixed(2) });
        }
      }
      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No price data yet.";
        grid.appendChild(empty);
      } else {
        for (const item of list) {
          const card = document.createElement("div");
          card.className = "price-card";
          card.innerHTML = `
            <div class="label"></div>
            <div class="value"></div>
          `;
          $(".label", card).textContent = item.label;
          $(".value", card).textContent = item.value;
          grid.appendChild(card);
        }
      }
      meta.textContent = updatedAt ? `Last updated ${new Date(updatedAt).toLocaleTimeString()}` : "Last updated —";
    };

    const applyCache = (cache) => {
      const data = cache && cache.data ? cache.data : {};
      render(data, cache && cache.updatedAt ? cache.updatedAt : 0);
      currentCache = cache;
    };

    applyCache(cached);

    const fetchPrices = async (force = false) => {
      if (!force && !isStale(currentCache)) return;
      const assets = Array.isArray(opts.assets) ? opts.assets : [];
      const fx = Array.isArray(opts.fx) ? opts.fx : [];
      try {
        const cryptoUrl = assets.length
          ? `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(assets.join(","))}&vs_currencies=usd`
          : null;
        const fxUrl = fx.length
          ? `https://api.exchangerate.host/latest?base=USD&symbols=${encodeURIComponent(fx.join(","))}`
          : null;
        const [cryptoResp, fxResp] = await Promise.all([
          cryptoUrl ? fetch(cryptoUrl, { cache: "no-store" }) : Promise.resolve(null),
          fxUrl ? fetch(fxUrl, { cache: "no-store" }) : Promise.resolve(null)
        ]);
        const crypto = cryptoResp && cryptoResp.ok ? await cryptoResp.json() : {};
        const fxJson = fxResp && fxResp.ok ? await fxResp.json() : {};
        const data = { crypto, fx: fxJson.rates || {} };
        const nextCache = saveCache(key, data);
        applyCache(nextCache);
      } catch {
        if (currentCache) {
          applyCache(currentCache);
        }
      }
    };

    fetchPrices();
    refreshBtn.addEventListener("click", () => fetchPrices(true));
    return el;
  }

  function widgetWeather(w) {
    const el = document.createElement("div");
    el.className = "stack";
    el.innerHTML = `
      <div class="kpi-row">
        <div class="kpi"><div class="k">Temp</div><div class="v" data-w="t">—</div></div>
        <div class="kpi"><div class="k">Wind</div><div class="v" data-w="w">—</div></div>
        <div class="kpi"><div class="k">Condition</div><div class="v" data-w="c">—</div></div>
      </div>
      <hr class="sep2" />
      <div class="small" data-w="loc">—</div>
      <div class="small" data-w="hint">Tip: open Settings → Options to disable autoLocation or change city.</div>
      <div class="widget-meta">
        <div class="widget-updated small" data-w="updated">Last updated —</div>
        <button class="mini refresh-btn" type="button" data-w="refresh" aria-label="Refresh weather">Refresh</button>
      </div>
    `;

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "weather")?.defaults);
    const locEl = $('[data-w="loc"]', el);
    const tEl = $('[data-w="t"]', el);
    const wEl = $('[data-w="w"]', el);
    const cEl = $('[data-w="c"]', el);
    const updatedEl = $('[data-w="updated"]', el);
    const refreshBtn = $('[data-w="refresh"]', el);

    const units = opts.units === "imperial" ? "imperial" : "metric";
    const unitTemp = units === "imperial" ? "°F" : "°C";
    const unitWind = units === "imperial" ? "mph" : "m/s";

    const setData = (d) => {
      tEl.textContent = d.temp + unitTemp;
      wEl.textContent = d.wind + " " + unitWind;
      cEl.textContent = d.codeText;
      locEl.textContent = d.place;
    };

    const fail = (msg) => {
      locEl.textContent = msg;
      tEl.textContent = "—";
      wEl.textContent = "—";
      cEl.textContent = "—";
    };

    const cacheKey = `livedash:weather:${w.id}`;
    const cached = loadCache(cacheKey, null);
    let currentCache = cached;

    const setUpdated = (updatedAt) => {
      updatedEl.textContent = updatedAt ? `Last updated ${new Date(updatedAt).toLocaleTimeString()}` : "Last updated —";
    };

    const applyCache = (cache) => {
      if (cache && cache.data) {
        setData(cache.data);
        if (cache.data.place) updateWeatherPillWithData(cache.data, cache.data.place);
      }
      setUpdated(cache && cache.updatedAt ? cache.updatedAt : 0);
      currentCache = cache;
    };

    applyCache(cached);

    const refreshWeather = async (force = false) => {
      if (!force && !isStale(currentCache)) return;
      try {
        const place = await resolveWeatherPlace(opts);
        if (!place) throw new Error("no place");
        const data = await fetchWeather(place.lat, place.lon, units);
        const full = { ...data, place: place.label };
        const nextCache = saveCache(cacheKey, full);
        applyCache(nextCache);
        updateWeatherPillWithData(data, place.label);
      } catch {
        if (!currentCache || !currentCache.data) {
          fail("Weather unavailable (blocked or offline)");
          setUpdated(0);
          $("#pillWeather").textContent = "Weather: —";
        }
      }
    };

    refreshWeather();
    refreshBtn.addEventListener("click", () => refreshWeather(true));

    return el;
  }

  async function resolveWeatherPlace(opts) {
    if (opts.autoLocation) {
      const geo = await getGeolocation().catch(() => null);
      if (geo) return { lat: geo.lat, lon: geo.lon, label: geo.label };
    }
    const city = (opts.city || "").trim();
    if (!city) return null;
    const g = await geocodeCity(city).catch(() => null);
    if (!g) return null;
    return { lat: g.lat, lon: g.lon, label: g.label };
  }

  function getGeolocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("no geo"));
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        resolve({ lat, lon, label: "Your location" });
      }, reject, { enableHighAccuracy: false, timeout: 7000, maximumAge: 600000 });
    });
  }

  async function geocodeCity(q) {
    const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" + encodeURIComponent(q);
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("geo http");
    const j = await r.json();
    if (!j || !j.results || !j.results.length) throw new Error("no results");
    const x = j.results[0];
    const parts = [x.name, x.admin1, x.country].filter(Boolean);
    return { lat: x.latitude, lon: x.longitude, label: parts.join(", ") };
  }

  function codeToText(code) {
    const m = new Map([
      [0, "Clear"], [1, "Mainly clear"], [2, "Partly cloudy"], [3, "Overcast"],
      [45, "Fog"], [48, "Rime fog"],
      [51, "Light drizzle"], [53, "Drizzle"], [55, "Dense drizzle"],
      [56, "Freezing drizzle"], [57, "Freezing drizzle"],
      [61, "Light rain"], [63, "Rain"], [65, "Heavy rain"],
      [66, "Freezing rain"], [67, "Freezing rain"],
      [71, "Light snow"], [73, "Snow"], [75, "Heavy snow"],
      [77, "Snow grains"],
      [80, "Rain showers"], [81, "Rain showers"], [82, "Violent showers"],
      [85, "Snow showers"], [86, "Snow showers"],
      [95, "Thunderstorm"], [96, "Thunder + hail"], [99, "Thunder + hail"]
    ]);
    return m.get(code) || ("Code " + String(code));
  }

  async function fetchWeather(lat, lon, units) {
    const windUnit = units === "imperial" ? "mph" : "ms";
    const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon) +
      "&current=temperature_2m,weather_code,wind_speed_10m" +
      "&temperature_unit=" + tempUnit +
      "&wind_speed_unit=" + windUnit +
      "&timezone=auto";
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("wx http");
    const j = await r.json();
    const c = j.current;
    const temp = Math.round(c.temperature_2m);
    const wind = Math.round(c.wind_speed_10m);
    const code = c.weather_code;
    return { temp, wind, code, codeText: codeToText(code) };
  }

  function updateWeatherPillWithData(data, label) {
    $("#pillWeather").textContent = `Weather: ${data.temp}° • ${data.codeText} (${label})`;
  }

  async function updateWeatherPill() {
    const wx = app.state.widgets.find(x => x.type === "weather");
    if (!wx) {
      $("#pillWeather").textContent = "Weather: —";
      return;
    }
    const access = getWidgetAccess("weather");
    if (!access.allowed) {
      $("#pillWeather").textContent = "Weather: blocked";
      return;
    }
    try {
      const opts = normalizeOptions(wx, WIDGET_CATALOG.find(x => x.type === "weather")?.defaults);
      const place = await resolveWeatherPlace(opts);
      if (!place) throw new Error("no place");
      const units = opts.units === "imperial" ? "imperial" : "metric";
      const data = await fetchWeather(place.lat, place.lon, units);
      updateWeatherPillWithData(data, place.label);
    } catch {
      $("#pillWeather").textContent = "Weather: —";
    }
  }

  function widgetFocus(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "focus")?.defaults);

    const timer = document.createElement("div");
    timer.className = "timer";
    timer.innerHTML = `
      <div>
        <div class="big" data-x="time">25:00</div>
        <div class="small" data-x="mode">Focus: off</div>
      </div>
      <div class="row">
        <button class="btn" data-x="start" type="button">Start</button>
        <button class="btn ghost" data-x="pause" type="button">Pause</button>
        <button class="btn danger" data-x="stop" type="button">Stop</button>
      </div>
    `;

    const tEl = $('[data-x="time"]', timer);
    const mEl = $('[data-x="mode"]', timer);
    const startBtn = $('[data-x="start"]', timer);
    const pauseBtn = $('[data-x="pause"]', timer);
    const stopBtn = $('[data-x="stop"]', timer);

    const dataKey = `livedash:focus:${w.id}`;
    const local = loadJson(dataKey, null) || { running: false, until: 0, mode: "off", cycle: 0, pausedLeft: 0 };
    app.focus = { ...app.focus, ...local };

    const fmt = (ms) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    };

    const currentDurationMs = () => {
      const mode = app.focus.mode;
      if (mode === "work") return (Number(opts.workMin) || 25) * 60000;
      if (mode === "break") return (Number(opts.breakMin) || 5) * 60000;
      if (mode === "long") return (Number(opts.longBreakMin) || 15) * 60000;
      return (Number(opts.workMin) || 25) * 60000;
    };

    const setMode = (mode) => {
      app.focus.mode = mode;
      mEl.textContent = mode === "work" ? "Focus: work" : mode === "break" ? "Focus: break" : mode === "long" ? "Focus: long break" : "Focus: off";
      $("#pillFocus").textContent = mEl.textContent;
    };

    const persist = () => {
      saveJson(dataKey, { running: app.focus.running, until: app.focus.until, mode: app.focus.mode, cycle: app.focus.cycle, pausedLeft: app.focus.pausedLeft });
    };

    const stop = () => {
      app.focus.running = false;
      app.focus.until = 0;
      app.focus.pausedLeft = 0;
      setMode("off");
      tEl.textContent = fmt(currentDurationMs());
      persist();
      syncFocusPill();
    };

    const tick = () => {
      if (!app.focus.running) {
        if (app.focus.pausedLeft) tEl.textContent = fmt(app.focus.pausedLeft);
        return;
      }
      const left = app.focus.until - Date.now();
      if (left <= 0) {
        const next = nextMode(app.focus.mode, opts, app.focus.cycle);
        if (app.focus.mode === "work") app.focus.cycle += 1;
        setMode(next);
        const dur = durationForMode(next, opts);
        app.focus.until = Date.now() + dur;
        persist();
        tEl.textContent = fmt(dur);
        tryNotify(`Timer: ${mEl.textContent.replace("Focus: ", "")}`, "Next session started.");
        return;
      }
      tEl.textContent = fmt(left);
    };

    const durationForMode = (mode, opts2) => {
      if (mode === "work") return (Number(opts2.workMin) || 25) * 60000;
      if (mode === "break") return (Number(opts2.breakMin) || 5) * 60000;
      if (mode === "long") return (Number(opts2.longBreakMin) || 15) * 60000;
      return (Number(opts2.workMin) || 25) * 60000;
    };

    const nextMode = (mode, opts2, cycle) => {
      if (mode === "off") return "work";
      if (mode === "work") {
        const every = Number(opts2.every) || 4;
        return ((cycle + 1) % every === 0) ? "long" : "break";
      }
      return "work";
    };

    const start = async () => {
      if (Notification && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch {}
      }
      if (!app.focus.mode || app.focus.mode === "off") setMode("work");
      const dur = durationForMode(app.focus.mode, opts);
      const left = app.focus.pausedLeft || dur;
      app.focus.until = Date.now() + left;
      app.focus.running = true;
      app.focus.pausedLeft = 0;
      persist();
      tick();
      syncFocusPill();
    };

    const pause = () => {
      if (!app.focus.running) return;
      app.focus.pausedLeft = Math.max(0, app.focus.until - Date.now());
      app.focus.running = false;
      app.focus.until = 0;
      persist();
      tick();
      syncFocusPill();
    };

    startBtn.addEventListener("click", start);
    pauseBtn.addEventListener("click", pause);
    stopBtn.addEventListener("click", stop);

    setMode(app.focus.mode || "off");
    if (!app.focus.mode || app.focus.mode === "off") tEl.textContent = fmt((Number(opts.workMin) || 25) * 60000);

    if (app.focus.running) tick();
    if (app.focus.pausedLeft) tEl.textContent = fmt(app.focus.pausedLeft);

    if (app.focus.tick) clearInterval(app.focus.tick);
    app.focus.tick = setInterval(tick, 500);

    el.appendChild(timer);

    const hint = document.createElement("div");
    hint.className = "small";
    hint.textContent = "Settings → Options supports: workMin, breakMin, longBreakMin, every.";
    el.appendChild(hint);

    syncFocusPill();
    return el;
  }

  function syncFocusPill() {
    const m = app.focus.mode || "off";
    const base = m === "work" ? "Focus: work" : m === "break" ? "Focus: break" : m === "long" ? "Focus: long break" : "Focus: off";
    $("#pillFocus").textContent = base;
  }

  function tryNotify(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch {}
  }

  function widgetTodos(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:todos:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "todos")?.defaults);
    const data = loadJson(key, { items: [] });

    const top = document.createElement("div");
    top.className = "todo";
    top.innerHTML = `
      <input class="input" type="text" placeholder="Add a task and press Enter" />
      <button class="btn" type="button">Add</button>
    `;
    const inp = $("input", top);
    const addBtn = $("button", top);

    const list = document.createElement("div");
    list.className = "list";

    const render = () => {
      list.innerHTML = "";
      const items = data.items.filter(x => opts.showCompleted ? true : !x.done);
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No tasks.";
        list.appendChild(empty);
        return;
      }
      for (const it of items) {
        const row = document.createElement("div");
        row.className = "item" + (it.done ? " done" : "");
        row.innerHTML = `
          <div class="left">
            <input class="chk" type="checkbox" ${it.done ? "checked" : ""} />
            <div class="txt"></div>
          </div>
          <button class="iconbtn danger" type="button" aria-label="Delete">✕</button>
        `;
        $(".txt", row).textContent = it.text;
        const chk = $(".chk", row);
        const del = $("button", row);

        chk.addEventListener("change", () => {
          it.done = !!chk.checked;
          saveJson(key, data);
          render();
        });

        del.addEventListener("click", () => {
          data.items = data.items.filter(x => x.id !== it.id);
          saveJson(key, data);
          render();
        });

        list.appendChild(row);
      }
    };

    const add = () => {
      const text = inp.value.trim();
      if (!text) return;
      data.items.unshift({ id: uid(), text: text.slice(0, 140), done: false, t: Date.now() });
      inp.value = "";
      saveJson(key, data);
      render();
    };

    addBtn.addEventListener("click", add);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

    el.appendChild(top);
    el.appendChild(list);
    render();

    const hint = document.createElement("div");
    hint.className = "small";
    hint.textContent = "Settings → Options supports: showCompleted (true/false).";
    el.appendChild(hint);

    return el;
  }

  function widgetNotes(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:notes:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "notes")?.defaults);
    const data = loadJson(key, { text: "" });

    const ta = document.createElement("textarea");
    ta.className = "textarea";
    ta.placeholder = opts.placeholder || "Write anything…";
    ta.value = data.text || "";
    let t = null;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        data.text = ta.value.slice(0, 20000);
        saveJson(key, data);
      }, 250);
    });

    el.appendChild(ta);

    const meta = document.createElement("div");
    meta.className = "small";
    meta.textContent = "Autosaves locally.";
    el.appendChild(meta);

    return el;
  }

  function widgetSearch(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "search")?.defaults);
    const providers = [
      { id: "google", label: "Google", url: "https://www.google.com/search?q=" },
      { id: "duckduckgo", label: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
      { id: "youtube", label: "YouTube", url: "https://www.youtube.com/results?search_query=" },
      { id: "github", label: "GitHub", url: "https://github.com/search?q=" }
    ];
    let current = providers.find(p => p.id === opts.provider) || providers[1];

    const box = document.createElement("div");
    box.className = "search-box";
    box.innerHTML = `
      <input class="input" type="search" placeholder="Search…" />
      <button class="btn" type="button">Go</button>
    `;
    const input = $("input", box);
    const btn = $("button", box);

    const chips = document.createElement("div");
    chips.className = "search-sites";

    const renderChips = () => {
      chips.innerHTML = "";
      for (const p of providers) {
        const chip = document.createElement("button");
        chip.className = "search-chip" + (p.id === current.id ? " active" : "");
        chip.type = "button";
        chip.textContent = p.label;
        chip.addEventListener("click", () => {
          current = p;
          opts.provider = p.id;
          w.options = { ...opts };
          save();
          renderChips();
        });
        chips.appendChild(chip);
      }
    };

    const go = () => {
      const q = input.value.trim();
      if (!q) return;
      window.open(current.url + encodeURIComponent(q), "_blank", "noopener,noreferrer");
    };

    btn.addEventListener("click", go);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });

    el.appendChild(box);
    el.appendChild(chips);
    renderChips();
    return el;
  }

  function widgetLinks(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:links:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "links")?.defaults);
    const data = loadJson(key, { links: Array.isArray(opts.links) ? opts.links : [] });

    const editor = document.createElement("div");
    editor.className = "stack";
    editor.innerHTML = `
      <div class="linkrow">
        <input class="input" data-a="name" type="text" placeholder="Name" />
        <input class="input" data-a="url" type="url" placeholder="https://example.com" />
        <button class="btn" data-a="add" type="button">Add</button>
      </div>
      <div class="links" data-a="list"></div>
      <div class="small">Tip: you can keep this widget small; links still work.</div>
    `;

    const nameIn = $('[data-a="name"]', editor);
    const urlIn = $('[data-a="url"]', editor);
    const addBtn = $('[data-a="add"]', editor);
    const list = $('[data-a="list"]', editor);

    const render = () => {
      list.innerHTML = "";
      if (!data.links.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No links.";
        list.appendChild(empty);
        return;
      }
      for (const l of data.links) {
        const row = document.createElement("div");
        row.className = "item";
        row.innerHTML = `
          <div class="left">
            <a class="quick" target="_blank" rel="noreferrer"></a>
          </div>
          <button class="iconbtn danger" type="button" aria-label="Delete">✕</button>
        `;
        const a = $("a", row);
        a.textContent = l.name || l.url;
        a.href = l.url;
        const del = $("button", row);
        del.addEventListener("click", () => {
          data.links = data.links.filter(x => x.id !== l.id);
          saveJson(key, data);
          render();
        });
        list.appendChild(row);
      }
    };

    const add = () => {
      const name = nameIn.value.trim().slice(0, 40);
      const url = urlIn.value.trim().slice(0, 300);
      if (!url || !/^https?:\/\//i.test(url)) {
        toast("URL must start with http(s)://");
        return;
      }
      data.links.unshift({ id: uid(), name: name || url.replace(/^https?:\/\//i, ""), url });
      nameIn.value = "";
      urlIn.value = "";
      saveJson(key, data);
      render();
    };

    addBtn.addEventListener("click", add);
    urlIn.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

    el.appendChild(editor);
    render();
    return el;
  }

  function widgetBookmarks(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:bookmarks:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "bookmarks")?.defaults);
    const data = loadJson(key, { bookmarks: Array.isArray(opts.bookmarks) ? opts.bookmarks.map(b => ({ id: uid(), ...b })) : [] });

    const editor = document.createElement("div");
    editor.className = "stack";
    editor.innerHTML = `
      <div class="bookmark-row">
        <input class="input" data-a="title" type="text" placeholder="Title" />
        <input class="input" data-a="url" type="url" placeholder="https://example.com" />
        <input class="input" data-a="tags" type="text" placeholder="tags" />
        <button class="btn" data-a="add" type="button">Add</button>
      </div>
      <input class="input" data-a="filter" type="search" placeholder="Filter by tag or title" />
      <div class="bookmark-list" data-a="list"></div>
    `;

    const titleIn = $('[data-a="title"]', editor);
    const urlIn = $('[data-a="url"]', editor);
    const tagsIn = $('[data-a="tags"]', editor);
    const addBtn = $('[data-a="add"]', editor);
    const filterIn = $('[data-a="filter"]', editor);
    const list = $('[data-a="list"]', editor);

    const render = () => {
      list.innerHTML = "";
      const q = filterIn.value.trim().toLowerCase();
      const items = data.bookmarks.filter(b => !q || b.title.toLowerCase().includes(q) || (b.tags || []).join(" ").toLowerCase().includes(q));
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No bookmarks found.";
        list.appendChild(empty);
        return;
      }
      for (const b of items) {
        const row = document.createElement("div");
        row.className = "bookmark-item";
        row.innerHTML = `
          <div>
            <a class="quick" target="_blank" rel="noreferrer"></a>
            <div class="bookmark-meta"></div>
          </div>
          <button class="iconbtn danger" type="button" aria-label="Delete">✕</button>
        `;
        const link = $("a", row);
        link.textContent = b.title || b.url;
        link.href = b.url;
        $(".bookmark-meta", row).textContent = (b.tags || []).join(" · ");
        $("button", row).addEventListener("click", () => {
          data.bookmarks = data.bookmarks.filter(x => x.id !== b.id);
          saveJson(key, data);
          render();
        });
        list.appendChild(row);
      }
    };

    const add = () => {
      const title = titleIn.value.trim().slice(0, 40);
      const url = urlIn.value.trim().slice(0, 300);
      if (!/^https?:\/\//i.test(url)) {
        toast("URL must start with http(s)://");
        return;
      }
      const tags = tagsIn.value.split(",").map(t => t.trim()).filter(Boolean).slice(0, 5);
      data.bookmarks.unshift({ id: uid(), title: title || url, url, tags });
      titleIn.value = "";
      urlIn.value = "";
      tagsIn.value = "";
      saveJson(key, data);
      render();
    };

    addBtn.addEventListener("click", add);
    filterIn.addEventListener("input", render);

    el.appendChild(editor);
    render();
    return el;
  }

  function widgetStats(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:stats:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "stats")?.defaults);
    const data = loadJson(key, { counters: Array.isArray(opts.counters) ? opts.counters.map(x => ({ id: uid(), k: x.k, v: x.v })) : [] });

    const kpis = document.createElement("div");
    kpis.className = "kpi-row";

    const controls = document.createElement("div");
    controls.className = "row";
    controls.innerHTML = `
      <button class="btn" type="button" data-a="reset">Reset</button>
      <button class="btn ghost" type="button" data-a="add">Add KPI</button>
    `;

    const render = () => {
      kpis.innerHTML = "";
      if (!data.counters.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No KPIs. Add one.";
        kpis.appendChild(empty);
        return;
      }

      for (const c of data.counters) {
        const box = document.createElement("div");
        box.className = "kpi";
        box.innerHTML = `
          <div class="k"></div>
          <div class="v"></div>
          <div class="row" style="margin-top:10px">
            <button class="btn ghost" type="button" data-a="dec">−</button>
            <button class="btn" type="button" data-a="inc">+</button>
            <button class="btn danger" type="button" data-a="del">Del</button>
          </div>
        `;
        $(".k", box).textContent = c.k;
        $(".v", box).textContent = String(c.v);

        $('[data-a="inc"]', box).addEventListener("click", () => { c.v += 1; saveJson(key, data); render(); });
        $('[data-a="dec"]', box).addEventListener("click", () => { c.v -= 1; saveJson(key, data); render(); });
        $('[data-a="del"]', box).addEventListener("click", () => { data.counters = data.counters.filter(x => x.id !== c.id); saveJson(key, data); render(); });

        kpis.appendChild(box);
      }
    };

    $('[data-a="reset"]', controls).addEventListener("click", () => {
      data.counters.forEach(x => x.v = 0);
      saveJson(key, data);
      render();
      toast("KPIs reset");
    });

    $('[data-a="add"]', controls).addEventListener("click", () => {
      const name = prompt("KPI name") || "";
      const k = name.trim().slice(0, 20);
      if (!k) return;
      data.counters.unshift({ id: uid(), k, v: 0 });
      saveJson(key, data);
      render();
    });

    el.appendChild(kpis);
    el.appendChild(controls);
    render();

    const hint = document.createElement("div");
    hint.className = "small";
    hint.textContent = "This widget is local-only by design.";
    el.appendChild(hint);

    return el;
  }

  function widgetAgenda(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:agenda:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "agenda")?.defaults);
    const data = loadJson(key, { blocks: Array.isArray(opts.blocks) ? opts.blocks.map(b => ({ id: uid(), ...b })) : [] });

    const editor = document.createElement("div");
    editor.className = "agenda-editor";
    editor.innerHTML = `
      <div class="agenda-row">
        <input class="input" data-a="time" type="time" />
        <input class="input" data-a="title" type="text" placeholder="Meeting / focus block" />
        <input class="input" data-a="note" type="text" placeholder="Notes" />
        <button class="btn" data-a="add" type="button">Add</button>
      </div>
      <div class="agenda-list" data-a="list"></div>
    `;

    const timeIn = $('[data-a="time"]', editor);
    const titleIn = $('[data-a="title"]', editor);
    const noteIn = $('[data-a="note"]', editor);
    const addBtn = $('[data-a="add"]', editor);
    const list = $('[data-a="list"]', editor);

    const render = () => {
      list.innerHTML = "";
      if (!data.blocks.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No agenda blocks yet.";
        list.appendChild(empty);
        return;
      }
      for (const block of data.blocks) {
        const row = document.createElement("div");
        row.className = "agenda-item";
        row.innerHTML = `
          <div>
            <div class="agenda-time"></div>
            <div class="agenda-title"></div>
            <div class="small agenda-note"></div>
          </div>
          <button class="iconbtn danger" type="button" aria-label="Delete">✕</button>
        `;
        $(".agenda-time", row).textContent = block.time || "—";
        $(".agenda-title", row).textContent = block.title || "Untitled";
        $(".agenda-note", row).textContent = block.note || "";
        $("button", row).addEventListener("click", () => {
          data.blocks = data.blocks.filter(x => x.id !== block.id);
          saveJson(key, data);
          render();
        });
        list.appendChild(row);
      }
    };

    const add = () => {
      const time = timeIn.value || "";
      const title = titleIn.value.trim().slice(0, 60);
      const note = noteIn.value.trim().slice(0, 80);
      if (!title && !note) return;
      data.blocks.push({ id: uid(), time, title: title || "Untitled", note });
      saveJson(key, data);
      titleIn.value = "";
      noteIn.value = "";
      render();
    };

    addBtn.addEventListener("click", add);
    titleIn.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

    el.appendChild(editor);
    render();
    return el;
  }

  function widgetHabits(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:habits:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "habits")?.defaults);
    const data = loadJson(key, { habits: Array.isArray(opts.habits) ? opts.habits.map(h => ({ id: uid(), done: false, ...h })) : [] });

    const list = document.createElement("div");
    list.className = "habit-list";

    const controls = document.createElement("div");
    controls.className = "row";
    controls.innerHTML = `
      <button class="btn" type="button" data-a="add">Add habit</button>
      <button class="btn ghost" type="button" data-a="reset">Reset today</button>
    `;

    const render = () => {
      list.innerHTML = "";
      if (!data.habits.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No habits yet.";
        list.appendChild(empty);
        return;
      }
      for (const habit of data.habits) {
        const row = document.createElement("div");
        row.className = "habit-item";
        row.innerHTML = `
          <div class="left">
            <input class="chk" type="checkbox" ${habit.done ? "checked" : ""} />
            <div>
              <div class="habit-name"></div>
              <div class="small habit-meta"></div>
            </div>
          </div>
          <button class="iconbtn danger" type="button" aria-label="Delete">✕</button>
        `;
        $(".habit-name", row).textContent = habit.name;
        $(".habit-meta", row).textContent = `Streak: ${habit.streak} days`;
        $(".chk", row).addEventListener("change", (e) => {
          habit.done = !!e.target.checked;
          saveJson(key, data);
        });
        $("button", row).addEventListener("click", () => {
          data.habits = data.habits.filter(x => x.id !== habit.id);
          saveJson(key, data);
          render();
        });
        list.appendChild(row);
      }
    };

    $('[data-a="add"]', controls).addEventListener("click", () => {
      const name = (prompt("Habit name") || "").trim().slice(0, 30);
      if (!name) return;
      data.habits.unshift({ id: uid(), name, streak: 1, done: false });
      saveJson(key, data);
      render();
    });
    $('[data-a="reset"]', controls).addEventListener("click", () => {
      data.habits.forEach(h => { h.done = false; });
      saveJson(key, data);
      render();
      toast("Habits reset for today");
    });

    el.appendChild(list);
    el.appendChild(controls);
    render();
    return el;
  }

  function widgetPulse(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const key = `livedash:pulse:${w.id}`;
    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "pulse")?.defaults);
    const data = loadJson(key, { metrics: Array.isArray(opts.metrics) ? opts.metrics.map(m => ({ id: uid(), ...m })) : [] });

    const grid = document.createElement("div");
    grid.className = "pulse-grid";

    const controls = document.createElement("div");
    controls.className = "row";
    controls.innerHTML = `
      <button class="btn ghost" type="button" data-a="add">Add metric</button>
      <button class="btn" type="button" data-a="refresh">Refresh</button>
    `;

    const render = () => {
      grid.innerHTML = "";
      if (!data.metrics.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "No metrics yet.";
        grid.appendChild(empty);
        return;
      }
      for (const metric of data.metrics) {
        const card = document.createElement("div");
        card.className = "pulse-card";
        card.innerHTML = `
          <div class="pulse-label"></div>
          <div class="pulse-value"></div>
          <div class="pulse-delta"></div>
          <button class="iconbtn danger" type="button" aria-label="Delete">✕</button>
        `;
        $(".pulse-label", card).textContent = metric.label;
        $(".pulse-value", card).textContent = metric.value;
        $(".pulse-delta", card).textContent = metric.delta || "—";
        $("button", card).addEventListener("click", () => {
          data.metrics = data.metrics.filter(x => x.id !== metric.id);
          saveJson(key, data);
          render();
        });
        grid.appendChild(card);
      }
    };

    $('[data-a="add"]', controls).addEventListener("click", () => {
      const label = (prompt("Metric label") || "").trim().slice(0, 20);
      if (!label) return;
      const value = (prompt("Metric value") || "").trim().slice(0, 20);
      const delta = (prompt("Metric delta (optional)") || "").trim().slice(0, 20);
      data.metrics.unshift({ id: uid(), label, value: value || "—", delta: delta || "—" });
      saveJson(key, data);
      render();
    });
    $('[data-a="refresh"]', controls).addEventListener("click", () => {
      toast("Metrics refreshed");
    });

    el.appendChild(grid);
    el.appendChild(controls);
    render();
    return el;
  }

  function widgetQuote(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "quote")?.defaults);
    const quotes = Array.isArray(opts.quotes) ? opts.quotes : [];
    const quote = quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : "Stay focused, stay kind.";

    const box = document.createElement("div");
    box.className = "quote-box";
    box.innerHTML = `
      <div class="quote-text"></div>
      <div class="small quote-source"></div>
    `;
    $(".quote-text", box).textContent = `“${quote}”`;
    $(".quote-source", box).textContent = `Source: ${opts.source || "Curated"}`;

    const refresh = document.createElement("button");
    refresh.className = "btn ghost";
    refresh.type = "button";
    refresh.textContent = "New quote";
    refresh.addEventListener("click", () => {
      if (!quotes.length) return;
      const next = quotes[Math.floor(Math.random() * quotes.length)];
      $(".quote-text", box).textContent = `“${next}”`;
    });

    el.appendChild(box);
    el.appendChild(refresh);
    return el;
  }

  function widgetAmbient(w) {
    const el = document.createElement("div");
    el.className = "stack";

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "ambient")?.defaults);
    const key = `livedash:ambient:${w.id}`;
    const data = loadJson(key, { sound: opts.sound, durationMin: opts.durationMin, volume: opts.volume, playing: false });

    const card = document.createElement("div");
    card.className = "ambient-card";
    card.innerHTML = `
      <div>
        <div class="ambient-title"></div>
        <div class="small">Duration: <span data-a="dur"></span> min · Volume: <span data-a="vol"></span>%</div>
      </div>
      <div class="row">
        <button class="btn" type="button" data-a="start">Start</button>
        <button class="btn ghost" type="button" data-a="stop">Stop</button>
      </div>
    `;
    $(".ambient-title", card).textContent = data.sound || "Ambient";
    $('[data-a="dur"]', card).textContent = data.durationMin || 0;
    $('[data-a="vol"]', card).textContent = data.volume || 0;

    $('[data-a="start"]', card).addEventListener("click", () => {
      data.playing = true;
      saveJson(key, data);
      toast(`Ambient: ${data.sound} started`);
    });
    $('[data-a="stop"]', card).addEventListener("click", () => {
      data.playing = false;
      saveJson(key, data);
      toast("Ambient stopped");
    });

    el.appendChild(card);

    const hint = document.createElement("div");
    hint.className = "small";
    hint.textContent = "Settings → Options supports: sound, durationMin, volume.";
    el.appendChild(hint);

    return el;
  }

  registerWidget("clock", widgetClock);
  registerWidget("calendar", widgetCalendar);
  registerWidget("timezone", widgetTimezone);
  registerWidget("weather", widgetWeather);
  registerWidget("prices", widgetPrices);
  registerWidget("focus", widgetFocus);
  registerWidget("todos", widgetTodos);
  registerWidget("notes", widgetNotes);
  registerWidget("search", widgetSearch);
  registerWidget("links", widgetLinks);
  registerWidget("bookmarks", widgetBookmarks);
  registerWidget("stats", widgetStats);
  registerWidget("agenda", widgetAgenda);
  registerWidget("habits", widgetHabits);
  registerWidget("pulse", widgetPulse);
  registerWidget("quote", widgetQuote);
  registerWidget("ambient", widgetAmbient);

  function normalizeOptions(w, defaults) {
    const d = structuredClone(defaults || {});
    const o = (w && w.options && typeof w.options === "object") ? w.options : {};
    return { ...d, ...o };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return structuredClone(fallback);
      return JSON.parse(raw);
    } catch {
      return structuredClone(fallback);
    }
  }

  function loadCache(key, fallback) {
    const cached = loadJson(key, null);
    if (!cached || typeof cached !== "object") {
      return { data: structuredClone(fallback), updatedAt: 0 };
    }
    const data = cached.data === undefined ? structuredClone(fallback) : cached.data;
    const updatedAt = Number(cached.updatedAt) || 0;
    return { data, updatedAt };
  }

  function saveCache(key, data) {
    const payload = { data, updatedAt: Date.now() };
    saveJson(key, payload);
    return payload;
  }

  function isStale(cache, ttl = SWR_TTL_MS) {
    if (!cache || !cache.updatedAt) return true;
    return (Date.now() - cache.updatedAt) > ttl;
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function bindUI() {
    const workspaceSel = $("#workspaceSel");
    if (workspaceSel) workspaceSel.addEventListener("change", (e) => setWorkspace(e.target.value));
    const workspaceAdd = $("#btnWorkspaceAdd");
    if (workspaceAdd) {
      workspaceAdd.addEventListener("click", () => {
        const name = (prompt("Workspace name") || "").trim().slice(0, 20);
        if (!name) return;
        if (app.workspaces.includes(name)) {
          toast("Workspace already exists");
          return;
        }
        app.workspaces.push(name);
        saveWorkspaceList();
        setWorkspace(name);
      });
    }

    $("#btnCatalog")?.addEventListener("click", toggleCatalog);
    $("#btnCatalogClose")?.addEventListener("click", closeCatalog);
    $("#catalogBackdrop")?.addEventListener("click", closeCatalog);
    $("#btnAdd")?.addEventListener("click", openCatalog);
    $("#btnLayout")?.addEventListener("click", () => openModal("layout"));
    $("#btnTheme")?.addEventListener("click", () => setTheme(app.state.theme === "dark" ? "light" : "dark"));
    $("#btnExport")?.addEventListener("click", () => openIoDrawer("export"));
    $("#btnImport")?.addEventListener("click", () => openIoDrawer("import"));
    $("#btnUndo")?.addEventListener("click", undo);
    $("#btnReset")?.addEventListener("click", resetDashboard);

    $("#widgetSearch")?.addEventListener("input", renderGallery);
    $("#widgetFilters")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      setCatalogFilter(btn.dataset.filter);
    });

    $$("[data-preset]").forEach(btn => {
      btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
    });

    $("#ioTabs")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-io]");
      if (!btn) return;
      setIoMode(btn.dataset.io);
    });
    $("#btnDownloadExport")?.addEventListener("click", exportDashboard);
    $("#btnCopyExport")?.addEventListener("click", async () => {
      const text = $("#exportText")?.value || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        toast("Copied export JSON");
      } catch {
        toast("Copy failed");
      }
    });

    $("#modal")?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) closeModal();
    });
    $("#settingsDrawer")?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) closeDrawer($("#settingsDrawer"));
    });
    $("#ioDrawer")?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) closeDrawer($("#ioDrawer"));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#modal").hidden) closeModal();
      if (!$("#settingsDrawer").hidden) closeDrawer($("#settingsDrawer"));
      if (!$("#ioDrawer").hidden) closeDrawer($("#ioDrawer"));
      if (document.body.classList.contains("catalog-open")) closeCatalog();
    });

    $("#btnDoImport")?.addEventListener("click", doImport);

    $("#densitySel")?.addEventListener("change", () => {
      pushHistory();
      app.state.layout.density = $("#densitySel").value === "compact" ? "compact" : "comfortable";
      save();
      applyLayout();
    });
    $("#cardSel")?.addEventListener("change", () => {
      pushHistory();
      app.state.layout.card = $("#cardSel").value === "solid" ? "solid" : "glass";
      save();
      applyLayout();
    });
    $("#bgSel")?.addEventListener("change", () => {
      pushHistory();
      app.state.background = $("#bgSel").value || "aurora";
      save();
      applyBackground();
    });
    $("#lockToggle")?.addEventListener("change", () => {
      pushHistory();
      app.state.layout.locked = $("#lockToggle").checked;
      save();
      renderGrid();
    });
    $("#colsRange")?.addEventListener("input", () => {
      pushHistory();
      const v = Number($("#colsRange").value) || 4;
      $("#colsVal").textContent = String(v);
      app.state.layout.cols = Math.max(2, Math.min(6, v));
      save();
      applyLayout();
    });

    window.addEventListener("online", setStatus);
    window.addEventListener("offline", setStatus);

    setStatus();
    setInterval(setStatus, 30_000);
  }

  function exportDashboard() {
    const data = JSON.stringify(app.state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "livedash-export.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    toast("Exported JSON");
  }

  function doImport() {
    const raw = ($("#importText").value || "").trim();
    if (!raw) return;
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast("Invalid JSON");
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      toast("Invalid JSON");
      return;
    }
    if (!Array.isArray(parsed.widgets)) {
      toast("Missing widgets[]");
      return;
    }
    const next = {
      ...structuredClone(DEFAULTS),
      ...parsed,
      layout: { ...structuredClone(DEFAULTS.layout), ...(parsed.layout || {}) }
    };
    next.widgets = next.widgets
      .filter(x => x && typeof x === "object" && typeof x.type === "string")
      .map(x => ({
        id: x.id || uid(),
        type: String(x.type),
        title: String(x.title || (WIDGET_CATALOG.find(w => w.type === x.type)?.title ?? x.type)),
        size: Number(x.size) || 2,
        accent: String(x.accent || widgetSkin(x.type).accent),
        options: (x.options && typeof x.options === "object") ? x.options : {}
      }));
    pushHistory();
    app.state = next;
    setTheme(app.state.theme);
    applyBackground();
    applyLayout();
    save();
    renderGrid();
    closeDrawer($("#ioDrawer"));
    updateWeatherPill();
    toast("Imported");
  }

  function resetDashboard() {
    pushHistory();
    localStorage.removeItem(getWorkspaceKey(app.workspace));
    app.state = defaultDashboard("daily");
    save();
    renderGrid();
    updateWeatherPill();
    updateChrome();
    toast("Workspace reset");
  }

  function initPWA() {
    if (!navigator.serviceWorker || typeof navigator.serviceWorker.register !== "function") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("sw") === "unregister") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  function boot() {
    app.workspaces = loadWorkspaceList();
    app.workspace = localStorage.getItem(WORKSPACE_KEY) || app.workspaces[0];
    app.state = loadWorkspace(app.workspace);
    app.history = loadHistory(app.workspace);
    app.ui.catalogCollapsed = loadCatalogState().collapsed;

    setTheme(app.state.theme);
    applyBackground();
    applyLayout();
    applyCatalogState();

    bindUI();
    renderWorkspaceSelect();
    if (!app.state.widgets.length && !localStorage.getItem(FIRST_LOAD_KEY)) {
      app.state = defaultDashboard();
      save();
      setTheme(app.state.theme);
      applyBackground();
      applyLayout();
      localStorage.setItem(FIRST_LOAD_KEY, "true");
    }
    setCatalogFilter(app.catalogFilter);
    renderGrid();
    updateWeatherPill();
    updateChrome();
    initPWA();
  }

  boot();
})();
