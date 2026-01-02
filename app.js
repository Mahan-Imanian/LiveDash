(() => {
  const STORAGE_KEY = "livedash:v2";
  const DEFAULTS = {
    version: 2,
    theme: "dark",
    layout: { cols: 4, density: "comfortable", card: "glass" },
    widgets: []
  };

  const WIDGET_CATALOG = [
    {
      type: "clock",
      title: "Clock",
      tags: ["daily", "info"],
      desc: "Local time + date with seconds.",
      defaults: { tz: "local", seconds: true, format24: false }
    },
    {
      type: "weather",
      title: "Weather",
      tags: ["daily", "info"],
      desc: "Current conditions via Open-Meteo.",
      defaults: { city: "New York", units: "metric", autoLocation: true }
    },
    {
      type: "focus",
      title: "Focus Timer",
      tags: ["focus", "tools"],
      desc: "Pomodoro-style timer with ambient mode.",
      defaults: { workMin: 25, breakMin: 5, longBreakMin: 15, every: 4 }
    },
    {
      type: "todos",
      title: "Tasks",
      tags: ["daily", "tools"],
      desc: "Fast todo list that persists locally.",
      defaults: { showCompleted: true }
    },
    {
      type: "notes",
      title: "Notes",
      tags: ["daily", "tools"],
      desc: "Quick notes with autosave.",
      defaults: { placeholder: "Write anything…" }
    },
    {
      type: "links",
      title: "Quick Links",
      tags: ["daily", "tools"],
      desc: "Launch your daily sites fast.",
      defaults: { links: [{ name: "Gmail", url: "https://mail.google.com" }, { name: "Calendar", url: "https://calendar.google.com" }] }
    },
    {
      type: "stats",
      title: "Today",
      tags: ["daily", "info"],
      desc: "Simple daily KPIs you can reset.",
      defaults: { counters: [{ k: "Water", v: 0 }, { k: "Steps", v: 0 }, { k: "Deep work", v: 0 }] }
    },
    {
      type: "agenda",
      title: "Agenda",
      tags: ["daily", "tools"],
      desc: "Today’s schedule with time blocks.",
      defaults: { blocks: [{ time: "09:00", title: "Team standup", note: "Zoom" }, { time: "13:00", title: "Deep work", note: "Roadmap" }] }
    },
    {
      type: "habits",
      title: "Habits",
      tags: ["daily", "focus"],
      desc: "Track daily habits with streaks.",
      defaults: { habits: [{ name: "Workout", streak: 3 }, { name: "Reading", streak: 7 }, { name: "Meditation", streak: 5 }] }
    },
    {
      type: "pulse",
      title: "Pulse Metrics",
      tags: ["info", "daily"],
      desc: "High-level business metrics to update daily.",
      defaults: { metrics: [{ label: "MRR", value: "$24.3k", delta: "+4.2%" }, { label: "Active users", value: "12,480", delta: "+1.8%" }, { label: "Churn", value: "2.1%", delta: "-0.3%" }] }
    },
    {
      type: "quote",
      title: "Daily Inspiration",
      tags: ["info", "daily"],
      desc: "Motivational quote and focus mantra.",
      defaults: { source: "Curated", quotes: ["Stay curious.", "Progress over perfection.", "Do the hard thing first."] }
    },
    {
      type: "ambient",
      title: "Ambient Focus",
      tags: ["focus", "tools"],
      desc: "Play ambient soundscapes and set focus mode.",
      defaults: { sound: "Rain", durationMin: 45, volume: 60 }
    }
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  const app = {
    state: null,
    drag: { id: null, over: null },
    modalMode: "gallery",
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

  function applyLayout() {
    const { cols, density, card } = app.state.layout;
    document.documentElement.style.setProperty("--cols", String(cols));
    document.documentElement.style.setProperty("--density", density === "compact" ? "1.35" : "1");
    document.documentElement.style.setProperty("--card", card === "solid" ? "solid" : "glass");
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULTS);
      const s = { ...structuredClone(DEFAULTS), ...parsed };
      if (!Array.isArray(s.widgets)) s.widgets = [];
      if (!s.layout) s.layout = structuredClone(DEFAULTS.layout);
      if (!s.layout.cols) s.layout.cols = 4;
      if (!s.layout.density) s.layout.density = "comfortable";
      if (!s.layout.card) s.layout.card = "glass";
      if (!s.theme) s.theme = "dark";
      if (!s.version) s.version = 2;
      return s;
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.state));
  }

  function defaultDashboard() {
    const mk = (type, size = 2, overrides = {}) => {
      const cat = WIDGET_CATALOG.find(x => x.type === type);
      const base = cat ? cat.defaults : {};
      return {
        id: uid(),
        type,
        title: (cat?.title ?? type),
        size,
        accent: "#7c5cff",
        options: { ...structuredClone(base), ...overrides }
      };
    };
    return {
      ...structuredClone(DEFAULTS),
      widgets: [
        mk("clock", 1),
        mk("weather", 2),
        mk("focus", 2),
        mk("pulse", 2),
        mk("todos", 2),
        mk("notes", 2),
        mk("links", 2),
        mk("stats", 1),
        mk("agenda", 2),
        mk("habits", 2),
        mk("quote", 1),
        mk("ambient", 1)
      ]
    };
  }

  function setStatus() {
    $("#pillNow").textContent = nowString();
    $("#footerNet").textContent = navigator.onLine ? "Online" : "Offline";
    $(".dot").style.background = navigator.onLine ? "var(--ok)" : "var(--warn)";
  }

  function toast(text) {
    const el = document.createElement("div");
    el.className = "pill";
    el.style.position = "fixed";
    el.style.right = "14px";
    el.style.bottom = "14px";
    el.style.zIndex = "80";
    el.style.maxWidth = "min(520px, calc(100% - 28px))";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function openModal(mode) {
    app.modalMode = mode;
    const modal = $("#modal");
    modal.hidden = false;
    $("#gallery").hidden = mode !== "gallery";
    $("#importBox").hidden = mode !== "import";
    $("#layoutBox").hidden = mode !== "layout";
    if (mode === "gallery") renderGallery();
    if (mode === "import") $("#importText").value = "";
    if (mode === "layout") renderLayoutControls();
  }

  function closeModal() {
    $("#modal").hidden = true;
  }

  function renderGallery() {
    const q = ($("#widgetSearch").value || "").trim().toLowerCase();
    const f = $("#widgetFilter").value;

    const items = WIDGET_CATALOG
      .filter(w => {
        const inText = !q || (w.title.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q) || w.tags.join(" ").includes(q));
        const inFilter = f === "all" || w.tags.includes(f);
        return inText && inFilter;
      });

    const g = $("#galleryGrid");
    g.innerHTML = "";
    for (const w of items) {
      const card = document.createElement("div");
      card.className = "gcard";
      card.tabIndex = 0;
      card.innerHTML = `
        <div class="gtitle">${escapeHtml(w.title)}</div>
        <div class="gmeta">${escapeHtml(w.desc)}</div>
        <div class="gtags">${w.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      `;
      card.addEventListener("click", () => addWidget(w.type));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") addWidget(w.type);
      });
      g.appendChild(card);
    }
  }

  function renderLayoutControls() {
    $("#densitySel").value = app.state.layout.density;
    $("#cardSel").value = app.state.layout.card;
    $("#colsRange").value = String(app.state.layout.cols);
    $("#colsVal").textContent = String(app.state.layout.cols);
  }

  function addWidget(type) {
    const cat = WIDGET_CATALOG.find(x => x.type === type);
    const w = {
      id: uid(),
      type,
      title: cat?.title ?? type,
      size: 2,
      accent: "#7c5cff",
      options: structuredClone(cat?.defaults ?? {})
    };
    app.state.widgets.unshift(w);
    save();
    renderGrid();
    closeModal();
    toast("Widget added");
    updateWeatherPill();
  }

  function removeWidget(id) {
    app.state.widgets = app.state.widgets.filter(w => w.id !== id);
    save();
    renderGrid();
    updateWeatherPill();
  }

  function moveWidget(fromId, toId) {
    const a = app.state.widgets;
    const from = a.findIndex(w => w.id === fromId);
    const to = a.findIndex(w => w.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [item] = a.splice(from, 1);
    a.splice(to, 0, item);
    save();
    renderGrid();
  }

  function renderGrid() {
    applyLayout();
    const grid = $("#grid");
    grid.innerHTML = "";

    for (const w of app.state.widgets) {
      const node = $("#tplWidget").content.firstElementChild.cloneNode(true);
      node.dataset.id = w.id;
      node.dataset.type = w.type;
      node.dataset.size = String(w.size || 2);
      node.style.setProperty("--accent", w.accent || "#7c5cff");

      const title = $(".card-title", node);
      title.value = w.title || w.type;
      title.addEventListener("change", () => {
        w.title = title.value.trim().slice(0, 60) || (WIDGET_CATALOG.find(x => x.type === w.type)?.title ?? w.type);
        save();
      });

      const sizeSel = $('[data-act="size"]', node);
      sizeSel.value = String(w.size || 2);
      sizeSel.addEventListener("change", () => {
        w.size = Number(sizeSel.value) || 2;
        node.dataset.size = String(w.size);
        save();
      });

      $('[data-act="remove"]', node).addEventListener("click", () => removeWidget(w.id));
      $('[data-act="refresh"]', node).addEventListener("click", () => refreshWidget(w.id));
      $('[data-act="settings"]', node).addEventListener("click", () => openSettings(node, w));

      wireDnD(node);

      const body = $(".card-body", node);
      body.appendChild(renderWidgetBody(w));

      grid.appendChild(node);
    }
  }

  function refreshWidget(id) {
    const w = app.state.widgets.find(x => x.id === id);
    if (!w) return;
    renderGrid();
    updateWeatherPill();
    if (w.type === "focus") syncFocusPill();
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

  function openSettings(cardNode, w) {
    const body = $(".card-body", cardNode);
    const old = body.firstChild;
    const panel = $("#tplSettings").content.firstElementChild.cloneNode(true);

    const t = $('[data-k="title"]', panel);
    const a = $('[data-k="accent"]', panel);
    const o = $('[data-k="options"]', panel);

    t.value = w.title || "";
    a.value = w.accent || "#7c5cff";
    o.value = JSON.stringify(w.options ?? {}, null, 2);

    const restore = () => {
      body.innerHTML = "";
      body.appendChild(renderWidgetBody(w));
    };

    $('[data-act="cancel"]', panel).addEventListener("click", restore);

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

      w.title = nextTitle || (WIDGET_CATALOG.find(x => x.type === w.type)?.title ?? w.type);
      w.accent = nextAccent;
      w.options = nextOptions;

      save();
      renderGrid();
      updateWeatherPill();
      if (w.type === "focus") syncFocusPill();
    });

    body.innerHTML = "";
    body.appendChild(panel);
    if (old && old.scrollIntoView) old.scrollIntoView({ block: "nearest" });
  }

  function renderWidgetBody(w) {
    const type = w.type;
    if (type === "clock") return widgetClock(w);
    if (type === "weather") return widgetWeather(w);
    if (type === "focus") return widgetFocus(w);
    if (type === "todos") return widgetTodos(w);
    if (type === "notes") return widgetNotes(w);
    if (type === "links") return widgetLinks(w);
    if (type === "stats") return widgetStats(w);
    if (type === "agenda") return widgetAgenda(w);
    if (type === "habits") return widgetHabits(w);
    if (type === "pulse") return widgetPulse(w);
    if (type === "quote") return widgetQuote(w);
    if (type === "ambient") return widgetAmbient(w);
    return widgetUnknown(w);
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

  async function widgetWeather(w) {
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
    `;

    const opts = normalizeOptions(w, WIDGET_CATALOG.find(x => x.type === "weather")?.defaults);
    const locEl = $('[data-w="loc"]', el);
    const tEl = $('[data-w="t"]', el);
    const wEl = $('[data-w="w"]', el);
    const cEl = $('[data-w="c"]', el);

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

    try {
      const place = await resolveWeatherPlace(opts);
      if (!place) throw new Error("no place");
      const data = await fetchWeather(place.lat, place.lon, units);
      setData({ ...data, place: place.label });
      updateWeatherPillWithData(data, place.label);
    } catch {
      fail("Weather unavailable (blocked or offline)");
      $("#pillWeather").textContent = "Weather: —";
    }

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

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function bindUI() {
    $("#btnAdd").addEventListener("click", () => openModal("gallery"));
    $("#btnLayout").addEventListener("click", () => openModal("layout"));
    $("#btnTheme").addEventListener("click", () => setTheme(app.state.theme === "dark" ? "light" : "dark"));
    $("#btnExport").addEventListener("click", exportDashboard);
    $("#btnImport").addEventListener("click", () => openModal("import"));
    $("#btnReset").addEventListener("click", resetDashboard);

    $("#widgetSearch").addEventListener("input", () => app.modalMode === "gallery" && renderGallery());
    $("#widgetFilter").addEventListener("change", () => app.modalMode === "gallery" && renderGallery());

    $("#modal").addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").hidden) closeModal();
    });

    $("#btnDoImport").addEventListener("click", doImport);

    $("#densitySel").addEventListener("change", () => {
      app.state.layout.density = $("#densitySel").value === "compact" ? "compact" : "comfortable";
      save();
      applyLayout();
    });
    $("#cardSel").addEventListener("change", () => {
      app.state.layout.card = $("#cardSel").value === "solid" ? "solid" : "glass";
      save();
      applyLayout();
    });
    $("#colsRange").addEventListener("input", () => {
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
        accent: String(x.accent || "#7c5cff"),
        options: (x.options && typeof x.options === "object") ? x.options : {}
      }));
    app.state = next;
    save();
    renderGrid();
    closeModal();
    updateWeatherPill();
    toast("Imported");
  }

  function resetDashboard() {
    localStorage.removeItem(STORAGE_KEY);
    app.state = defaultDashboard();
    save();
    renderGrid();
    updateWeatherPill();
    toast("Reset done");
  }

  function initPWA() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  function boot() {
    app.state = load();
    if (!app.state.widgets.length) {
      app.state = defaultDashboard();
      save();
    }

    setTheme(app.state.theme);
    applyLayout();

    bindUI();
    renderGrid();
    updateWeatherPill();
    initPWA();
  }

  boot();
})();
