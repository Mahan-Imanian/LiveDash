(function(){
  const defaults = window.LiveDashDefaults;
  const store = window.LiveDashStorage;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  let state;
  let commandIndex = 0;
  let activeCommands = [];
  let modalResolver = null;
  let tickTimer = null;

  const el = {
    viewSelect: $("#viewSelect"), timeRange: $("#timeRange"), commandOpen: $("#commandOpen"), filterButton: $("#filterButton"), editToggle: $("#editToggle"), notificationOpen: $("#notificationOpen"), settingsOpen: $("#settingsOpen"), freshness: $("#freshness"), signalCount: $("#signalCount"), filterPanel: $("#filterPanel"), priorityFilter: $("#priorityFilter"), statusFilter: $("#statusFilter"), globalFilter: $("#globalFilter"), greetingLine: $("#greetingLine"), operatorName: $("#operatorName"), statusStack: $("#statusStack"), blurMode: $("#blurMode"), syncBookmarks: $("#syncBookmarks"), searchForm: $("#searchForm"), searchInput: $("#searchInput"), clearSearch: $("#clearSearch"), searchSuggestions: $("#searchSuggestions"), bookmarkGrid: $("#bookmarkGrid"), addLink: $("#addLink"), manageLinks: $("#manageLinks"), editBanner: $("#editBanner"), openModuleLibrary: $("#openModuleLibrary"), restoreModules: $("#restoreModules"), saveEdit: $("#saveEdit"), dashboardSections: $("#dashboardSections"), bottomDock: $("#bottomDock"), commandPalette: $("#commandPalette"), commandInput: $("#commandInput"), commandList: $("#commandList"), settingsDrawer: $("#settingsDrawer"), closeSettings: $("#closeSettings"), themeSetting: $("#themeSetting"), wallpaperSetting: $("#wallpaperSetting"), densitySetting: $("#densitySetting"), glassSetting: $("#glassSetting"), nameSetting: $("#nameSetting"), weatherSetting: $("#weatherSetting"), timeFormatSetting: $("#timeFormatSetting"), defaultViewSetting: $("#defaultViewSetting"), exportBackup: $("#exportBackup"), importBackup: $("#importBackup"), restoreBackup: $("#restoreBackup"), resetDashboard: $("#resetDashboard"), openOptions: $("#openOptions"), notificationDrawer: $("#notificationDrawer"), closeNotifications: $("#closeNotifications"), notificationList: $("#notificationList"), markSignalsRead: $("#markSignalsRead"), modalRoot: $("#modalRoot"), modalTitle: $("#modalTitle"), modalBody: $("#modalBody"), modalFooter: $("#modalFooter"), modalClose: $("#modalClose"), importFile: $("#importFile"), toastRegion: $("#toastRegion")
  };

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]);
  }

  function fmtDate(value, options){
    try { return new Intl.DateTimeFormat(undefined, options || { month: "short", day: "numeric" }).format(new Date(value)); } catch { return ""; }
  }

  function fmtTime(value){
    const use24 = state.settings.timeFormat === "24h";
    const use12 = state.settings.timeFormat === "12h";
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: use12 ? true : use24 ? false : undefined }).format(value instanceof Date ? value : new Date(value));
  }

  function relative(value){
    const diff = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
    if(diff < 60) return `${diff}m ago`;
    const h = Math.round(diff / 60);
    if(h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  }

  function priorityRank(value){
    return { critical: 0, high: 1, medium: 2, low: 3 }[value] ?? 4;
  }

  function isUrl(input){
    return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input);
  }

  function normalizedUrl(input){
    if(/^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input)) return input;
    return `https://${input}`;
  }

  function setTheme(){
    const selected = state.settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : state.settings.theme;
    const wallpaper = defaults.wallpapers.find((item) => item.id === state.settings.wallpaper) || defaults.wallpapers[1];
    document.body.dataset.theme = selected === "light" || wallpaper.mode === "light" ? "light" : "dark";
    document.body.dataset.glass = state.settings.glass || "medium";
    document.body.dataset.density = state.settings.density || "balanced";
    document.body.dataset.edit = state.settings.editMode ? "true" : "false";
    document.body.dataset.blur = state.settings.blur ? "true" : "false";
    document.body.style.setProperty("--wp-a", wallpaper.a);
    document.body.style.setProperty("--wp-b", wallpaper.b);
    document.body.style.setProperty("--wp-c", wallpaper.c);
    document.body.style.setProperty("--accent", wallpaper.accent);
  }

  function selectedView(){
    return defaults.savedViews.find((view) => view.id === state.settings.selectedView) || defaults.savedViews[0];
  }

  function addToast(message, tone){
    const toast = document.createElement("div");
    toast.className = `toast ${tone || ""}`;
    toast.textContent = message;
    el.toastRegion.append(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  async function persist(mutator, quiet){
    state = await store.updateState((draft) => {
      mutator(draft);
      return draft;
    });
    render();
    if(!quiet) addToast("Saved");
  }

  function setupSelects(){
    const viewOptions = defaults.savedViews.map((view) => `<option value="${view.id}">${escapeHtml(view.name)}</option>`).join("");
    el.viewSelect.innerHTML = viewOptions;
    el.defaultViewSetting.innerHTML = viewOptions;
    el.wallpaperSetting.innerHTML = defaults.wallpapers.map((wall) => `<option value="${wall.id}">${escapeHtml(wall.name)}</option>`).join("");
  }

  function renderTop(){
    el.viewSelect.value = state.settings.selectedView;
    el.defaultViewSetting.value = state.settings.defaultView;
    el.timeRange.value = state.settings.timeRange;
    el.editToggle.textContent = state.settings.editMode ? "Edit" : "View";
    el.editToggle.setAttribute("aria-pressed", String(!!state.settings.editMode));
    el.filterPanel.hidden = !state.settings.filterOpen;
    el.filterButton.setAttribute("aria-expanded", String(!!state.settings.filterOpen));
    el.priorityFilter.value = state.filters.priority;
    el.statusFilter.value = state.filters.taskStatus;
    el.globalFilter.value = state.filters.query || "";
    const unread = state.notifications.filter((item) => !item.read).length;
    el.signalCount.textContent = unread;
    el.freshness.textContent = `Synced ${relative(state.updatedAt)}`;
    el.editBanner.hidden = !state.settings.editMode;
    el.operatorName.textContent = state.settings.greetingName || "Operator";
    const hour = new Date().getHours();
    el.greetingLine.textContent = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    el.bottomDock.hidden = !state.settings.dockVisible;
  }

  function renderStatusStack(){
    const openTasks = state.tasks.filter((task) => task.status !== "done").length;
    const blocked = state.tasks.filter((task) => task.status === "blocked").length;
    const unread = state.notifications.filter((item) => !item.read).length;
    const focus = state.focus.active ? "In session" : `${state.focus.completedToday}/${state.focus.dailyGoal} today`;
    el.statusStack.innerHTML = [
      ["Open tasks", openTasks],
      ["Blocked", blocked],
      ["Signals", unread],
      ["Focus", focus]
    ].map(([label, value]) => `<div class="status-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function currentFocusRemaining(){
    if(!state.focus.active || !state.focus.endsAt) return state.focus.durationMin * 60;
    return Math.max(0, Math.round((new Date(state.focus.endsAt).getTime() - Date.now()) / 1000));
  }

  function formatDuration(seconds){
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderFocus(){
    const remaining = currentFocusRemaining();
    const active = state.focus.active && remaining > 0;
    if(state.focus.active && remaining <= 0){
      persist((draft) => {
        draft.focus.active = false;
        draft.focus.startedAt = null;
        draft.focus.endsAt = null;
        draft.focus.completedToday += 1;
        store.appendActivity(draft, "focus", "Focus session completed", `${draft.focus.durationMin} minute session completed.`);
        store.appendNotification(draft, "Focus complete", "Your focus session finished.", "success");
      }, true);
      return;
    }
    $("#focusWidget").innerHTML = `
      <div class="widget-head"><div><span class="eyebrow">Focus</span><h2>Deep work timer</h2><p>${active ? "Session in progress" : "Ready for a focused sprint"}</p></div></div>
      <div class="focus-display"><strong>${formatDuration(remaining)}</strong><span>${state.focus.completedToday}/${state.focus.dailyGoal} sessions completed today</span></div>
      <div class="focus-actions"><button id="focusShort" type="button">15 min</button><button id="focusStart" class="primary-button" type="button">${active ? "Stop" : "Start 25"}</button></div>`;
    $("#focusStart").addEventListener("click", toggleFocus);
    $("#focusShort").addEventListener("click", () => startFocus(15));
  }

  async function startFocus(minutes){
    await persist((draft) => {
      const now = Date.now();
      draft.focus.active = true;
      draft.focus.startedAt = new Date(now).toISOString();
      draft.focus.endsAt = new Date(now + minutes * 60000).toISOString();
      draft.focus.durationMin = minutes;
      store.appendActivity(draft, "focus", "Focus session started", `${minutes} minute focus session started.`);
    }, true);
    addToast("Focus started");
  }

  async function toggleFocus(){
    if(state.focus.active){
      await persist((draft) => {
        draft.focus.active = false;
        draft.focus.startedAt = null;
        draft.focus.endsAt = null;
        store.appendActivity(draft, "focus", "Focus session stopped", "Current focus session was stopped.");
      }, true);
      addToast("Focus stopped");
    } else {
      await startFocus(state.focus.durationMin || 25);
    }
  }

  function renderSignalsWidget(){
    const notices = state.notifications.slice(0, 3);
    $("#signalsWidget").innerHTML = `
      <div class="widget-head"><div><span class="eyebrow">Signals</span><h2>Notification center</h2><p>${notices.length ? "Recent local notices" : "No active notices"}</p></div><button class="widget-action" id="signalsOpenInline" type="button">Open</button></div>
      <div class="list-stack">${notices.map((notice) => `<div class="list-item"><span class="status-dot ${escapeHtml(notice.severity)}"></span><div><strong>${escapeHtml(notice.title)}</strong><small>${escapeHtml(notice.body)}</small></div><small>${relative(notice.createdAt)}</small></div>`).join("") || `<div class="empty-state">No signals</div>`}</div>`;
    $("#signalsOpenInline").addEventListener("click", openNotifications);
  }

  function renderTimeWeather(){
    const now = new Date();
    $("#timeWeatherWidget").innerHTML = `
      <div class="widget-head"><div><span class="eyebrow">Local time</span><h2>${escapeHtml(state.weather.location)}</h2></div></div>
      <div class="time-big" id="clockValue">${fmtTime(now)}</div>
      <div class="date-line">${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now)}</div>
      <div class="weather-line"><div class="weather-temp">${escapeHtml(state.weather.temperature)}°${escapeHtml(state.weather.unit)}</div><div><strong>${escapeHtml(state.weather.condition)}</strong><p>${escapeHtml(state.weather.high)}° high · ${escapeHtml(state.weather.low)}° low · ${escapeHtml(state.weather.source)}</p></div></div>`;
  }

  function renderAgenda(){
    $("#agendaWidget").innerHTML = `
      <div class="widget-head"><div><span class="eyebrow">Schedule</span><h2>Today</h2></div><button class="widget-action" id="addAgenda" type="button">Add</button></div>
      <div class="list-stack">${state.agenda.map((item) => `<div class="list-item"><small>${escapeHtml(item.time)}</small><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)}</small></div><small>${escapeHtml(item.status)}</small></div>`).join("") || `<div class="empty-state">No commitments</div>`}</div>`;
    $("#addAgenda").addEventListener("click", openAgendaModal);
  }

  function renderWorld(){
    const rows = state.timezones.map((item) => {
      let time = "--:--";
      try { time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: item.timezone }).format(new Date()); } catch {}
      return `<div class="world-row"><span>${escapeHtml(item.label)}</span><strong>${time}</strong></div>`;
    }).join("");
    $("#worldWidget").innerHTML = `<div class="widget-head"><div><span class="eyebrow">Global</span><h2>World clocks</h2></div></div>${rows}`;
  }

  function renderBookmarks(){
    const query = (state.filters.query || "").toLowerCase();
    const links = state.links.filter((link) => !query || [link.title, link.group, link.url].join(" ").toLowerCase().includes(query)).slice(0, 14);
    const cells = links.map((link) => bookmarkTile(link)).join("");
    const emptySlots = Math.max(0, 10 - links.length);
    const empties = Array.from({length: emptySlots}).map(() => `<button class="bookmark-tile empty-tile" type="button" data-add-link><span class="bookmark-icon">+</span><span class="bookmark-title">Add</span></button>`).join("");
    el.bookmarkGrid.innerHTML = cells + empties;
    el.bookmarkGrid.querySelectorAll("[data-open-link]").forEach((button) => button.addEventListener("click", () => openLink(button.dataset.openLink)));
    el.bookmarkGrid.querySelectorAll("[data-edit-link]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openLinkModal(button.dataset.editLink); }));
    el.bookmarkGrid.querySelectorAll("[data-add-link]").forEach((button) => button.addEventListener("click", () => openLinkModal()));
  }

  function bookmarkTile(link){
    const initial = (link.title || "L").trim().slice(0,1).toUpperCase();
    const menu = `<button class="tile-menu" type="button" aria-label="Edit ${escapeHtml(link.title)}" data-edit-link="${escapeHtml(link.id)}">⋯</button>`;
    return `<button class="bookmark-tile" type="button" data-open-link="${escapeHtml(link.url)}" style="--tile-color:${escapeHtml(link.color || "#8fc7ff")}">${menu}<span class="bookmark-icon">${escapeHtml(initial)}</span><span class="bookmark-title">${escapeHtml(link.title)}</span><span class="bookmark-group">${escapeHtml(link.group || "Link")}</span></button>`;
  }

  function openLink(url){
    if(!url) return;
    store.updateState((draft) => { store.appendActivity(draft, "link", "Link opened", url); return draft; });
    window.location.href = normalizedUrl(url);
  }

  function renderDock(){
    const items = [
      { id: "home", label: "Home", glyph: "H", action: () => switchView("home") },
      { id: "command", label: "Command", glyph: "C", action: openCommandPalette },
      { id: "focus", label: "Focus", glyph: "F", action: () => switchView("focus") },
      { id: "task", label: "Task", glyph: "T", action: openTaskModal },
      { id: "note", label: "Note", glyph: "N", action: openNoteModal },
      { id: "settings", label: "Settings", glyph: "S", action: openSettings }
    ];
    el.bottomDock.innerHTML = items.map((item) => `<button type="button" data-dock="${item.id}" ${item.id === state.settings.selectedView ? "aria-current=\"page\"" : ""}><b>${item.glyph}</b><span>${item.label}</span></button>`).join("");
    items.forEach((item) => {
      const button = el.bottomDock.querySelector(`[data-dock="${item.id}"]`);
      if(button) button.addEventListener("click", item.action);
    });
  }

  function renderDashboardSections(){
    const view = selectedView();
    const order = state.widgetOrder || [];
    const hidden = new Set(state.hiddenWidgets || []);
    const allowed = new Set(view.sections || []);
    const widgets = order.filter((id) => !hidden.has(id) && (view.id === "home" || allowed.has(widgetGroup(id))));
    if(view.id === "minimal"){
      el.dashboardSections.innerHTML = "";
      return;
    }
    el.dashboardSections.innerHTML = widgets.filter((id) => !["launcher", "commandCard", "timeWeather", "focus", "agenda", "signals", "world"].includes(id)).map(renderWidget).join("");
    bindDashboardActions();
  }

  function widgetGroup(id){
    if(["tasks"].includes(id)) return "tasks";
    if(["notes"].includes(id)) return "notes";
    if(["metrics", "trend", "status"].includes(id)) return "metrics";
    if(["activity"].includes(id)) return "activity";
    if(["agenda"].includes(id)) return "agenda";
    if(["signals", "world", "timeWeather"].includes(id)) return "tools";
    return id;
  }

  function renderWidget(id){
    const map = { tasks: renderTasksWidget, notes: renderNotesWidget, metrics: renderMetricsWidget, trend: renderTrendWidget, status: renderStatusWidget, activity: renderActivityWidget };
    return map[id] ? map[id]() : "";
  }

  function widgetFrame(id, title, subtitle, size, body, actions){
    return `<section class="dashboard-widget ${size || "medium"}" data-widget="${id}"><div class="widget-head"><div><span class="eyebrow">${escapeHtml(widgetGroup(id))}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><div class="widget-toolbar"><button type="button" data-move-up="${id}" aria-label="Move ${escapeHtml(title)} up">↑</button><button type="button" data-hide-widget="${id}" aria-label="Hide ${escapeHtml(title)}">×</button></div>${actions || ""}</div>${body}</section>`;
  }

  function filteredTasks(){
    const query = (state.filters.query || "").toLowerCase();
    return state.tasks.filter((task) => (state.filters.priority === "all" || task.priority === state.filters.priority) && (state.filters.taskStatus === "all" || task.status === state.filters.taskStatus) && (!query || [task.title, task.priority, task.status, task.source, task.owner].join(" ").toLowerCase().includes(query))).sort((a,b) => priorityRank(a.priority) - priorityRank(b.priority) || new Date(a.due) - new Date(b.due));
  }

  function renderTasksWidget(){
    const tasks = filteredTasks();
    const rows = tasks.map((task) => `<tr><td><strong>${escapeHtml(task.title)}</strong><br><small>${escapeHtml(task.source || "Manual")}</small></td><td><span class="priority ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span></td><td>${fmtDate(task.due, { month: "short", day: "numeric" })}</td><td><select class="status-select" data-task-status="${escapeHtml(task.id)}"><option value="open" ${task.status === "open" ? "selected" : ""}>Open</option><option value="blocked" ${task.status === "blocked" ? "selected" : ""}>Blocked</option><option value="done" ${task.status === "done" ? "selected" : ""}>Done</option></select></td><td><button class="widget-action" data-edit-task="${escapeHtml(task.id)}" type="button">Edit</button></td></tr>`).join("");
    const body = `<div class="quick-add"><input id="quickTaskInput" type="text" placeholder="Add a task"><select id="quickTaskPriority"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="critical">Critical</option></select><button id="quickTaskAdd" type="button">Add</button></div><div class="table-wrap"><table><thead><tr><th>Task</th><th>Priority</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="empty-state">No tasks match the current filters</div></td></tr>`}</tbody></table></div>`;
    return widgetFrame("tasks", "Priority tasks", `${tasks.length} visible tasks`, "wide", body);
  }

  function renderNotesWidget(){
    const query = (state.filters.query || "").toLowerCase();
    const notes = state.notes.filter((note) => !query || [note.title, note.body, (note.tags || []).join(" ")].join(" ").toLowerCase().includes(query)).slice(0, 4);
    const body = `<div class="quick-add"><input id="quickNoteInput" type="text" placeholder="Capture a note"><select id="quickNoteTag"><option value="capture">Capture</option><option value="idea">Idea</option><option value="work">Work</option><option value="follow-up">Follow-up</option></select><button id="quickNoteAdd" type="button">Add</button></div><div class="notes-grid">${notes.map((note) => `<article class="note-card"><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.body)}</p><div class="tag-row">${(note.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div><div class="metric-meta"><span>${relative(note.updatedAt)}</span><button class="widget-action" data-edit-note="${escapeHtml(note.id)}" type="button">Edit</button></div></article>`).join("") || `<div class="empty-state">No notes yet</div>`}</div>`;
    return widgetFrame("notes", "Quick notes", "Searchable local notes with tags", "medium", body);
  }

  function renderMetricsWidget(){
    const body = `<div class="metrics-grid">${state.metrics.map((metric) => `<article class="metric-card"><span class="metric-label">${escapeHtml(metric.label)}</span><div class="metric-value">${escapeHtml(metric.value)}${escapeHtml(metric.suffix)}</div><svg class="sparkline" viewBox="0 0 120 38" preserveAspectRatio="none">${sparkline(metric.series, 120, 38)}</svg><div class="metric-meta"><span class="delta ${metric.delta >= 0 ? "up" : "down"}">${metric.delta >= 0 ? "+" : ""}${escapeHtml(metric.delta)}%</span><span>Target ${escapeHtml(metric.target)}${escapeHtml(metric.suffix)}</span></div><div class="metric-meta"><span>${escapeHtml(metric.source)}</span><span>${escapeHtml(metric.freshnessMin)}m fresh</span></div></article>`).join("")}</div>`;
    return widgetFrame("metrics", "Operating metrics", "Values include delta, target, source, freshness, and trend", "wide", body);
  }

  function renderTrendWidget(){
    const metric = state.metrics[0];
    const body = `<div class="chart-frame"><svg class="chart-svg" viewBox="0 0 620 210" preserveAspectRatio="none">${gridLines(620,210)}${areaPath(metric.series,620,210)}${linePath(metric.series,620,210)}<line x1="0" y1="${210 - (metric.target/100)*170 - 20}" x2="620" y2="${210 - (metric.target/100)*170 - 20}" stroke="rgba(247,197,102,.65)" stroke-dasharray="6 6"/><text x="12" y="26" fill="currentColor" opacity=".72" font-size="13">Readiness trend · ${escapeHtml(state.settings.timeRange)}</text></svg></div>`;
    return widgetFrame("trend", "Trend console", "Readiness over selected time range", "wide", body);
  }

  function renderStatusWidget(){
    const counts = { open: state.tasks.filter(t => t.status === "open").length, blocked: state.tasks.filter(t => t.status === "blocked").length, done: state.tasks.filter(t => t.status === "done").length };
    const total = Math.max(1, counts.open + counts.blocked + counts.done);
    const body = `<div class="list-stack">${Object.entries(counts).map(([key,val]) => `<div><div class="world-row"><span>${key}</span><strong>${val}</strong></div><div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${(val/total)*100}%;background:${key === "blocked" ? "var(--warning)" : key === "done" ? "var(--success)" : "var(--accent)"}"></span></div></div>`).join("")}</div>`;
    return widgetFrame("status", "Status map", "Distribution across local work", "small", body);
  }

  function renderActivityWidget(){
    const rows = state.activity.slice(0, 6).map((item) => `<div class="list-item"><span class="status-dot success"></span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div><small>${relative(item.createdAt)}</small></div>`).join("");
    return widgetFrame("activity", "Activity trail", "Local audit history", "medium", `<div class="list-stack">${rows || `<div class="empty-state">No activity yet</div>`}</div>`);
  }

  function sparkline(series, width, height){
    if(!series || series.length < 2) return "";
    const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    const points = series.map((value, index) => `${(index/(series.length-1))*width},${height - ((value-min)/span)*(height-6) - 3}`).join(" ");
    return `<polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function linePath(series, width, height){
    const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    const points = series.map((value, index) => [(index/(series.length-1))*width, height - ((value-min)/span)*(height-42) - 22]);
    return `<path d="${points.map((p,i)=>`${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function areaPath(series, width, height){
    const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    const points = series.map((value, index) => [(index/(series.length-1))*width, height - ((value-min)/span)*(height-42) - 22]);
    return `<path d="M${points[0][0]},${height-20} ${points.map((p,i)=>`${i ? "L" : "L"}${p[0]},${p[1]}`).join(" ")} L${points.at(-1)[0]},${height-20} Z" fill="color-mix(in srgb, var(--accent) 24%, transparent)"/>`;
  }

  function gridLines(width,height){
    return [0.25,0.5,0.75].map((ratio) => `<line x1="0" y1="${height*ratio}" x2="${width}" y2="${height*ratio}" stroke="rgba(255,255,255,.1)"/>`).join("");
  }

  function bindDashboardActions(){
    el.dashboardSections.querySelectorAll("[data-hide-widget]").forEach((button) => button.addEventListener("click", () => persist((draft) => { if(!draft.hiddenWidgets.includes(button.dataset.hideWidget)) draft.hiddenWidgets.push(button.dataset.hideWidget); store.appendActivity(draft, "widget", "Widget hidden", button.dataset.hideWidget); }, true)));
    el.dashboardSections.querySelectorAll("[data-move-up]").forEach((button) => button.addEventListener("click", () => persist((draft) => { const idx = draft.widgetOrder.indexOf(button.dataset.moveUp); if(idx > 0){ const [item] = draft.widgetOrder.splice(idx,1); draft.widgetOrder.splice(idx-1,0,item); store.appendActivity(draft, "widget", "Widget reordered", item); } }, true)));
    const qTask = $("#quickTaskInput");
    const qPriority = $("#quickTaskPriority");
    const qAdd = $("#quickTaskAdd");
    if(qAdd) qAdd.addEventListener("click", () => addTaskFromInput(qTask, qPriority));
    el.dashboardSections.querySelectorAll("[data-task-status]").forEach((select) => select.addEventListener("change", () => updateTaskStatus(select.dataset.taskStatus, select.value)));
    el.dashboardSections.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => openTaskModal(button.dataset.editTask)));
    const qNote = $("#quickNoteInput");
    const qTag = $("#quickNoteTag");
    const qNoteAdd = $("#quickNoteAdd");
    if(qNoteAdd) qNoteAdd.addEventListener("click", () => addNoteFromInput(qNote, qTag));
    el.dashboardSections.querySelectorAll("[data-edit-note]").forEach((button) => button.addEventListener("click", () => openNoteModal(button.dataset.editNote)));
  }

  async function addTaskFromInput(input, prioritySelect){
    const title = input && input.value.trim();
    if(!title) return;
    await persist((draft) => {
      draft.tasks.unshift({ id: defaults.uid("task"), title, priority: prioritySelect.value, status: "open", due: new Date().toISOString(), source: "Quick add", owner: "You" });
      store.appendActivity(draft, "task", "Task created", title);
      store.appendNotification(draft, "Task added", title, "success");
    }, true);
    addToast("Task added");
  }

  async function addNoteFromInput(input, tagSelect){
    const title = input && input.value.trim();
    if(!title) return;
    await persist((draft) => {
      const now = new Date().toISOString();
      draft.notes.unshift({ id: defaults.uid("note"), title, body: title, tags: [tagSelect.value], createdAt: now, updatedAt: now });
      store.appendActivity(draft, "note", "Note created", title);
    }, true);
    addToast("Note added");
  }

  function updateTaskStatus(id, status){
    persist((draft) => {
      const task = draft.tasks.find((item) => item.id === id);
      if(task){ task.status = status; store.appendActivity(draft, "task", status === "done" ? "Task completed" : "Task updated", task.title); }
    }, true);
  }

  function buildCommands(){
    return [
      { title: "Add task", detail: "Create a new priority task", glyph: "T", key: "A", run: () => openTaskModal() },
      { title: "Add note", detail: "Capture a note with tags", glyph: "N", key: "N", run: () => openNoteModal() },
      { title: "Add bookmark", detail: "Create a launcher tile", glyph: "L", key: "B", run: () => openLinkModal() },
      { title: "Start focus session", detail: "Begin a 25 minute session", glyph: "F", key: "S", run: () => startFocus(25) },
      { title: "Toggle edit mode", detail: "Show or hide editing controls", glyph: "E", key: "E", run: () => toggleEditMode() },
      { title: "Sync Chrome bookmarks", detail: "Import top browser bookmarks into launcher", glyph: "B", key: "I", run: syncChromeBookmarks },
      { title: "Open settings", detail: "Preferences, wallpaper, data, shortcuts", glyph: "S", key: ",", run: openSettings },
      { title: "Export backup", detail: "Download a versioned dashboard backup", glyph: "X", key: "", run: exportBackup },
      { title: "Import backup", detail: "Validate and restore a backup", glyph: "I", key: "", run: () => el.importFile.click() },
      { title: "Reset dashboard", detail: "Confirm and restore defaults", glyph: "R", key: "", run: confirmReset },
      { title: "Change wallpaper", detail: "Open appearance settings", glyph: "W", key: "", run: () => { openSettings(); setTimeout(() => el.wallpaperSetting.focus(), 100); } },
      ...defaults.savedViews.map((view) => ({ title: `Switch to ${view.name}`, detail: view.description, glyph: "V", key: "", run: () => switchView(view.id) }))
    ];
  }

  function openCommandPalette(){
    activeCommands = buildCommands();
    commandIndex = 0;
    el.commandPalette.hidden = false;
    el.commandInput.value = "";
    renderCommands();
    setTimeout(() => el.commandInput.focus(), 20);
  }

  function closeCommandPalette(){ el.commandPalette.hidden = true; }

  function renderCommands(){
    const query = el.commandInput.value.trim().toLowerCase();
    const filtered = activeCommands.filter((cmd) => !query || [cmd.title, cmd.detail].join(" ").toLowerCase().includes(query));
    commandIndex = Math.min(commandIndex, Math.max(0, filtered.length - 1));
    el.commandList.innerHTML = filtered.map((cmd, index) => `<button class="command-item" type="button" role="option" aria-selected="${index === commandIndex}" data-command-index="${index}"><span class="command-glyph">${escapeHtml(cmd.glyph)}</span><span><strong>${escapeHtml(cmd.title)}</strong><small>${escapeHtml(cmd.detail)}</small></span>${cmd.key ? `<kbd>${escapeHtml(cmd.key)}</kbd>` : ""}</button>`).join("") || `<div class="empty-state">No command found</div>`;
    el.commandList.querySelectorAll("[data-command-index]").forEach((button) => button.addEventListener("click", () => runCommand(filtered[Number(button.dataset.commandIndex)])));
    activeCommands.filtered = filtered;
  }

  function runCommand(command){
    if(!command) return;
    closeCommandPalette();
    command.run();
  }

  function switchView(viewId){
    persist((draft) => {
      draft.settings.selectedView = viewId;
      draft.settings.activeNav = viewId;
      store.appendActivity(draft, "view", "View changed", defaults.savedViews.find((v) => v.id === viewId)?.name || viewId);
    }, true);
  }

  function toggleEditMode(){
    persist((draft) => {
      draft.settings.editMode = !draft.settings.editMode;
      store.appendActivity(draft, "edit", draft.settings.editMode ? "Edit mode enabled" : "Edit mode disabled", "Dashboard edit state changed.");
    }, true);
  }

  function openSettings(){
    el.settingsDrawer.hidden = false;
    el.themeSetting.value = state.settings.theme;
    el.wallpaperSetting.value = state.settings.wallpaper;
    el.densitySetting.value = state.settings.density;
    el.glassSetting.value = state.settings.glass;
    el.nameSetting.value = state.settings.greetingName || "";
    el.weatherSetting.value = state.settings.weatherLocation || "";
    el.timeFormatSetting.value = state.settings.timeFormat;
    el.defaultViewSetting.value = state.settings.defaultView;
    setTimeout(() => el.themeSetting.focus(), 20);
  }

  function closeSettings(){ el.settingsDrawer.hidden = true; }
  function openNotifications(){ el.notificationDrawer.hidden = false; renderNotifications(); setTimeout(() => el.closeNotifications.focus(), 20); }
  function closeNotifications(){ el.notificationDrawer.hidden = true; }

  function renderNotifications(){
    el.notificationList.innerHTML = state.notifications.map((notice) => `<article class="notice-card"><strong>${escapeHtml(notice.title)}</strong><p>${escapeHtml(notice.body)}</p><time>${relative(notice.createdAt)} · ${escapeHtml(notice.severity)}</time></article>`).join("") || `<div class="empty-state">No notifications</div>`;
  }

  function openModal(title, body, footer){
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = body;
    el.modalFooter.innerHTML = footer;
    el.modalRoot.hidden = false;
    setTimeout(() => el.modalBody.querySelector("input,textarea,select,button")?.focus(), 20);
  }

  function closeModal(result){
    el.modalRoot.hidden = true;
    if(modalResolver){ modalResolver(result); modalResolver = null; }
  }

  function confirmDialog(title, message, danger){
    return new Promise((resolve) => {
      modalResolver = resolve;
      openModal(title, `<p>${escapeHtml(message)}</p>`, `<button type="button" id="cancelConfirm">Cancel</button><button type="button" id="okConfirm" class="${danger ? "danger" : ""}">Confirm</button>`);
      $("#cancelConfirm").addEventListener("click", () => closeModal(false));
      $("#okConfirm").addEventListener("click", () => closeModal(true));
    });
  }

  function openTaskModal(id){
    const task = state.tasks.find((item) => item.id === id) || { title: "", priority: "medium", status: "open", due: new Date().toISOString(), source: "Manual" };
    openModal(id ? "Edit task" : "Add task", `
      <label>Title<input id="taskTitle" type="text" value="${escapeHtml(task.title)}"></label>
      <label>Priority<select id="taskPriority"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label>Status<select id="taskStatus"><option value="open">Open</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
      <label>Due date<input id="taskDue" type="date" value="${new Date(task.due).toISOString().slice(0,10)}"></label>`, `<button type="button" id="deleteTask" class="danger">Delete</button><button type="button" id="cancelTask">Cancel</button><button type="button" id="saveTask">Save task</button>`);
    $("#taskPriority").value = task.priority;
    $("#taskStatus").value = task.status;
    $("#cancelTask").addEventListener("click", () => closeModal());
    $("#deleteTask").hidden = !id;
    $("#deleteTask").addEventListener("click", () => { persist((draft) => { draft.tasks = draft.tasks.filter((item) => item.id !== id); store.appendActivity(draft, "task", "Task removed", task.title); }, true); closeModal(); });
    $("#saveTask").addEventListener("click", () => {
      const title = $("#taskTitle").value.trim();
      if(!title) return addToast("Task title is required", "error");
      persist((draft) => {
        const due = new Date($("#taskDue").value || Date.now()).toISOString();
        const payload = { title, priority: $("#taskPriority").value, status: $("#taskStatus").value, due, source: "Manual", owner: "You" };
        const existing = draft.tasks.find((item) => item.id === id);
        if(existing) Object.assign(existing, payload);
        else draft.tasks.unshift(Object.assign({ id: defaults.uid("task") }, payload));
        store.appendActivity(draft, "task", id ? "Task updated" : "Task created", title);
      }, true);
      closeModal();
    });
  }

  function openNoteModal(id){
    const note = state.notes.find((item) => item.id === id) || { title: "", body: "", tags: [] };
    openModal(id ? "Edit note" : "Add note", `
      <label>Title<input id="noteTitle" type="text" value="${escapeHtml(note.title)}"></label>
      <label>Body<textarea id="noteBody">${escapeHtml(note.body)}</textarea></label>
      <label>Tags<input id="noteTags" type="text" value="${escapeHtml((note.tags || []).join(", "))}" placeholder="work, idea"></label>`, `<button type="button" id="deleteNote" class="danger">Delete</button><button type="button" id="cancelNote">Cancel</button><button type="button" id="saveNote">Save note</button>`);
    $("#cancelNote").addEventListener("click", () => closeModal());
    $("#deleteNote").hidden = !id;
    $("#deleteNote").addEventListener("click", () => { persist((draft) => { draft.notes = draft.notes.filter((item) => item.id !== id); store.appendActivity(draft, "note", "Note removed", note.title); }, true); closeModal(); });
    $("#saveNote").addEventListener("click", () => {
      const title = $("#noteTitle").value.trim();
      const body = $("#noteBody").value.trim();
      if(!title && !body) return addToast("Note content is required", "error");
      persist((draft) => {
        const now = new Date().toISOString();
        const payload = { title: title || body.slice(0, 48), body, tags: $("#noteTags").value.split(",").map((tag) => tag.trim()).filter(Boolean), updatedAt: now };
        const existing = draft.notes.find((item) => item.id === id);
        if(existing) Object.assign(existing, payload);
        else draft.notes.unshift(Object.assign({ id: defaults.uid("note"), createdAt: now }, payload));
        store.appendActivity(draft, "note", id ? "Note updated" : "Note created", payload.title);
      }, true);
      closeModal();
    });
  }

  function openLinkModal(id){
    const link = state.links.find((item) => item.id === id) || { title: "", url: "", group: "Personal", color: "#8fc7ff" };
    openModal(id ? "Edit bookmark" : "Add bookmark", `
      <label>Title<input id="linkTitle" type="text" value="${escapeHtml(link.title)}"></label>
      <label>URL<input id="linkUrl" type="url" value="${escapeHtml(link.url)}" placeholder="https://example.com"></label>
      <label>Group<input id="linkGroup" type="text" value="${escapeHtml(link.group || "")}"></label>
      <label>Color<input id="linkColor" type="color" value="${escapeHtml(link.color || "#8fc7ff")}"></label>`, `<button type="button" id="deleteLink" class="danger">Delete</button><button type="button" id="cancelLink">Cancel</button><button type="button" id="saveLink">Save bookmark</button>`);
    $("#cancelLink").addEventListener("click", () => closeModal());
    $("#deleteLink").hidden = !id;
    $("#deleteLink").addEventListener("click", () => { persist((draft) => { draft.links = draft.links.filter((item) => item.id !== id); store.appendActivity(draft, "bookmark", "Bookmark removed", link.title); }, true); closeModal(); });
    $("#saveLink").addEventListener("click", () => {
      const title = $("#linkTitle").value.trim();
      const url = $("#linkUrl").value.trim();
      if(!title || !url) return addToast("Bookmark title and URL are required", "error");
      persist((draft) => {
        const payload = { title, url: normalizedUrl(url), group: $("#linkGroup").value.trim() || "Personal", color: $("#linkColor").value };
        const existing = draft.links.find((item) => item.id === id);
        if(existing) Object.assign(existing, payload);
        else draft.links.push(Object.assign({ id: defaults.uid("link") }, payload));
        store.appendActivity(draft, "bookmark", id ? "Bookmark updated" : "Bookmark added", title);
      }, true);
      closeModal();
    });
  }

  function openAgendaModal(){
    openModal("Add commitment", `<label>Time<input id="agendaTime" type="time" value="09:00"></label><label>Title<input id="agendaTitle" type="text"></label><label>Category<input id="agendaCategory" type="text" value="Work"></label>`, `<button type="button" id="cancelAgenda">Cancel</button><button type="button" id="saveAgenda">Save commitment</button>`);
    $("#cancelAgenda").addEventListener("click", () => closeModal());
    $("#saveAgenda").addEventListener("click", () => {
      const title = $("#agendaTitle").value.trim();
      if(!title) return addToast("Title is required", "error");
      persist((draft) => { draft.agenda.push({ id: defaults.uid("agenda"), time: $("#agendaTime").value, title, category: $("#agendaCategory").value || "Work", status: "confirmed" }); store.appendActivity(draft, "agenda", "Commitment added", title); }, true);
      closeModal();
    });
  }

  async function syncChromeBookmarks(){
    if(!(window.chrome && chrome.bookmarks && chrome.bookmarks.getTree)){
      addToast("Chrome bookmarks API is unavailable in this context");
      return;
    }
    chrome.bookmarks.getTree(async (tree) => {
      const found = [];
      const walk = (nodes) => nodes.forEach((node) => { if(node.url && found.length < 18) found.push({ title: node.title || new URL(node.url).hostname, url: node.url }); if(node.children) walk(node.children); });
      walk(tree);
      await persist((draft) => {
        const existing = new Set(draft.links.map((link) => link.url));
        found.forEach((item) => { if(!existing.has(item.url)) draft.links.push({ id: defaults.uid("link"), title: item.title.slice(0, 26), url: item.url, group: "Chrome", color: "#8fc7ff" }); });
        draft.settings.quickLinksSource = "chrome";
        store.appendActivity(draft, "bookmark", "Chrome bookmarks synced", `${found.length} browser bookmarks scanned.`);
        store.appendNotification(draft, "Bookmarks synced", "Chrome bookmarks were added to the launcher where new.", "success");
      }, true);
      addToast("Bookmarks synced");
    });
  }

  async function exportBackup(){
    const payload = await store.exportState();
    store.downloadJson(payload, `livedash-v7-backup-${new Date().toISOString().slice(0,10)}.json`);
    addToast("Backup exported");
  }

  async function importBackupFile(file){
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      state = await store.importState(payload);
      render();
      addToast("Backup imported");
    } catch(error){
      addToast(error.message || "Import failed", "error");
    }
  }

  async function confirmReset(){
    const ok = await confirmDialog("Reset dashboard", "This restores the default LiveDash dashboard and keeps your current data as a restore point.", true);
    if(!ok) return;
    state = await store.resetState();
    render();
    addToast("Dashboard reset");
  }

  async function confirmRestore(){
    try {
      const ok = await confirmDialog("Restore backup", "Restore the most recent pre-import or pre-reset backup.", false);
      if(!ok) return;
      state = await store.restoreBackup();
      render();
      addToast("Restore complete");
    } catch(error){ addToast(error.message, "error"); }
  }

  function renderSearchSuggestions(){
    const query = el.searchInput.value.trim().toLowerCase();
    if(!query){ el.searchSuggestions.hidden = true; return; }
    const commands = query.startsWith("/") ? buildCommands().filter((cmd) => cmd.title.toLowerCase().includes(query.slice(1)) || cmd.detail.toLowerCase().includes(query.slice(1))).slice(0,5) : [];
    const links = state.links.filter((link) => [link.title, link.group, link.url].join(" ").toLowerCase().includes(query)).slice(0,5);
    if(query.startsWith("/")){
      el.searchSuggestions.innerHTML = commands.map((cmd, index) => `<button class="suggestion" type="button" data-command-suggestion="${index}"><strong>${escapeHtml(cmd.title)}</strong><span>${escapeHtml(cmd.detail)}</span></button>`).join("") || `<div class="empty-state">No commands</div>`;
      el.searchSuggestions.querySelectorAll("[data-command-suggestion]").forEach((button) => button.addEventListener("click", () => runCommand(commands[Number(button.dataset.commandSuggestion)])));
    } else {
      el.searchSuggestions.innerHTML = links.map((link) => `<button class="suggestion" type="button" data-suggest-link="${escapeHtml(link.url)}"><strong>${escapeHtml(link.title)}</strong><span>${escapeHtml(link.url)}</span></button>`).join("") + `<button class="suggestion" type="button" data-search-web><strong>Search web</strong><span>${escapeHtml(el.searchInput.value.trim())}</span></button>`;
      el.searchSuggestions.querySelectorAll("[data-suggest-link]").forEach((button) => button.addEventListener("click", () => openLink(button.dataset.suggestLink)));
      el.searchSuggestions.querySelector("[data-search-web]")?.addEventListener("click", submitSearch);
    }
    el.searchSuggestions.hidden = false;
  }

  function submitSearch(event){
    if(event) event.preventDefault();
    const query = el.searchInput.value.trim();
    if(!query) return;
    if(query.startsWith("/")){ openCommandPalette(); el.commandInput.value = query.slice(1); renderCommands(); return; }
    const target = isUrl(query) ? normalizedUrl(query) : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.location.href = target;
  }

  function bindStaticEvents(){
    el.viewSelect.addEventListener("change", () => switchView(el.viewSelect.value));
    el.timeRange.addEventListener("change", () => persist((draft) => { draft.settings.timeRange = el.timeRange.value; store.appendActivity(draft, "filter", "Time range changed", el.timeRange.value); }, true));
    el.commandOpen.addEventListener("click", openCommandPalette);
    el.filterButton.addEventListener("click", () => persist((draft) => { draft.settings.filterOpen = !draft.settings.filterOpen; }, true));
    el.editToggle.addEventListener("click", toggleEditMode);
    el.notificationOpen.addEventListener("click", openNotifications);
    el.settingsOpen.addEventListener("click", openSettings);
    el.blurMode.addEventListener("click", () => { document.body.dataset.privacy = document.body.dataset.privacy === "true" ? "false" : "true"; });
    el.syncBookmarks.addEventListener("click", syncChromeBookmarks);
    el.addLink.addEventListener("click", () => openLinkModal());
    el.manageLinks.addEventListener("click", () => { if(!state.settings.editMode) toggleEditMode(); else openLinkModal(); });
    el.openModuleLibrary.addEventListener("click", openModuleLibrary);
    el.restoreModules.addEventListener("click", () => persist((draft) => { draft.hiddenWidgets = []; draft.widgetOrder = defaults.createDefaultState().widgetOrder; store.appendActivity(draft, "widget", "Modules restored", "Default widget order and visibility restored."); }, true));
    el.saveEdit.addEventListener("click", () => toggleEditMode());
    el.searchForm.addEventListener("submit", submitSearch);
    el.searchInput.addEventListener("input", renderSearchSuggestions);
    el.searchInput.addEventListener("focus", renderSearchSuggestions);
    el.searchInput.addEventListener("keydown", (event) => { if(event.key === "/" && !el.searchInput.value){ event.preventDefault(); openCommandPalette(); } });
    el.clearSearch.addEventListener("click", () => { el.searchInput.value = ""; el.searchSuggestions.hidden = true; el.searchInput.focus(); });
    el.priorityFilter.addEventListener("change", () => persist((draft) => { draft.filters.priority = el.priorityFilter.value; }, true));
    el.statusFilter.addEventListener("change", () => persist((draft) => { draft.filters.taskStatus = el.statusFilter.value; }, true));
    el.globalFilter.addEventListener("input", () => persist((draft) => { draft.filters.query = el.globalFilter.value; }, true));
    el.closeSettings.addEventListener("click", closeSettings);
    el.closeNotifications.addEventListener("click", closeNotifications);
    el.markSignalsRead.addEventListener("click", () => persist((draft) => { draft.notifications.forEach((item) => item.read = true); store.appendActivity(draft, "signal", "Notifications marked read", "All local signals were marked read."); }, true));
    el.modalClose.addEventListener("click", () => closeModal());
    el.themeSetting.addEventListener("change", () => persist((draft) => { draft.settings.theme = el.themeSetting.value; store.appendActivity(draft, "settings", "Theme changed", el.themeSetting.value); }, true));
    el.wallpaperSetting.addEventListener("change", () => persist((draft) => { draft.settings.wallpaper = el.wallpaperSetting.value; store.appendActivity(draft, "settings", "Wallpaper changed", el.wallpaperSetting.value); }, true));
    el.densitySetting.addEventListener("change", () => persist((draft) => { draft.settings.density = el.densitySetting.value; }, true));
    el.glassSetting.addEventListener("change", () => persist((draft) => { draft.settings.glass = el.glassSetting.value; }, true));
    el.nameSetting.addEventListener("change", () => persist((draft) => { draft.settings.greetingName = el.nameSetting.value || "Operator"; }, true));
    el.weatherSetting.addEventListener("change", () => persist((draft) => { draft.settings.weatherLocation = el.weatherSetting.value || "New York"; draft.weather.location = draft.settings.weatherLocation; draft.weather.updatedAt = new Date().toISOString(); }, true));
    el.timeFormatSetting.addEventListener("change", () => persist((draft) => { draft.settings.timeFormat = el.timeFormatSetting.value; }, true));
    el.defaultViewSetting.addEventListener("change", () => persist((draft) => { draft.settings.defaultView = el.defaultViewSetting.value; }, true));
    el.exportBackup.addEventListener("click", exportBackup);
    el.importBackup.addEventListener("click", () => el.importFile.click());
    el.restoreBackup.addEventListener("click", confirmRestore);
    el.resetDashboard.addEventListener("click", confirmReset);
    el.openOptions.addEventListener("click", () => { if(chrome && chrome.runtime) chrome.runtime.openOptionsPage(); else window.open("options.html"); });
    el.importFile.addEventListener("change", () => { const file = el.importFile.files[0]; if(file) importBackupFile(file); el.importFile.value = ""; });
    $$("[data-close]").forEach((node) => node.addEventListener("click", () => { closeCommandPalette(); closeSettings(); closeNotifications(); closeModal(); }));
    el.commandInput.addEventListener("input", renderCommands);
    el.commandInput.addEventListener("keydown", (event) => {
      const filtered = activeCommands.filtered || activeCommands;
      if(event.key === "ArrowDown"){ event.preventDefault(); commandIndex = Math.min(filtered.length - 1, commandIndex + 1); renderCommands(); }
      if(event.key === "ArrowUp"){ event.preventDefault(); commandIndex = Math.max(0, commandIndex - 1); renderCommands(); }
      if(event.key === "Enter"){ event.preventDefault(); runCommand(filtered[commandIndex]); }
    });
    document.addEventListener("keydown", (event) => {
      if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"){ event.preventDefault(); openCommandPalette(); }
      if(event.key === "Escape"){ closeCommandPalette(); closeSettings(); closeNotifications(); closeModal(); el.searchSuggestions.hidden = true; }
    });
  }

  function openModuleLibrary(){
    const body = `<div class="list-stack">${defaults.moduleCatalog.map((module) => `<div class="list-item"><span class="status-dot ${state.hiddenWidgets.includes(module.id) ? "warning" : "success"}"></span><div><strong>${escapeHtml(module.title)}</strong><small>${escapeHtml(module.type)} · ${escapeHtml(module.span)}</small></div><button class="widget-action" data-toggle-module="${escapeHtml(module.id)}" type="button">${state.hiddenWidgets.includes(module.id) ? "Show" : "Hide"}</button></div>`).join("")}</div>`;
    openModal("Module library", body, `<button type="button" id="closeLibrary">Done</button>`);
    $("#closeLibrary").addEventListener("click", () => closeModal());
    el.modalBody.querySelectorAll("[data-toggle-module]").forEach((button) => button.addEventListener("click", () => persist((draft) => { const id = button.dataset.toggleModule; if(draft.hiddenWidgets.includes(id)) draft.hiddenWidgets = draft.hiddenWidgets.filter((item) => item !== id); else draft.hiddenWidgets.push(id); store.appendActivity(draft, "widget", "Module visibility changed", id); }, true)));
  }

  function render(){
    setTheme();
    renderTop();
    renderStatusStack();
    renderFocus();
    renderSignalsWidget();
    renderTimeWeather();
    renderAgenda();
    renderWorld();
    renderBookmarks();
    renderDock();
    renderDashboardSections();
    renderNotifications();
  }

  async function init(){
    setupSelects();
    bindStaticEvents();
    state = await store.getState();
    if(!state.settings.selectedView) state.settings.selectedView = state.settings.defaultView || "home";
    render();
    tickTimer = setInterval(() => { renderTimeWeather(); renderWorld(); renderFocus(); }, 1000);
  }

  window.addEventListener("beforeunload", () => { if(tickTimer) clearInterval(tickTimer); });
  init().catch((error) => {
    console.error(error);
    addToast("LiveDash failed to initialize");
  });
})();
