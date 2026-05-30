(function(){
  const D = globalThis.LiveDashDefaults;
  const S = globalThis.LiveDashStorage;
  const el = {};
  let state = null;
  let taskSort = { key: "priority", dir: "asc" };
  let lastFocus = null;

  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  const sectionMeta = {
    overview: { title: "Operational overview", subtitle: "A local-first command surface for priorities, metrics, signals, notes, and activity." },
    focus: { title: "Focus command", subtitle: "Protected work sessions, ranked priorities, and follow-up capture." },
    tasks: { title: "Task operations", subtitle: "Prioritized work queue with due dates, status, filtering, and completion state." },
    metrics: { title: "Metric intelligence", subtitle: "Targets, deltas, trends, source metadata, and status distribution." },
    calendar: { title: "Schedule and commitments", subtitle: "Today’s commitments with operational context and freshness." },
    notes: { title: "Notes and follow-ups", subtitle: "Searchable local notes with tags and timestamps." },
    activity: { title: "Activity history", subtitle: "Local audit trail for dashboard changes and product events." },
    settings: { title: "Settings", subtitle: "Theme, data management, import/export, and extension options." }
  };

  function $(id){ return document.getElementById(id); }
  function esc(value){
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  }
  function fmtDate(value){
    if(!value) return "No due date";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
  }
  function fmtTime(value){
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }
  function relFresh(min){
    if(min < 2) return "Updated just now";
    if(min < 60) return `Updated ${min}m ago`;
    return `Updated ${Math.round(min / 60)}h ago`;
  }
  function toast(message, tone){
    const item = document.createElement("div");
    item.className = `toast ${tone || "info"}`;
    item.textContent = message;
    el.toastRegion.append(item);
    setTimeout(() => item.remove(), 3200);
  }
  function applyTheme(){
    const pref = state.settings.theme;
    const systemLight = matchMedia("(prefers-color-scheme: light)").matches;
    const theme = pref === "system" ? (systemLight ? "light" : "dark") : pref;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = state.settings.density;
    document.documentElement.dataset.motion = state.settings.reducedMotion ? "reduced" : "standard";
  }
  function moduleVisible(id){
    return !(state.settings.hiddenModules || []).includes(id);
  }
  function viewSections(){
    const active = state.settings.activeSection;
    if(active && active !== "overview"){
      if(active === "settings") return ["settings"];
      return [active];
    }
    const view = state.settings.selectedView;
    if(view === "focus") return ["summary", "focus", "tasks", "notes", "activity"];
    if(view === "operations") return ["summary", "calendar", "signals", "activity", "tasks"];
    if(view === "metrics") return ["summary", "metrics", "activity"];
    if(view === "minimal") return ["summary", "focus", "tasks"];
    return ["summary", "tasks", "metrics", "calendar", "signals", "notes", "activity"];
  }
  function filteredTasks(){
    const f = state.filters;
    const q = (f.query || "").toLowerCase();
    let tasks = state.tasks.filter((task) => {
      if(f.priority !== "all" && task.priority !== f.priority) return false;
      if(f.status !== "all" && task.status !== f.status) return false;
      if(q && !`${task.title} ${task.source} ${task.owner} ${task.priority} ${task.status}`.toLowerCase().includes(q)) return false;
      return true;
    });
    tasks.sort((a,b) => {
      let av = a[taskSort.key];
      let bv = b[taskSort.key];
      if(taskSort.key === "priority"){
        av = priorityRank[av] ?? 9;
        bv = priorityRank[bv] ?? 9;
      }
      if(taskSort.key === "due"){
        av = new Date(av || 0).getTime();
        bv = new Date(bv || 0).getTime();
      }
      if(av < bv) return taskSort.dir === "asc" ? -1 : 1;
      if(av > bv) return taskSort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return tasks;
  }
  function filteredNotes(){
    const q = (state.filters.query || "").toLowerCase();
    if(!q) return state.notes;
    return state.notes.filter((note) => `${note.title} ${note.body} ${(note.tags || []).join(" ")}`.toLowerCase().includes(q));
  }
  function unreadCount(){
    return state.notifications.filter((notice) => !notice.read).length;
  }
  function openChromeUrl(path){
    if(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage && path === "options"){
      chrome.runtime.openOptionsPage();
      return;
    }
    if(path === "options") window.location.href = "options.html";
  }

  function bindBase(){
    el.savedViewSelect = $("savedViewSelect");
    el.timeRangeSelect = $("timeRangeSelect");
    el.filterToggle = $("filterToggle");
    el.filterBar = $("filterBar");
    el.editModeToggle = $("editModeToggle");
    el.notificationButton = $("notificationButton");
    el.notificationCount = $("notificationCount");
    el.freshnessPill = $("freshnessPill");
    el.settingsButton = $("settingsButton");
    el.mainNav = $("mainNav");
    el.dashboardGrid = $("dashboardGrid");
    el.pageTitle = $("pageTitle");
    el.pageSubtitle = $("pageSubtitle");
    el.priorityFilter = $("priorityFilter");
    el.statusFilter = $("statusFilter");
    el.signalFilter = $("signalFilter");
    el.globalFilter = $("globalFilter");
    el.editPanel = $("editPanel");
    el.toastRegion = $("toastRegion");
    el.commandPalette = $("commandPalette");
    el.commandInput = $("commandInput");
    el.commandList = $("commandList");
    el.notificationDrawer = $("notificationDrawer");
    el.notificationList = $("notificationList");
    el.settingsDrawer = $("settingsDrawer");
    el.themeSelect = $("themeSelect");
    el.densitySelect = $("densitySelect");
    el.defaultViewSelect = $("defaultViewSelect");
    el.modalRoot = $("modalRoot");
    el.modalTitle = $("modalTitle");
    el.modalBody = $("modalBody");
    el.modalFooter = $("modalFooter");
    el.importFileInput = $("importFileInput");
  }

  function bindEvents(){
    el.savedViewSelect.addEventListener("change", async () => {
      await mutate((draft) => {
        draft.settings.selectedView = el.savedViewSelect.value;
        draft.settings.activeSection = "overview";
        S.appendActivity(draft, "view", "Saved view changed", selectedViewName(el.savedViewSelect.value));
      }, "View changed");
    });
    el.timeRangeSelect.addEventListener("change", async () => {
      await mutate((draft) => {
        draft.settings.timeRange = el.timeRangeSelect.value;
        S.appendActivity(draft, "filter", "Time range changed", labelForRange(el.timeRangeSelect.value));
      }, "Time range updated");
    });
    el.filterToggle.addEventListener("click", async () => {
      await mutate((draft) => { draft.settings.filterOpen = !draft.settings.filterOpen; }, state.settings.filterOpen ? "Filters hidden" : "Filters shown");
    });
    el.editModeToggle.addEventListener("click", async () => toggleEditMode());
    $("saveEditButton").addEventListener("click", async () => toggleEditMode(false));
    $("moduleLibraryButton").addEventListener("click", openModuleLibrary);
    $("restoreWidgetsButton").addEventListener("click", async () => {
      await mutate((draft) => {
        draft.settings.hiddenModules = [];
        S.appendActivity(draft, "layout", "Default modules restored", "All default v4 dashboard modules are visible.");
      }, "Default modules restored");
    });
    $("quickTaskButton").addEventListener("click", () => openTaskDialog());
    $("quickNoteButton").addEventListener("click", () => openNoteDialog());
    $("startFocusButton").addEventListener("click", () => toggleFocus());
    $("openCommandButton").addEventListener("click", () => openPalette());
    el.notificationButton.addEventListener("click", () => openNotifications());
    $("closeNotifications").addEventListener("click", closeOverlays);
    $("clearNotifications").addEventListener("click", async () => {
      await mutate((draft) => {
        draft.notifications.forEach((item) => { item.read = true; });
        S.appendActivity(draft, "notification", "Notifications marked read", "Notification center cleared.");
      }, "Notifications cleared");
    });
    el.settingsButton.addEventListener("click", () => openSettings());
    $("closeSettings").addEventListener("click", closeOverlays);
    $("openOptionsPage").addEventListener("click", () => openChromeUrl("options"));
    $("settingsExport").addEventListener("click", () => exportDashboard());
    $("settingsImport").addEventListener("click", () => el.importFileInput.click());
    $("settingsReset").addEventListener("click", () => openResetDialog());
    el.themeSelect.addEventListener("change", async () => mutate((draft) => { draft.settings.theme = el.themeSelect.value; S.appendActivity(draft, "settings", "Theme changed", el.themeSelect.value); }, "Theme updated"));
    el.densitySelect.addEventListener("change", async () => mutate((draft) => { draft.settings.density = el.densitySelect.value; S.appendActivity(draft, "settings", "Density changed", el.densitySelect.value); }, "Density updated"));
    el.defaultViewSelect.addEventListener("change", async () => mutate((draft) => { draft.settings.defaultView = el.defaultViewSelect.value; S.appendActivity(draft, "settings", "Default view changed", selectedViewName(el.defaultViewSelect.value)); }, "Default view updated"));
    [el.priorityFilter, el.statusFilter, el.signalFilter].forEach((node) => node.addEventListener("change", onFilterChange));
    el.globalFilter.addEventListener("input", onFilterChange);
    el.importFileInput.addEventListener("change", importFromFile);
    $("modalClose").addEventListener("click", closeOverlays);
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    el.commandInput.addEventListener("input", renderCommands);
    setInterval(updateClockSurface, 1000);
  }

  async function onFilterChange(){
    await S.updateState((draft) => {
      draft.filters.priority = el.priorityFilter.value;
      draft.filters.status = el.statusFilter.value;
      draft.filters.signal = el.signalFilter.value;
      draft.filters.query = el.globalFilter.value.trim();
    });
    state = await S.getState();
    render();
  }

  function onDocumentClick(event){
    const closeType = event.target.dataset.close;
    if(closeType) closeOverlays();
    const navButton = event.target.closest("[data-nav]");
    if(navButton) setActiveSection(navButton.dataset.nav);
    const taskToggle = event.target.closest("[data-task-toggle]");
    if(taskToggle) setTaskStatus(taskToggle.dataset.taskToggle, taskToggle.checked ? "done" : "open");
    const taskEdit = event.target.closest("[data-task-edit]");
    if(taskEdit) openTaskDialog(taskEdit.dataset.taskEdit);
    const taskDelete = event.target.closest("[data-task-delete]");
    if(taskDelete) deleteTask(taskDelete.dataset.taskDelete);
    const noteEdit = event.target.closest("[data-note-edit]");
    if(noteEdit) openNoteDialog(noteEdit.dataset.noteEdit);
    const noteDelete = event.target.closest("[data-note-delete]");
    if(noteDelete) deleteNote(noteDelete.dataset.noteDelete);
    const moduleHide = event.target.closest("[data-module-hide]");
    if(moduleHide) hideModule(moduleHide.dataset.moduleHide);
    const moduleDetail = event.target.closest("[data-module-detail]");
    if(moduleDetail) openModuleDetail(moduleDetail.dataset.moduleDetail);
    const moduleRestore = event.target.closest("[data-module-restore]");
    if(moduleRestore) restoreModule(moduleRestore.dataset.moduleRestore);
    const moduleAdd = event.target.closest("[data-module-add]");
    if(moduleAdd) restoreModule(moduleAdd.dataset.moduleAdd);
    const commandItem = event.target.closest("[data-command]");
    if(commandItem) runCommand(commandItem.dataset.command);
    const sortButton = event.target.closest("[data-sort]");
    if(sortButton) sortTasks(sortButton.dataset.sort);
    const exportButton = event.target.closest("[data-export-now]");
    if(exportButton) exportDashboard();
    if(event.target.closest("#settingsInlineOpen")) openSettings();
    if(event.target.closest("#inlineResetButton")) openResetDialog();
    const resetButton = event.target.closest("[data-reset-confirm]");
    if(resetButton) resetDashboard();
    const backupButton = event.target.closest("[data-backup-first]");
    if(backupButton) exportDashboard();
    const restoreButton = event.target.closest("[data-restore-backup]");
    if(restoreButton) restoreBackup();
  }

  function onKeyDown(event){
    const isCommand = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    if(isCommand){
      event.preventDefault();
      openPalette();
    }
    if(event.key === "Escape") closeOverlays();
  }

  async function mutate(mutator, message){
    state = await S.updateState(mutator);
    applyTheme();
    render();
    if(message) toast(message, "success");
  }

  function selectedViewName(id){
    return (D.savedViews.find((view) => view.id === id) || D.savedViews[0]).name;
  }
  function labelForRange(id){
    return ({ today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" })[id] || id;
  }
  function setSelectOptions(select){
    select.innerHTML = D.savedViews.map((view) => `<option value="${esc(view.id)}">${esc(view.name)}</option>`).join("");
  }

  function render(){
    renderShell();
    renderNav();
    renderDashboard();
    renderNotifications();
  }

  function renderShell(){
    const meta = sectionMeta[state.settings.activeSection || "overview"] || sectionMeta.overview;
    el.pageTitle.textContent = meta.title;
    el.pageSubtitle.textContent = meta.subtitle;
    setSelectOptions(el.savedViewSelect);
    setSelectOptions(el.defaultViewSelect);
    el.savedViewSelect.value = state.settings.selectedView;
    el.defaultViewSelect.value = state.settings.defaultView;
    el.timeRangeSelect.value = state.settings.timeRange;
    el.filterBar.hidden = !state.settings.filterOpen;
    el.filterToggle.setAttribute("aria-expanded", String(state.settings.filterOpen));
    el.priorityFilter.value = state.filters.priority;
    el.statusFilter.value = state.filters.status;
    el.signalFilter.value = state.filters.signal;
    el.globalFilter.value = state.filters.query || "";
    el.editPanel.hidden = !state.settings.editMode;
    el.editModeToggle.textContent = state.settings.editMode ? "Edit mode" : "View mode";
    el.editModeToggle.setAttribute("aria-pressed", String(state.settings.editMode));
    el.notificationCount.textContent = String(unreadCount());
    el.themeSelect.value = state.settings.theme;
    el.densitySelect.value = state.settings.density;
    el.freshnessPill.textContent = `Synced ${fmtTime(state.updatedAt)}`;
    $("startFocusButton").textContent = state.focus.active ? "Stop focus" : "Start focus";
    $("storageHealth").textContent = S.hasChromeStorage() ? "Chrome storage active" : "Local storage fallback";
    $("storageMeta").textContent = `${state.tasks.length} tasks, ${state.notes.length} notes, ${state.activity.length} activity records`;
  }

  function renderNav(){
    el.mainNav.innerHTML = D.navItems.map((item) => {
      const active = (state.settings.activeSection || "overview") === item.id;
      return `<button class="nav-item${active ? " active" : ""}" type="button" data-nav="${esc(item.id)}" aria-current="${active ? "page" : "false"}"><span>${esc(item.label)}</span></button>`;
    }).join("");
  }

  function renderDashboard(){
    const sections = viewSections();
    const pieces = [];
    if(sections.includes("settings")){
      pieces.push(renderSettingsSection());
    } else {
      if(sections.includes("summary")) pieces.push(renderSummary());
      if(sections.includes("focus")) pieces.push(renderFocusPanel());
      if(sections.includes("tasks")) pieces.push(renderTasksSection());
      if(sections.includes("metrics")) pieces.push(renderMetricsSection());
      if(sections.includes("calendar")) pieces.push(renderScheduleSection());
      if(sections.includes("signals")) pieces.push(renderSignalsSection());
      if(sections.includes("notes")) pieces.push(renderNotesSection());
      if(sections.includes("activity")) pieces.push(renderActivitySection());
      if(state.settings.editMode) pieces.push(renderModuleLibraryInline());
    }
    el.dashboardGrid.innerHTML = pieces.join("");
  }

  function widgetFrame(id, title, kicker, span, body, meta){
    if(!moduleVisible(id)) return "";
    const edit = state.settings.editMode;
    return `<article class="widget-card span-${span || 6}${edit ? " editing" : ""}" data-widget="${esc(id)}">
      <header class="widget-header">
        <div><span class="section-eyebrow">${esc(kicker || "Module")}</span><h2>${esc(title)}</h2></div>
        <div class="widget-toolbar" aria-label="${esc(title)} controls">
          ${meta ? `<span class="source-chip">${esc(meta)}</span>` : ""}
          <button class="icon-only" type="button" data-module-detail="${esc(id)}" aria-label="Open ${esc(title)} details">Inspect</button>
          ${edit ? `<button class="icon-only danger-text" type="button" data-module-hide="${esc(id)}" aria-label="Hide ${esc(title)}">Hide</button>` : ""}
        </div>
      </header>
      <div class="widget-body">${body}</div>
    </article>`;
  }

  function renderSummary(){
    const openTasks = state.tasks.filter((task) => task.status !== "done").length;
    const critical = state.tasks.filter((task) => task.priority === "critical" && task.status !== "done").length;
    const blocked = state.tasks.filter((task) => task.status === "blocked").length;
    const unread = unreadCount();
    const metric = state.metrics[0];
    const body = `<div class="summary-layout">
      ${summaryCell("Readiness", `${metric.value}${metric.suffix}`, `${metric.delta > 0 ? "+" : ""}${metric.delta}% vs ${labelForRange(state.settings.timeRange)}`, metric.delta >= 0 ? "success" : "warning")}
      ${summaryCell("Open priorities", openTasks, `${critical} critical`, critical ? "warning" : "success")}
      ${summaryCell("Blocked", blocked, blocked ? "Needs review" : "Clear", blocked ? "danger" : "success")}
      ${summaryCell("Unread signals", unread, unread ? "Notification center" : "No unread alerts", unread ? "info" : "success")}
      <div class="executive-strip"><strong>Today’s operating stance</strong><span>${critical ? "Resolve critical task before adding scope." : "System is stable. Keep the focus block protected."}</span></div>
    </div>`;
    return widgetFrame("summary", "Command Summary", "Overview", 12, body, `Source: local · ${relFresh(3)}`);
  }

  function summaryCell(label, value, detail, tone){
    return `<div class="summary-cell ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></div>`;
  }

  function renderFocusPanel(){
    const remaining = focusRemaining();
    const focusBody = `<div class="focus-grid">
      <div class="focus-timer"><span>${state.focus.active ? "Active session" : "Focus ready"}</span><strong id="focusCountdown">${remaining}</strong><button class="button primary" type="button" id="focusInlineButton">${state.focus.active ? "Stop session" : "Start 25m session"}</button></div>
      <div class="focus-stats"><div><span>Completed today</span><strong>${state.focus.completedToday}</strong></div><div><span>Default block</span><strong>${state.focus.durationMin}m</strong></div><div><span>Next priority</span><strong>${esc(nextTaskTitle())}</strong></div></div>
    </div>`;
    setTimeout(() => {
      const button = $("focusInlineButton");
      if(button) button.addEventListener("click", () => toggleFocus());
    }, 0);
    return widgetFrame("focusTimer", "Focus Command", "Focus", 4, focusBody, state.focus.active ? "Live" : "Ready");
  }

  function focusRemaining(){
    if(!state.focus.active || !state.focus.endsAt) return `${state.focus.durationMin}:00`;
    const ms = Math.max(0, new Date(state.focus.endsAt).getTime() - Date.now());
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }
  function nextTaskTitle(){
    const task = state.tasks.filter((item) => item.status !== "done").sort((a,b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9))[0];
    return task ? task.title : "Queue clear";
  }

  function renderTasksSection(){
    const tasks = filteredTasks();
    const rows = tasks.map((task) => `<tr>
      <td><label class="task-check"><input type="checkbox" data-task-toggle="${esc(task.id)}" ${task.status === "done" ? "checked" : ""}><span>${esc(task.title)}</span></label></td>
      <td><span class="priority ${esc(task.priority)}">${esc(task.priority)}</span></td>
      <td><span class="status ${esc(task.status)}">${esc(task.status)}</span></td>
      <td>${esc(fmtDate(task.due))}</td>
      <td>${esc(task.source || "Manual")}</td>
      <td class="row-actions"><button class="table-action" type="button" data-task-edit="${esc(task.id)}">Edit</button><button class="table-action danger-text" type="button" data-task-delete="${esc(task.id)}">Delete</button></td>
    </tr>`).join("");
    const empty = `<div class="empty-state"><strong>No tasks match this view</strong><span>Clear filters or add a task to restart the queue.</span><button class="button primary" type="button" id="emptyAddTask">Add task</button></div>`;
    const table = `<div class="table-tools"><span>${tasks.length} records</span><button class="button secondary" type="button" id="tableAddTask">Add task</button></div>
      ${tasks.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th><button data-sort="title" type="button">Task</button></th><th><button data-sort="priority" type="button">Priority</button></th><th><button data-sort="status" type="button">Status</button></th><th><button data-sort="due" type="button">Due</button></th><th>Source</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty}`;
    setTimeout(() => {
      const addA = $("tableAddTask");
      const addB = $("emptyAddTask");
      if(addA) addA.addEventListener("click", () => openTaskDialog());
      if(addB) addB.addEventListener("click", () => openTaskDialog());
    }, 0);
    return widgetFrame("priorities", "Today’s Priorities", "Work queue", 8, table, `${tasks.length} visible`);
  }

  function renderMetricsSection(){
    const cards = state.metrics.map((metric) => `<div class="metric-card">
      <div class="metric-head"><span>${esc(metric.label)}</span><span class="delta ${metric.delta >= 0 ? "positive" : "negative"}">${metric.delta >= 0 ? "+" : ""}${esc(metric.delta)}</span></div>
      <div class="metric-value">${esc(metric.value)}${esc(metric.suffix)}</div>
      ${sparkline(metric.series)}
      <div class="metric-meta"><span>Target ${esc(metric.target)}${esc(metric.suffix)}</span><span>${esc(metric.source)}</span><span>${relFresh(metric.freshnessMin)}</span></div>
    </div>`).join("");
    const trend = `<div class="trend-panel"><div class="trend-head"><strong>Readiness trend</strong><span>${labelForRange(state.settings.timeRange)}</span></div>${lineChart(state.metrics[0].series, "Readiness")}</div>`;
    const distribution = statusDistribution();
    return widgetFrame("metrics", "Operational Metrics", "Metrics", 12, `<div class="metric-card-grid">${cards}</div><div class="chart-grid">${trend}${distribution}</div>`, `Range: ${labelForRange(state.settings.timeRange)}`);
  }

  function sparkline(values){
    const points = scalePoints(values, 120, 34);
    return `<svg class="sparkline" viewBox="0 0 120 34" role="img" aria-label="Metric sparkline"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
  }
  function lineChart(values, label){
    const points = scalePoints(values, 520, 170);
    const area = `0,170 ${points} 520,170`;
    return `<svg class="line-chart" viewBox="0 0 520 170" role="img" aria-label="${esc(label)} chart"><path d="M ${area.replace(/ /g, " L ")}" fill="currentColor" opacity="0.08"></path><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
  }
  function scalePoints(values, width, height){
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(1, max - min);
    return values.map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / spread) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }
  function statusDistribution(){
    const counts = ["open", "blocked", "done"].map((status) => ({ status, count: state.tasks.filter((task) => task.status === status).length }));
    const max = Math.max(1, ...counts.map((item) => item.count));
    return `<div class="distribution-panel"><div class="trend-head"><strong>Status distribution</strong><span>Tasks</span></div>${counts.map((item) => `<div class="bar-row"><span>${esc(item.status)}</span><div class="bar-track"><span style="width:${Math.max(8, item.count / max * 100)}%"></span></div><strong>${item.count}</strong></div>`).join("")}</div>`;
  }

  function renderScheduleSection(){
    const items = state.commitments.map((item) => `<li><time>${esc(item.time)}</time><div><strong>${esc(item.title)}</strong><span>${esc(item.type)} · ${esc(item.status)}</span></div></li>`).join("");
    const calendar = buildCalendar();
    return widgetFrame("schedule", "Schedule / Commitments", "Calendar", 6, `<div class="schedule-layout"><ol class="agenda-list">${items}</ol>${calendar}</div>`, "Local agenda");
  }
  function buildCalendar(){
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for(let i=0;i<first;i++) cells.push("<span></span>");
    for(let d=1; d<=days; d++) cells.push(`<span class="${d === now.getDate() ? "today" : ""}">${d}</span>`);
    return `<div class="mini-calendar"><strong>${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(now)}</strong><div class="calendar-grid">${["S","M","T","W","T","F","S"].map((day) => `<b>${day}</b>`).join("")}${cells.join("")}</div></div>`;
  }

  function renderSignalsSection(){
    const notices = state.notifications.filter((notice) => state.filters.signal === "all" || notice.severity === state.filters.signal).slice(0, 5);
    const body = notices.length ? notices.map((notice) => `<article class="signal-item ${esc(notice.severity)}"><span></span><div><strong>${esc(notice.title)}</strong><p>${esc(notice.body)}</p><small>${fmtTime(notice.createdAt)}</small></div></article>`).join("") : `<div class="empty-state"><strong>No signals match filters</strong><span>Clear the signal filter to view all notices.</span></div>`;
    return widgetFrame("signals", "Signals / Alerts", "Alerts", 6, `<div class="signal-list">${body}</div>`, `${unreadCount()} unread`);
  }

  function renderNotesSection(){
    const notes = filteredNotes();
    const body = notes.length ? `<div class="note-list">${notes.map((note) => `<article class="note-card"><div><strong>${esc(note.title)}</strong><time>${fmtDate(note.createdAt)}</time></div><p>${esc(note.body)}</p><div class="tag-row">${(note.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div><div class="note-actions"><button class="table-action" type="button" data-note-edit="${esc(note.id)}">Edit</button><button class="table-action danger-text" type="button" data-note-delete="${esc(note.id)}">Delete</button></div></article>`).join("")}</div>` : `<div class="empty-state"><strong>No notes found</strong><span>Add a note or clear search filters.</span><button class="button primary" type="button" id="emptyAddNote">Add note</button></div>`;
    setTimeout(() => {
      const add = $("emptyAddNote");
      if(add) add.addEventListener("click", () => openNoteDialog());
    }, 0);
    return widgetFrame("notes", "Notes / Follow-ups", "Knowledge", 6, body, `${notes.length} notes`);
  }

  function renderActivitySection(){
    const q = (state.filters.query || "").toLowerCase();
    const activity = state.activity.filter((item) => !q || `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(q)).slice(0, 10);
    const body = activity.length ? `<ol class="activity-feed">${activity.map((item) => `<li><span></span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><time>${fmtTime(item.createdAt)}</time></div></li>`).join("")}</ol>` : `<div class="empty-state"><strong>No activity found</strong><span>Actions you take in LiveDash will appear here.</span></div>`;
    return widgetFrame("activity", "Activity / History", "Audit", 6, body, `${state.activity.length} records`);
  }

  function renderSettingsSection(){
    return widgetFrame("settings", "Settings", "Preferences", 12, `<div class="settings-grid-inline"><div class="settings-card"><strong>Appearance</strong><p>Theme: ${esc(state.settings.theme)} · Density: ${esc(state.settings.density)}</p><button class="button secondary" type="button" id="settingsInlineOpen">Open settings drawer</button></div><div class="settings-card"><strong>Data management</strong><p>Use validated import/export and reset with backup protection.</p><div class="button-row"><button class="button secondary" data-export-now type="button">Export</button><button class="button danger" type="button" id="inlineResetButton">Reset</button></div></div></div>`, "Extension options");
  }

  function renderModuleLibraryInline(){
    const hidden = state.settings.hiddenModules || [];
    const cards = D.moduleCatalog.map((mod) => {
      const isHidden = hidden.includes(mod.id);
      return `<article class="module-card"><div><strong>${esc(mod.title)}</strong><p>${esc(mod.description)}</p><span>${esc(mod.category)} · ${mod.span} columns</span></div><button class="button ${isHidden ? "primary" : "secondary"}" type="button" data-module-add="${esc(mod.id)}">${isHidden ? "Restore" : "Visible"}</button></article>`;
    }).join("");
    return `<section class="widget-card span-12 module-library"><header class="widget-header"><div><span class="section-eyebrow">Edit mode</span><h2>Module Library</h2></div></header><div class="module-grid">${cards}</div></section>`;
  }

  function renderNotifications(){
    el.notificationList.innerHTML = state.notifications.length ? state.notifications.map((notice) => `<article class="drawer-item ${esc(notice.severity)} ${notice.read ? "read" : "unread"}"><div><strong>${esc(notice.title)}</strong><p>${esc(notice.body)}</p><time>${fmtTime(notice.createdAt)}</time></div></article>`).join("") : `<div class="empty-state"><strong>No notifications</strong><span>System notices and reminders will appear here.</span></div>`;
  }

  async function setActiveSection(id){
    await mutate((draft) => {
      draft.settings.activeSection = id;
      if(id === "settings") draft.settings.filterOpen = false;
      S.appendActivity(draft, "navigation", "Navigation changed", sectionMeta[id] ? sectionMeta[id].title : id);
    });
    if(id === "settings") setTimeout(() => {
      const inline = $("settingsInlineOpen");
      const reset = $("inlineResetButton");
      if(inline) inline.addEventListener("click", openSettings);
      if(reset) reset.addEventListener("click", openResetDialog);
    }, 0);
  }
  async function toggleEditMode(force){
    const next = typeof force === "boolean" ? force : !state.settings.editMode;
    await mutate((draft) => {
      draft.settings.editMode = next;
      S.appendActivity(draft, "layout", next ? "Edit mode enabled" : "Edit mode saved", next ? "Widget controls are visible." : "Dashboard returned to calm view mode.");
    }, next ? "Edit mode enabled" : "Edit mode saved");
  }
  async function toggleFocus(){
    await mutate((draft) => {
      if(draft.focus.active){
        draft.focus.active = false;
        draft.focus.endsAt = null;
        draft.focus.startedAt = null;
        draft.focus.completedToday += 1;
        S.appendActivity(draft, "focus", "Focus session completed", `${draft.focus.durationMin} minute session stopped.`);
        S.appendNotification(draft, "Focus session completed", "Focus time was recorded locally.", "success");
      } else {
        const start = new Date();
        const end = new Date(start.getTime() + draft.focus.durationMin * 60000);
        draft.focus.active = true;
        draft.focus.startedAt = start.toISOString();
        draft.focus.endsAt = end.toISOString();
        S.appendActivity(draft, "focus", "Focus session started", `${draft.focus.durationMin} minute session started.`);
      }
    }, state.focus.active ? "Focus session completed" : "Focus session started");
  }
  function updateClockSurface(){
    if(!state) return;
    const focusNode = $("focusCountdown");
    if(focusNode){
      const value = focusRemaining();
      focusNode.textContent = value;
      if(value === "00:00" && lastFocus !== value && state.focus.active){
        toggleFocus();
      }
      lastFocus = value;
    }
  }

  function openPalette(){
    el.commandPalette.hidden = false;
    el.commandInput.value = "";
    renderCommands();
    setTimeout(() => el.commandInput.focus(), 0);
  }
  function commandRegistry(){
    return [
      { id: "add-task", title: "Add task", detail: "Create a priority task", run: () => openTaskDialog() },
      { id: "add-note", title: "Add note", detail: "Capture a tagged follow-up", run: () => openNoteDialog() },
      { id: "toggle-edit", title: "Toggle edit mode", detail: "Show or hide widget controls", run: () => toggleEditMode() },
      { id: "start-focus", title: state.focus.active ? "Stop focus session" : "Start focus session", detail: "Control the local focus timer", run: () => toggleFocus() },
      { id: "open-settings", title: "Open settings", detail: "Theme, import, export, reset", run: () => openSettings() },
      { id: "export", title: "Export dashboard data", detail: "Download a versioned backup", run: () => exportDashboard() },
      { id: "import", title: "Import dashboard data", detail: "Validate and restore a backup", run: () => el.importFileInput.click() },
      { id: "reset", title: "Reset dashboard", detail: "Safe reset with restore point", run: () => openResetDialog() },
      ...D.savedViews.map((view) => ({ id: `view-${view.id}`, title: `Switch view: ${view.name}`, detail: view.description, run: () => changeView(view.id) })),
      ...D.moduleCatalog.map((mod) => ({ id: `module-${mod.id}`, title: `Add module: ${mod.title}`, detail: mod.description, run: () => restoreModule(mod.id) })),
      { id: "theme", title: "Change theme", detail: "Toggle dark and light mode", run: () => cycleTheme() }
    ];
  }
  function renderCommands(){
    const q = (el.commandInput.value || "").toLowerCase();
    const matches = commandRegistry().filter((cmd) => `${cmd.title} ${cmd.detail}`.toLowerCase().includes(q)).slice(0, 14);
    el.commandList.innerHTML = matches.length ? matches.map((cmd) => `<button class="command-row" type="button" data-command="${esc(cmd.id)}" role="option"><strong>${esc(cmd.title)}</strong><span>${esc(cmd.detail)}</span></button>`).join("") : `<div class="empty-state compact"><strong>No command found</strong><span>Try task, note, export, view, or theme.</span></div>`;
  }
  function runCommand(id){
    const command = commandRegistry().find((cmd) => cmd.id === id);
    closeOverlays();
    if(command) command.run();
  }

  async function changeView(id){
    await mutate((draft) => { draft.settings.selectedView = id; draft.settings.activeSection = "overview"; S.appendActivity(draft, "view", "Saved view changed", selectedViewName(id)); }, "View changed");
  }
  async function cycleTheme(){
    const next = state.settings.theme === "dark" ? "light" : "dark";
    await mutate((draft) => { draft.settings.theme = next; S.appendActivity(draft, "settings", "Theme changed", next); }, "Theme changed");
  }
  function closeOverlays(){
    el.commandPalette.hidden = true;
    el.notificationDrawer.hidden = true;
    el.settingsDrawer.hidden = true;
    el.modalRoot.hidden = true;
  }
  function openNotifications(){ el.notificationDrawer.hidden = false; }
  function openSettings(){ el.settingsDrawer.hidden = false; }

  function openTaskDialog(id){
    const task = state.tasks.find((item) => item.id === id) || { title: "", priority: "medium", status: "open", due: new Date().toISOString().slice(0,10), source: "Manual", owner: "You" };
    openModal(id ? "Edit task" : "Add task", `<form id="taskForm" class="form-stack">
      <label class="field"><span>Title</span><input id="taskTitle" required value="${esc(task.title)}" maxlength="120"></label>
      <div class="form-grid"><label class="field"><span>Priority</span><select id="taskPriority"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label class="field"><span>Status</span><select id="taskStatus"><option value="open">Open</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label></div>
      <div class="form-grid"><label class="field"><span>Due date</span><input id="taskDue" type="date" value="${esc((task.due || "").slice(0,10))}"></label><label class="field"><span>Source</span><input id="taskSource" value="${esc(task.source || "Manual")}"></label></div>
    </form>`, `<button class="button secondary" type="button" data-close="modal">Cancel</button><button class="button primary" type="submit" form="taskForm">${id ? "Save task" : "Create task"}</button>`);
    $("taskPriority").value = task.priority;
    $("taskStatus").value = task.status;
    $("taskForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = $("taskTitle").value.trim();
      if(!title){ toast("Task title is required", "warning"); return; }
      await mutate((draft) => {
        if(id){
          const found = draft.tasks.find((item) => item.id === id);
          Object.assign(found, { title, priority: $("taskPriority").value, status: $("taskStatus").value, due: $("taskDue").value ? new Date($("taskDue").value).toISOString() : null, source: $("taskSource").value.trim() || "Manual" });
          S.appendActivity(draft, "task", "Task updated", title);
        } else {
          draft.tasks.unshift({ id: D.uid("task"), title, priority: $("taskPriority").value, status: $("taskStatus").value, due: $("taskDue").value ? new Date($("taskDue").value).toISOString() : null, source: $("taskSource").value.trim() || "Manual", owner: "You" });
          S.appendActivity(draft, "task", "Task created", title);
          S.appendNotification(draft, "Task created", title, "success");
        }
      }, id ? "Task saved" : "Task added");
      closeOverlays();
    });
  }

  function openNoteDialog(id){
    const note = state.notes.find((item) => item.id === id) || { title: "", body: "", tags: [] };
    openModal(id ? "Edit note" : "Add note", `<form id="noteForm" class="form-stack">
      <label class="field"><span>Title</span><input id="noteTitle" required value="${esc(note.title)}" maxlength="100"></label>
      <label class="field"><span>Body</span><textarea id="noteBody" rows="6" required>${esc(note.body)}</textarea></label>
      <label class="field"><span>Tags</span><input id="noteTags" value="${esc((note.tags || []).join(", "))}" placeholder="release, qa"></label>
    </form>`, `<button class="button secondary" type="button" data-close="modal">Cancel</button><button class="button primary" type="submit" form="noteForm">${id ? "Save note" : "Create note"}</button>`);
    $("noteForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = $("noteTitle").value.trim();
      const body = $("noteBody").value.trim();
      if(!title || !body){ toast("Title and body are required", "warning"); return; }
      const tags = $("noteTags").value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
      await mutate((draft) => {
        if(id){
          const found = draft.notes.find((item) => item.id === id);
          Object.assign(found, { title, body, tags, updatedAt: new Date().toISOString() });
          S.appendActivity(draft, "note", "Note updated", title);
        } else {
          draft.notes.unshift({ id: D.uid("note"), title, body, tags, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          S.appendActivity(draft, "note", "Note created", title);
          S.appendNotification(draft, "Note created", title, "success");
        }
      }, id ? "Note saved" : "Note added");
      closeOverlays();
    });
  }

  function openModal(title, body, footer){
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = body;
    el.modalFooter.innerHTML = footer || `<button class="button primary" type="button" data-close="modal">Done</button>`;
    el.modalRoot.hidden = false;
    setTimeout(() => {
      const first = el.modalRoot.querySelector("input, textarea, select, button");
      if(first) first.focus();
    }, 0);
  }
  function openResetDialog(){
    openModal("Reset dashboard safely", `<div class="confirm-copy"><p>Reset restores the default v4 dashboard, tasks, notes, metrics, notifications, and settings. A restore point is saved automatically before reset.</p><p>Export a backup first if you want a separate file outside Chrome storage.</p></div>`, `<button class="button secondary" data-backup-first type="button">Export backup first</button><button class="button danger" data-reset-confirm type="button">Reset dashboard</button>`);
  }
  async function resetDashboard(){
    state = await S.resetState();
    applyTheme();
    closeOverlays();
    render();
    toast("Dashboard reset with restore point", "warning");
  }
  async function restoreBackup(){
    if(!state.lastBackup){ toast("No restore point available", "warning"); return; }
    await mutate((draft) => {
      const backup = state.lastBackup;
      Object.keys(draft).forEach((key) => delete draft[key]);
      Object.assign(draft, backup);
      draft.lastBackup = null;
      S.appendActivity(draft, "restore", "Previous dashboard restored", "Restore point applied.");
    }, "Restore point applied");
  }

  async function exportDashboard(){
    const payload = await S.exportState();
    S.downloadJson(payload, `livedash-v4-backup-${new Date().toISOString().slice(0,10)}.json`);
    await mutate((draft) => { S.appendActivity(draft, "export", "Dashboard data exported", "Versioned backup file downloaded."); S.appendNotification(draft, "Export complete", "Dashboard backup downloaded.", "success"); }, "Export complete");
  }
  async function importFromFile(){
    const file = el.importFileInput.files && el.importFileInput.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const payload = JSON.parse(text);
      state = await S.importState(payload);
      applyTheme();
      render();
      toast("Import complete", "success");
    } catch(error){
      toast(error.message || "Import failed", "warning");
    } finally {
      el.importFileInput.value = "";
    }
  }

  async function setTaskStatus(id, status){
    await mutate((draft) => {
      const task = draft.tasks.find((item) => item.id === id);
      if(task){ task.status = status; S.appendActivity(draft, "task", status === "done" ? "Task completed" : "Task reopened", task.title); }
    }, status === "done" ? "Task completed" : "Task reopened");
  }
  async function deleteTask(id){
    await mutate((draft) => {
      const task = draft.tasks.find((item) => item.id === id);
      draft.tasks = draft.tasks.filter((item) => item.id !== id);
      S.appendActivity(draft, "task", "Task deleted", task ? task.title : id);
    }, "Task deleted");
  }
  async function deleteNote(id){
    await mutate((draft) => {
      const note = draft.notes.find((item) => item.id === id);
      draft.notes = draft.notes.filter((item) => item.id !== id);
      S.appendActivity(draft, "note", "Note deleted", note ? note.title : id);
    }, "Note deleted");
  }
  async function hideModule(id){
    await mutate((draft) => {
      draft.settings.hiddenModules = Array.from(new Set([...(draft.settings.hiddenModules || []), id]));
      S.appendActivity(draft, "widget", "Widget hidden", id);
    }, "Module hidden");
  }
  async function restoreModule(id){
    await mutate((draft) => {
      draft.settings.hiddenModules = (draft.settings.hiddenModules || []).filter((item) => item !== id);
      S.appendActivity(draft, "widget", "Widget restored", id);
      S.appendNotification(draft, "Widget restored", id, "success");
    }, "Module restored");
  }
  function openModuleDetail(id){
    const mod = D.moduleCatalog.find((item) => item.id === id) || { title: id, description: "Dashboard module" };
    openModal(mod.title, `<div class="detail-stack"><p>${esc(mod.description)}</p><dl class="health-list"><div><dt>Category</dt><dd>${esc(mod.category || "system")}</dd></div><div><dt>Grid span</dt><dd>${esc(mod.span || 6)} columns</dd></div><div><dt>Freshness</dt><dd>${esc(state.updatedAt ? fmtTime(state.updatedAt) : "Ready")}</dd></div><div><dt>Storage</dt><dd>Chrome storage local</dd></div></dl></div>`, `<button class="button primary" type="button" data-close="modal">Done</button>`);
  }
  function openModuleLibrary(){
    if(!state.settings.editMode) toggleEditMode(true);
    setTimeout(() => {
      const node = document.querySelector(".module-library");
      if(node) node.scrollIntoView({ behavior: state.settings.reducedMotion ? "auto" : "smooth", block: "start" });
    }, 80);
  }
  function sortTasks(key){
    if(taskSort.key === key) taskSort.dir = taskSort.dir === "asc" ? "desc" : "asc";
    else taskSort = { key, dir: "asc" };
    renderDashboard();
  }

  async function init(){
    bindBase();
    bindEvents();
    state = await S.getState();
    applyTheme();
    render();
    updateClockSurface();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
