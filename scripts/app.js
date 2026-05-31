(function(){
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const storage = globalThis.LiveDashStorage;
  const defaults = globalThis.LiveDashDefaults;
  const allowedSpans = [3,4,6,8,12];
  let state;
  let undoStack = [];
  let redoStack = [];
  let selectedModuleId = null;
  const nav = [
    ["today","Today"], ["work","Work"], ["capture","Capture"], ["reports","Reports"], ["activity","Activity"], ["alerts","Alerts"], ["settings","Settings"]
  ];

  const h = (value) => String(value ?? "").replace(/[&<>"]/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const byOrder = (a,b) => (a.order || 0) - (b.order || 0);
  const rel = (iso) => {
    if(!iso) return "Unknown";
    const diff = Date.now() - new Date(iso).getTime();
    if(diff < 60000) return "just now";
    if(diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if(diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return `${Math.floor(diff/86400000)}d ago`;
  };
  const dateFmt = (iso, opts={month:"short",day:"numeric"}) => iso ? new Intl.DateTimeFormat(undefined, opts).format(new Date(`${iso}T12:00:00`)) : "No date";
  const timeNow = () => new Intl.DateTimeFormat(undefined, { weekday:"short", month:"short", day:"numeric" }).format(new Date());

  async function init(){
    state = await storage.getState();
    state.editMode = false;
    await storage.saveState(state);
    bindStaticEvents();
    renderAll();
  }

  function currentLayout(){ return (state.layouts[state.selectedView] || state.layouts.today || []).slice().sort(byOrder); }
  function catalog(type){ return state.moduleCatalog.find((item) => item.id === type) || state.moduleCatalog[0]; }
  function openTasks(){ return state.tasks.filter((t) => t.status !== "done"); }
  function blockedTasks(){ return state.tasks.filter((t) => t.status === "blocked"); }
  function criticalAlerts(){ return state.alerts.filter((a) => a.status === "open" && a.severity === "critical"); }
  function sourceState(id){ return state.sources.find((s) => s.id === id) || { label:id, state:"fresh", updatedAt:state.updatedAt }; }

  function renderAll(){
    document.body.classList.toggle("editing", state.editMode);
    document.body.classList.toggle("nav-open", false);
    document.documentElement.classList.toggle("light", state.settings.theme === "light");
    document.body.dataset.density = state.settings.density;
    renderNav();
    renderHeader();
    renderToday();
    renderContext();
    renderSecondary();
    renderEdit();
    renderLibrary();
    renderNotifications();
    renderSettingsValues();
  }

  function renderNav(){
    const root = $("#primaryNav");
    root.innerHTML = nav.map(([id,label]) => `<button class="rail-item" type="button" data-section="${h(id)}" aria-current="${state.selectedSection === id ? "page" : "false"}" title="${h(label)}">${h(label)}</button>`).join("");
  }

  function renderHeader(){
    $("#viewSelect").innerHTML = state.templates.map((v) => `<option value="${h(v.id)}" ${state.selectedView === v.id ? "selected" : ""}>${h(v.name)}</option>`).join("");
    $("#signalCount").textContent = state.alerts.filter((a) => a.status === "open").length + state.notifications.filter((n) => !n.read).length;
    const freshest = state.sources.filter((s) => s.state !== "fresh").length ? `${state.sources.filter((s) => s.state !== "fresh").length} source needs review` : `Local · updated ${rel(state.updatedAt)}`;
    $("#freshness").textContent = freshest;
    $("#editToggle").textContent = state.editMode ? "Exit edit" : "Customize";
    $("#editToggle").setAttribute("aria-pressed", String(state.editMode));
  }

  function renderToday(){
    $("#todayDate").textContent = timeNow();
    const dueToday = state.tasks.filter((t) => t.due === new Date().toISOString().slice(0,10) && t.status !== "done").length;
    const captures = state.captures.filter((c) => c.status === "inbox").length;
    const openAlertCount = state.alerts.filter((a) => a.status === "open").length;
    $("#todaySummary").textContent = `${openTasks().length} open tasks, ${dueToday} due today, ${openAlertCount} alerts, ${captures} captures waiting.`;
    $("#attentionStrip").innerHTML = [
      [dueToday,"Due today","Open task deadlines"],
      [blockedTasks().length,"Blocked","Needs a decision"],
      [captures,"Captures","Unprocessed notes and pages"],
      [state.reports.filter((r) => r.status === "stale").length,"Stale reports","Needs refresh"]
    ].map(([value,label,detail]) => `<button class="attention-card" type="button" data-action="details" data-kind="attention" data-id="${h(label)}"><strong>${h(value)}</strong><span>${h(label)}</span><small>${h(detail)}</small></button>`).join("");
    renderTopPriority();
    renderWorkQueue();
    renderCaptureInbox();
  }

  function renderTopPriority(){
    const task = openTasks().sort((a,b) => priorityRank(a.priority)-priorityRank(b.priority))[0];
    const root = $("#topPriority");
    if(!task){
      root.innerHTML = `<div class="panel-head"><div><h2>No urgent work</h2><p>Capture a task or process your inbox.</p></div><button data-action="add-task" type="button">Add task</button></div>`;
      return;
    }
    root.innerHTML = `<div class="panel-head"><div><h2>Next decision</h2><p>${h(task.source)} · due ${h(dateFmt(task.due))}</p></div><span class="priority ${h(task.priority)}">${h(task.priority)}</span></div><div class="work-row"><div><strong>${h(task.title)}</strong><div class="work-meta"><span>${h(task.owner)}</span><span>${h(task.status)}</span><span>${h(task.notes)}</span></div></div><div class="row-actions"><button data-action="task-detail" data-id="${h(task.id)}" type="button">Open</button><button class="primary-button" data-action="complete-task" data-id="${h(task.id)}" type="button">Complete</button></div></div>`;
  }

  function renderWorkQueue(){
    const tasks = filteredTasks().slice(0,8);
    $("#workQueue").innerHTML = `<div class="panel-head"><div><h2>Today work</h2><p>Actionable tasks, not dashboard decoration.</p></div><button data-action="add-task" type="button">Add task</button></div>${tasks.length ? tasks.map(renderTaskRow).join("") : empty("No matching work", "Add a task or clear the current filters.")}`;
  }

  function renderTaskRow(task){
    return `<div class="work-row"><div><div class="work-title"><span class="priority ${h(task.priority)}">${h(task.priority)}</span><strong>${h(task.title)}</strong></div><div class="work-meta"><span>${h(task.status)}</span><span>${h(task.source)}</span><span>${h(task.owner)}</span><span>Due ${h(dateFmt(task.due))}</span></div></div><div class="row-actions"><button data-action="task-detail" data-id="${h(task.id)}" type="button">Open</button><button data-action="complete-task" data-id="${h(task.id)}" type="button">${task.status === "done" ? "Done" : "Complete"}</button></div></div>`;
  }

  function renderCaptureInbox(){
    const captures = state.captures.filter((c) => c.status === "inbox").slice(0,5);
    $("#captureInbox").innerHTML = `<div class="panel-head"><div><h2>Capture inbox</h2><p>Notes, links, and ideas waiting for triage.</p></div><button data-action="capture-current-tab" type="button">Capture tab</button></div>${captures.length ? captures.map((c) => `<div class="capture-row"><div><strong>${h(c.title)}</strong><div class="work-meta"><span>${h(c.type)}</span><span>${h(rel(c.createdAt))}</span>${c.url ? `<a href="${h(c.url)}" target="_blank" rel="noreferrer">Open source</a>` : ""}</div><small>${h(c.note)}</small></div><div class="row-actions"><button data-action="capture-to-task" data-id="${h(c.id)}" type="button">Task</button><button data-action="archive-capture" data-id="${h(c.id)}" type="button">Archive</button></div></div>`).join("") : empty("Inbox is clear", "Capture a page from the popup, side panel, or command palette.")}`;
  }

  function renderContext(){
    renderBrowserContext();
    $("#agendaPanel").innerHTML = `<div class="panel-head"><div><h2>Next</h2><p>Schedule and focus context.</p></div></div>${state.schedule.slice(0,3).map((item) => `<div class="source-row"><strong>${h(item.time)} · ${h(item.title)}</strong><small>${h(item.prep)}</small></div>`).join("")}`;
    const alerts = state.alerts.filter((a) => a.status === "open").slice(0,3);
    $("#alertsPanel").innerHTML = `<div class="panel-head"><div><h2>Alerts</h2><p>Only items that need action.</p></div><button data-action="open-alerts" type="button">View</button></div>${alerts.length ? alerts.map(renderAlertRow).join("") : empty("No open alerts", "You are clear for now.")}`;
    $("#sourcesPanel").innerHTML = `<div class="panel-head"><div><h2>Local state</h2><p>Source-level freshness.</p></div></div>${state.sources.map((s) => `<div class="source-row"><div><strong>${h(s.label)}</strong><small>${h(s.state)} · updated ${h(rel(s.updatedAt))}</small></div></div>`).join("")}`;
  }

  async function renderBrowserContext(){
    const root = $("#browserContext");
    root.innerHTML = `<div class="panel-head"><div><h2>Browser context</h2><p>Capture the active page from popup or side panel.</p></div><button data-action="capture-current-tab" type="button">Capture</button></div><div id="tabContextBody" class="source-row"><strong>Current page actions</strong><small>Use the popup or side panel to save the active tab, selected text, or a task linked to a page.</small></div>`;
    const tab = await getActiveTab();
    if(tab && tab.url && !tab.url.startsWith("chrome://")){
      $("#tabContextBody").innerHTML = `<strong>${h(tab.title || "Current tab")}</strong><small>${h(new URL(tab.url).hostname)} · ready to capture</small>`;
    }
  }

  function renderSecondary(){
    const root = $("#secondaryContent");
    const layouts = sectionModules();
    root.innerHTML = layouts.map(renderModuleCard).join("");
  }

  function sectionModules(){
    const layout = currentLayout();
    if(state.selectedSection === "today") return layout.filter((m) => !["work-queue","context-rail","capture-inbox","agenda","alerts-list"].includes(m.type));
    if(state.selectedSection === "work") return layout.filter((m) => ["work-queue","capture-inbox","notes-log","activity"].includes(m.type));
    if(state.selectedSection === "capture") return layout.filter((m) => ["context-rail","capture-inbox","notes-log","activity"].includes(m.type));
    if(state.selectedSection === "reports") return layout.filter((m) => ["reports","metric-drilldown","activity"].includes(m.type));
    if(state.selectedSection === "activity") return layout.filter((m) => ["activity","notes-log","capture-inbox"].includes(m.type));
    if(state.selectedSection === "alerts") return layout.filter((m) => ["alerts-list","activity","metric-drilldown"].includes(m.type));
    return layout;
  }

  function renderModuleCard(module){
    const meta = catalog(module.type);
    return `<article class="module-card" data-module-id="${h(module.id)}" data-module-type="${h(module.type)}" data-span="${span(module.span)}" tabindex="0"><div class="grid-guide"></div><header class="module-head"><div><h3>${h(meta.name)}</h3><p>${h(meta.dataSource)} · ${h(meta.freshness)}</p></div><div class="module-tools"><button data-action="details" data-id="${h(module.id)}" data-type="${h(module.type)}" type="button">Details</button>${state.editMode ? `<button data-action="select-module" data-id="${h(module.id)}" type="button">Settings</button><button data-action="move-module" data-dir="up" data-id="${h(module.id)}" type="button">Up</button><button data-action="move-module" data-dir="down" data-id="${h(module.id)}" type="button">Down</button><button data-action="resize-module" data-id="${h(module.id)}" type="button">${span(module.span)}</button><button class="danger" data-action="remove-module" data-id="${h(module.id)}" type="button">Remove</button>` : ""}</div></header>${renderModuleBody(module.type)}</article>`;
  }

  function renderModuleBody(type){
    if(type === "metric-drilldown") return renderMetrics();
    if(type === "activity") return state.activity.slice(0,6).map((a) => `<div class="activity-row"><strong>${h(a.title)}</strong><small>${h(a.detail)} · ${h(rel(a.createdAt))}</small></div>`).join("") || empty("No activity", "Changes will appear here.");
    if(type === "reports") return state.reports.map((r) => `<div class="report-row"><strong>${h(r.title)}</strong><div class="work-meta"><span>${h(r.status)}</span><span>${h(r.timeRange)}</span><span>Generated ${h(rel(r.lastGenerated))}</span></div><button data-action="report-detail" data-id="${h(r.id)}" type="button">Review</button></div>`).join("");
    if(type === "notes-log") return renderNotesModule();
    if(type === "alerts-list") return state.alerts.slice(0,5).map(renderAlertRow).join("");
    if(type === "capture-inbox") return state.captures.slice(0,5).map((c) => `<div class="capture-row"><strong>${h(c.title)}</strong><small>${h(c.note)} · ${h(rel(c.createdAt))}</small></div>`).join("");
    if(type === "work-queue") return state.tasks.slice(0,5).map(renderTaskRow).join("");
    if(type === "agenda") return state.schedule.map((e) => `<div class="source-row"><strong>${h(e.time)} · ${h(e.title)}</strong><small>${h(e.prep)}</small></div>`).join("");
    return `<div class="source-row"><strong>${h(catalog(type).preview)}</strong><small>${h(catalog(type).description)}</small></div>`;
  }

  function renderMetrics(){
    const data = metricData();
    return `<div class="attention-strip metric-strip">${data.map((m) => `<button class="attention-card" type="button" data-action="metric-detail" data-id="${h(m.id)}"><strong>${h(m.value)}</strong><span>${h(m.label)}</span><small>${h(m.detail)}</small></button>`).join("")}</div><div class="chart-mini" aria-label="Work trend"><svg viewBox="0 0 460 72" width="100%" height="72"><polyline points="10,54 70,44 130,48 190,34 250,38 310,24 370,30 450,18" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"/></svg></div>`;
  }

  function metricData(){
    return [
      { id:"due", value:state.tasks.filter((t)=>t.due===new Date().toISOString().slice(0,10)&&t.status!=="done").length, label:"Due today", detail:"Tasks needing action" },
      { id:"blocked", value:blockedTasks().length, label:"Blocked", detail:"Requires decision" },
      { id:"captures", value:state.captures.filter((c)=>c.status==="inbox").length, label:"Inbox", detail:"Captures to process" },
      { id:"stale", value:state.sources.filter((s)=>s.state!=="fresh").length, label:"Stale sources", detail:"Refresh or review" }
    ];
  }

  function renderNotesModule(){
    return `<form id="quickNoteForm" class="quick-capture-form"><label class="sr-only" for="quickNoteText">Quick note</label><textarea id="quickNoteText" placeholder="Capture a decision or follow-up" rows="2"></textarea><button type="submit">Save note</button></form>${state.notes.slice(0,4).map((note) => `<div class="capture-row"><strong>${h(note.title)}</strong><small>${h(note.tags.join(", "))} · ${h(rel(note.updatedAt))}</small><p>${h(note.body)}</p></div>`).join("")}`;
  }

  function renderAlertRow(alert){
    return `<div class="alert-row"><div><span class="state-badge ${alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "info"}">${h(alert.severity)}</span><strong>${h(alert.title)}</strong><small>${h(alert.body)} · ${h(alert.source)} · ${h(rel(alert.createdAt))}</small></div><div class="row-actions"><button data-action="ack-alert" data-id="${h(alert.id)}" type="button">Acknowledge</button></div></div>`;
  }

  function renderEdit(){
    const shell = $("#editShell");
    shell.hidden = !state.editMode;
    renderInspector();
  }

  function renderInspector(){
    const root = $("#moduleInspector");
    if(!selectedModuleId){ root.innerHTML = `<div class="empty-state"><strong>No module selected</strong><p>Select a module to configure span, source, refresh, and display density.</p></div>`; return; }
    const module = currentLayout().find((m) => m.id === selectedModuleId);
    if(!module){ selectedModuleId = null; renderInspector(); return; }
    const meta = catalog(module.type);
    root.innerHTML = `<h3>${h(meta.name)}</h3><p class="meta">${h(meta.description)}</p><div class="settings-grid"><label>Span<select id="inspectorSpan">${allowedSpans.map((s)=>`<option value="${s}" ${span(module.span)===s?"selected":""}>${s} columns</option>`).join("")}</select></label><label>Density<select id="inspectorDensity"><option value="compact">Compact</option><option value="balanced">Balanced</option><option value="spacious">Spacious</option></select></label><label>Refresh<select id="inspectorRefresh"><option value="manual">Manual</option><option value="15m">15 minutes</option><option value="hourly">Hourly</option></select></label></div><div class="button-row"><button id="applyModuleSettings" class="primary-button" type="button">Apply</button><button data-action="remove-module" data-id="${h(module.id)}" class="danger" type="button">Remove</button></div><div class="source-row"><strong>Data source</strong><small>${h(meta.dataSource)} · ${h(meta.permissions)}</small></div>`;
  }

  function renderLibrary(){
    const catSelect = $("#moduleCategory");
    const categories = ["all", ...new Set(state.moduleCatalog.map((m) => m.category))];
    catSelect.innerHTML = categories.map((c) => `<option value="${h(c)}">${h(c === "all" ? "All categories" : c)}</option>`).join("");
    const query = ($("#moduleSearch")?.value || "").toLowerCase();
    const cat = catSelect.value || "all";
    const modules = state.moduleCatalog.filter((m) => (cat === "all" || m.category === cat) && [m.name,m.description,m.category].join(" ").toLowerCase().includes(query));
    $("#moduleLibrary").innerHTML = modules.map((m) => `<article class="library-card"><div><h3>${h(m.name)}</h3><p>${h(m.description)}</p></div><div class="library-meta"><span>Category: ${h(m.category)}</span><span>Recommended: ${h(m.span)} columns</span><span>Source: ${h(m.dataSource)}</span><span>Freshness: ${h(m.freshness)}</span><span>Permissions: ${h(m.permissions)}</span></div><button class="primary-button" data-action="add-module" data-type="${h(m.id)}" type="button">Add module</button></article>`).join("") || empty("No modules found", "Try another category or search term.");
  }

  function renderNotifications(){
    $("#notificationList").innerHTML = state.notifications.length ? state.notifications.map((n) => `<div class="alert-row"><div><span class="state-badge ${n.severity === "warning" ? "warning" : n.severity === "success" ? "success" : "info"}">${h(n.severity)}</span><strong>${h(n.title)}</strong><small>${h(n.body)} · ${h(rel(n.createdAt))}</small></div><div class="row-actions"><button data-action="read-notice" data-id="${h(n.id)}" type="button">Mark read</button></div></div>`).join("") : empty("No notifications", "Completed actions and warnings will appear here.");
  }

  function renderSettingsValues(){
    const views = state.templates.map((v) => `<option value="${h(v.id)}" ${state.settings.defaultView === v.id ? "selected" : ""}>${h(v.name)}</option>`).join("");
    $("#defaultViewSetting").innerHTML = views;
    $("#themeSetting").value = state.settings.theme;
    $("#densitySetting").value = state.settings.density;
    $("#timeFormatSetting").value = state.settings.timeFormat;
    $("#nameSetting").value = state.settings.displayName;
    $("#defaultSpanSetting").value = String(state.settings.defaultModuleSpan || 6);
  }

  function bindStaticEvents(){
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKeydown);
    $("#viewSelect").addEventListener("change", async (e) => { await update((draft) => { draft.selectedView = e.target.value; draft.selectedSection = "today"; activity(draft,"view","View changed", templatesName(e.target.value)); }); });
    $("#moduleSearch").addEventListener("input", renderLibrary);
    $("#moduleCategory").addEventListener("change", renderLibrary);
    ["themeSetting","densitySetting","timeFormatSetting","defaultViewSetting","nameSetting","defaultSpanSetting"].forEach((id) => $("#"+id).addEventListener("change", saveSettings));
    $("#importFile").addEventListener("change", importFile);
    $("#commandInput").addEventListener("input", renderCommands);
  }

  async function onClick(event){
    const close = event.target.closest("[data-close]");
    if(close){ closeOverlays(); return; }
    const actionEl = event.target.closest("[data-action], #commandOpen, #editToggle, #settingsOpen, #notificationOpen, #openModuleLibrary, #closeModuleLibrary, #closeSettings, #closeNotifications, #closeDetails, #mobileNavToggle, #openSidePanel, #undoLayout, #redoLayout, #restoreModules, #saveEdit, #cancelEdit, #exportBackup, #importBackup, #restoreBackup, #resetDashboard, #applyModuleSettings");
    if(!actionEl) return;
    const id = actionEl.id;
    const action = actionEl.dataset.action;
    if(id === "commandOpen" || action === "open-command") return openPalette();
    if(id === "editToggle") return toggleEdit();
    if(id === "settingsOpen" || action === "open-settings") return openDrawer("settingsDrawer");
    if(id === "notificationOpen" || action === "open-alerts") return openDrawer("notificationDrawer");
    if(id === "openModuleLibrary" || action === "open-library") return openDrawer("moduleLibraryDrawer");
    if(id === "closeModuleLibrary" || id === "closeSettings" || id === "closeNotifications" || id === "closeDetails") return closeOverlays();
    if(id === "mobileNavToggle") return document.body.classList.toggle("nav-open");
    if(id === "openSidePanel") return openSidePanel();
    if(id === "undoLayout") return undoLayout();
    if(id === "redoLayout") return redoLayout();
    if(id === "restoreModules") return applyTemplate(state.selectedView);
    if(id === "saveEdit") return saveEdit();
    if(id === "cancelEdit") return cancelEdit();
    if(id === "exportBackup") return exportBackup();
    if(id === "importBackup") return $("#importFile").click();
    if(id === "restoreBackup") return restoreBackup();
    if(id === "resetDashboard") return resetDashboard();
    if(id === "applyModuleSettings") return applyModuleSettings();
    if(actionEl.dataset.section) return setSection(actionEl.dataset.section);
    if(action === "complete-task") return completeTask(actionEl.dataset.id);
    if(action === "task-detail") return taskDetail(actionEl.dataset.id);
    if(action === "add-task") return quickAddTask();
    if(action === "capture-current-tab") return captureCurrentTab();
    if(action === "capture-to-task") return captureToTask(actionEl.dataset.id);
    if(action === "archive-capture") return archiveCapture(actionEl.dataset.id);
    if(action === "ack-alert") return acknowledgeAlert(actionEl.dataset.id);
    if(action === "read-notice") return markNotice(actionEl.dataset.id);
    if(action === "metric-detail") return metricDetail(actionEl.dataset.id);
    if(action === "report-detail") return reportDetail(actionEl.dataset.id);
    if(action === "details") return moduleDetail(actionEl.dataset.type || actionEl.dataset.id);
    if(action === "add-module") return addModule(actionEl.dataset.type);
    if(action === "remove-module") return removeModule(actionEl.dataset.id);
    if(action === "resize-module") return resizeModule(actionEl.dataset.id);
    if(action === "move-module") return moveModule(actionEl.dataset.id, actionEl.dataset.dir);
    if(action === "select-module") { selectedModuleId = actionEl.dataset.id; return renderInspector(); }
    if(action === "run-command") return runCommand(actionEl.dataset.command);
  }

  async function onSubmit(event){
    if(event.target.id === "quickNoteForm"){
      event.preventDefault();
      const input = $("#quickNoteText");
      if(!input.value.trim()) return;
      await update((draft) => { draft.notes.unshift({ id:defaults.uid("note"), title:"Quick note", body:input.value.trim(), tags:["capture"], sourceUrl:"", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }); activity(draft,"note","Note created", input.value.trim().slice(0,80)); notice(draft,"Note saved","Decision log updated.","success"); });
    }
  }

  function onKeydown(event){
    const k = event.key.toLowerCase();
    if((event.metaKey || event.ctrlKey) && k === "k"){ event.preventDefault(); openPalette(); }
    if(k === "escape") closeOverlays();
    if(k === "," && !event.metaKey && !event.ctrlKey && !isTyping(event)){ event.preventDefault(); openDrawer("settingsDrawer"); }
    if(k === "c" && !isTyping(event)){ event.preventDefault(); openPalette("capture"); }
  }

  function isTyping(event){ return ["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName); }
  function openDrawer(id){ $("#"+id).hidden = false; }
  function closeOverlays(){ $$(".drawer,.command-palette").forEach((el) => el.hidden = true); }
  function openPalette(seed=""){ $("#commandPalette").hidden = false; $("#commandInput").value = seed; renderCommands(); setTimeout(() => $("#commandInput").focus(), 0); }

  function renderCommands(){
    const q = ($("#commandInput").value || "").toLowerCase();
    const commands = commandList().filter((c) => `${c.label} ${c.detail}`.toLowerCase().includes(q));
    $("#commandHints").innerHTML = ["capture", "task", "report", "view", "settings"].map((s) => `<span class="source-badge">${h(s)}</span>`).join("");
    $("#commandList").innerHTML = commands.map((c) => `<button class="command-item" type="button" data-action="run-command" data-command="${h(c.id)}"><span><strong>${h(c.label)}</strong><span>${h(c.detail)}</span></span><kbd>${h(c.key || "Enter")}</kbd></button>`).join("") || empty("No command found", "Try add, capture, reports, or settings.");
  }

  function commandList(){
    return [
      { id:"capture-tab", label:"Capture current tab", detail:"Save the active page to the capture inbox", key:"C" },
      { id:"add-task", label:"Add task", detail:"Create a task in today work" },
      { id:"add-note", label:"Add note", detail:"Save a note to the decision log" },
      { id:"open-alerts", label:"Open alerts", detail:"Review actionable notifications" },
      { id:"open-reports", label:"Open reports", detail:"Switch to report review" },
      { id:"open-library", label:"Open module library", detail:"Add a module in edit mode" },
      { id:"toggle-edit", label:"Customize layout", detail:"Enter or exit edit mode" },
      { id:"export", label:"Export backup", detail:"Download a local LiveDash backup" },
      { id:"settings", label:"Open settings", detail:"Storage, shortcuts, templates, and reset" },
      ...state.templates.map((v) => ({ id:`view:${v.id}`, label:`Switch to ${v.name}`, detail:v.description }))
    ];
  }

  async function runCommand(id){
    closeOverlays();
    if(id === "capture-tab") return captureCurrentTab();
    if(id === "add-task") return quickAddTask();
    if(id === "add-note") return quickNote();
    if(id === "open-alerts") return openDrawer("notificationDrawer");
    if(id === "open-reports") return setSection("reports");
    if(id === "open-library") { if(!state.editMode) await toggleEdit(); return openDrawer("moduleLibraryDrawer"); }
    if(id === "toggle-edit") return toggleEdit();
    if(id === "export") return exportBackup();
    if(id === "settings") return openDrawer("settingsDrawer");
    if(id.startsWith("view:")) return switchView(id.split(":")[1]);
  }

  async function update(mutator){
    state = await storage.updateState((draft) => { mutator(draft); return draft; });
    renderAll();
  }
  function snapshot(){ undoStack.push(defaults.clone(state.layouts)); redoStack = []; }
  function activity(draft,type,title,detail){ storage.appendActivity(draft,type,title,detail); }
  function notice(draft,title,body,severity="info"){ storage.appendNotification(draft,title,body,severity); }
  function span(value){ const n = Number(value); return allowedSpans.includes(n) ? n : 6; }
  function priorityRank(p){ return { critical:0, high:1, medium:2, low:3 }[p] ?? 4; }
  function filteredTasks(){ return state.tasks.slice().sort((a,b) => priorityRank(a.priority)-priorityRank(b.priority) || String(a.due).localeCompare(String(b.due))); }
  function empty(title, body){ return `<div class="empty-state"><strong>${h(title)}</strong><p>${h(body)}</p></div>`; }
  function templatesName(id){ return (state.templates.find((t) => t.id === id) || {}).name || id; }

  async function setSection(section){
    if(section === "settings") return openDrawer("settingsDrawer");
    await update((draft) => { draft.selectedSection = section; activity(draft,"navigation","Section opened", section); });
  }
  async function switchView(id){ await update((draft) => { draft.selectedView = id; draft.selectedSection = "today"; activity(draft,"view","View changed", templatesName(id)); }); }
  async function toggleEdit(){
    await update((draft) => { draft.editMode = !state.editMode; draft.dirty = draft.editMode; activity(draft,"edit", draft.editMode ? "Edit mode opened" : "Edit mode closed", draft.editMode ? "Layout controls are visible." : "Daily work mode restored."); });
  }
  async function saveEdit(){ await update((draft) => { draft.editMode = false; draft.dirty = false; activity(draft,"layout","Layout saved", templatesName(draft.selectedView)); notice(draft,"Layout saved","Your module layout was saved locally.","success"); }); }
  async function cancelEdit(){ await update((draft) => { draft.editMode = false; draft.dirty = false; }); }
  async function undoLayout(){ if(!undoStack.length) return toast("Nothing to undo"); const previous = undoStack.pop(); redoStack.push(defaults.clone(state.layouts)); await update((draft) => { draft.layouts = previous; activity(draft,"layout","Layout undo", "Previous layout restored."); }); }
  async function redoLayout(){ if(!redoStack.length) return toast("Nothing to redo"); const next = redoStack.pop(); undoStack.push(defaults.clone(state.layouts)); await update((draft) => { draft.layouts = next; activity(draft,"layout","Layout redo", "Layout change reapplied."); }); }
  async function applyTemplate(id){ snapshot(); await update((draft) => { draft.layouts[id] = defaults.layoutFromTemplate(id); draft.editMode = true; draft.dirty = true; activity(draft,"template","Template applied", templatesName(id)); }); }
  async function addModule(type){ snapshot(); await update((draft) => { const layout = draft.layouts[draft.selectedView]; const meta = draft.moduleCatalog.find((m) => m.id === type); layout.push({ id:defaults.uid("module"), type, span:meta?.span || draft.settings.defaultModuleSpan || 6, order:layout.length, settings:{ density:draft.settings.density, refresh:"manual" } }); draft.editMode = true; draft.dirty = true; activity(draft,"module","Module added", meta?.name || type); notice(draft,"Module added", "Use undo if this was accidental.", "success"); }); closeOverlays(); }
  async function removeModule(id){ snapshot(); await update((draft) => { const layout = draft.layouts[draft.selectedView]; const item = layout.find((m) => m.id === id); draft.layouts[draft.selectedView] = layout.filter((m) => m.id !== id).map((m,i)=>({ ...m, order:i })); draft.dirty = true; activity(draft,"module","Module removed", catalog(item?.type).name); notice(draft,"Module removed","Undo is available until reload.","warning"); }); }
  async function resizeModule(id){ snapshot(); await update((draft) => { const m = draft.layouts[draft.selectedView].find((x) => x.id === id); if(m){ const i = allowedSpans.indexOf(span(m.span)); m.span = allowedSpans[(i+1)%allowedSpans.length]; draft.dirty = true; activity(draft,"module","Module resized", `${catalog(m.type).name}: ${m.span} columns`); } }); }
  async function moveModule(id, dir){ snapshot(); await update((draft) => { const layout = draft.layouts[draft.selectedView].sort(byOrder); const i = layout.findIndex((m) => m.id === id); const j = dir === "up" ? i-1 : i+1; if(i >= 0 && j >= 0 && j < layout.length){ [layout[i], layout[j]] = [layout[j], layout[i]]; layout.forEach((m, index) => m.order = index); draft.layouts[draft.selectedView] = layout; draft.dirty = true; activity(draft,"module","Module reordered", catalog(layout[j].type).name); } }); }
  async function applyModuleSettings(){ const m = currentLayout().find((x) => x.id === selectedModuleId); if(!m) return; const newSpan = Number($("#inspectorSpan").value); await update((draft) => { const target = draft.layouts[draft.selectedView].find((x) => x.id === selectedModuleId); target.span = newSpan; target.settings = { ...target.settings, density:$("#inspectorDensity").value, refresh:$("#inspectorRefresh").value }; draft.dirty = true; activity(draft,"module","Module settings changed", catalog(target.type).name); }); }

  async function completeTask(id){ await update((draft) => { const task = draft.tasks.find((t) => t.id === id); if(task){ task.status = "done"; task.completedAt = new Date().toISOString(); activity(draft,"task","Task completed", task.title); notice(draft,"Task completed", task.title, "success"); } }); }
  async function quickAddTask(){ const title = prompt("Task title"); if(!title) return; await update((draft) => { draft.tasks.unshift({ id:defaults.uid("task"), title:title.trim(), priority:"medium", status:"open", due:new Date().toISOString().slice(0,10), source:"Quick capture", owner:"You", notes:"Created from command palette.", createdAt:new Date().toISOString() }); activity(draft,"task","Task added", title.trim()); }); }
  async function quickNote(){ const body = prompt("Note"); if(!body) return; await update((draft) => { draft.notes.unshift({ id:defaults.uid("note"), title:"Quick note", body:body.trim(), tags:["quick"], sourceUrl:"", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }); activity(draft,"note","Note created", body.trim().slice(0,80)); }); }
  async function captureToTask(id){ const capture = state.captures.find((c) => c.id === id); if(!capture) return; await update((draft) => { draft.tasks.unshift({ id:defaults.uid("task"), title:capture.title, priority:"medium", status:"open", due:new Date().toISOString().slice(0,10), source:"Capture inbox", owner:"You", notes:capture.note, linkedUrl:capture.url, createdAt:new Date().toISOString() }); const c = draft.captures.find((x)=>x.id===id); c.status = "converted"; activity(draft,"task","Task created from capture", capture.title); }); }
  async function archiveCapture(id){ await update((draft) => { const c = draft.captures.find((x)=>x.id===id); if(c){ c.status = "archived"; activity(draft,"capture","Capture archived", c.title); } }); }
  async function acknowledgeAlert(id){ await update((draft) => { const a = draft.alerts.find((x)=>x.id===id); if(a){ a.status = "acknowledged"; activity(draft,"alert","Alert acknowledged", a.title); } }); }
  async function markNotice(id){ await update((draft) => { const n = draft.notifications.find((x)=>x.id===id); if(n){ n.read = true; activity(draft,"notification","Notification read", n.title); } }); }

  async function captureCurrentTab(){
    const tab = await getActiveTab();
    if(!tab || !tab.url || tab.url.startsWith("chrome://")){ toast("Open a regular page, then capture from the popup or side panel."); return; }
    await update((draft) => { draft.captures.unshift({ id:defaults.uid("capture"), type:"page", title:tab.title || tab.url, url:tab.url, note:"Captured from active browser tab.", status:"inbox", createdAt:new Date().toISOString() }); activity(draft,"capture","Current tab captured", tab.title || tab.url); notice(draft,"Page captured", "Saved to capture inbox.", "success"); });
  }

  function getActiveTab(){
    return new Promise((resolve) => {
      if(typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query){ resolve(null); return; }
      chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => resolve(tabs && tabs[0] ? tabs[0] : null));
    });
  }
  function openSidePanel(){
    if(typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open){ chrome.windows.getCurrent((win) => chrome.sidePanel.open({ windowId:win.id })); }
    else toast("Side panel is available after loading the extension in Chrome.");
  }

  function taskDetail(id){ const task = state.tasks.find((t) => t.id === id); if(!task) return; detail("Task", task.title, `<div class="source-row"><strong>Status</strong><small>${h(task.status)} · ${h(task.priority)} · due ${h(dateFmt(task.due))}</small></div><div class="source-row"><strong>Source</strong><small>${h(task.source)} · ${h(task.owner)}</small></div><p>${h(task.notes)}</p>${task.linkedUrl ? `<p><a href="${h(task.linkedUrl)}" target="_blank" rel="noreferrer">Open source page</a></p>` : ""}`); }
  function metricDetail(id){ const metric = metricData().find((m)=>m.id===id); detail("Metric", metric?.label || "Metric", `<div class="source-row"><strong>${h(metric?.value ?? "")}</strong><small>${h(metric?.detail ?? "Derived from local state")}</small></div><p>Definition, source, and consequence are shown here so the number is inspectable instead of decorative.</p>`); }
  function reportDetail(id){ const r = state.reports.find((x)=>x.id===id); detail("Report", r?.title || "Report", `<div class="source-row"><strong>${h(r?.status)}</strong><small>${h(r?.timeRange)} · generated ${h(rel(r?.lastGenerated))}</small></div><button data-action="run-command" data-command="export" type="button">Export backup</button>`); }
  function moduleDetail(type){ const meta = catalog(type); detail("Module", meta.name, `<p>${h(meta.description)}</p><div class="source-row"><strong>Source</strong><small>${h(meta.dataSource)}</small></div><div class="source-row"><strong>States</strong><small>${h(meta.states)}</small></div><div class="source-row"><strong>Permissions</strong><small>${h(meta.permissions)}</small></div>`); }
  function detail(kind,title,body){ $("#detailsTitle").textContent = `${kind}: ${title}`; $("#detailsSubtitle").textContent = "Source, state, and next action."; $("#detailsBody").innerHTML = body; openDrawer("detailsDrawer"); }

  async function saveSettings(){ await update((draft) => { draft.settings.theme = $("#themeSetting").value; draft.settings.density = $("#densitySetting").value; draft.settings.timeFormat = $("#timeFormatSetting").value; draft.settings.defaultView = $("#defaultViewSetting").value; draft.settings.displayName = $("#nameSetting").value.trim() || "Alex"; draft.settings.defaultModuleSpan = Number($("#defaultSpanSetting").value); activity(draft,"settings","Settings changed","Appearance or defaults updated."); }); }
  async function exportBackup(){ const data = await storage.exportState(); storage.downloadJson(data, `livedash-v10-backup-${new Date().toISOString().slice(0,10)}.json`); state = await storage.getState(); renderAll(); toast("Backup exported"); }
  async function importFile(event){ const file = event.target.files[0]; if(!file) return; try{ const text = await file.text(); state = await storage.importState(JSON.parse(text)); renderAll(); closeOverlays(); toast("Backup imported"); } catch(error){ toast(error.message || "Import failed"); } finally{ event.target.value = ""; } }
  async function restoreBackup(){ try{ state = await storage.restoreBackup(); renderAll(); toast("Restore point loaded"); } catch(error){ toast(error.message || "No restore point"); } }
  async function resetDashboard(){ if(!confirm("Reset LiveDash to the default v10 dashboard? A restore point will be kept.")) return; state = await storage.resetState(); renderAll(); toast("Dashboard reset"); }

  function toast(message){ const el = document.createElement("div"); el.className = "toast"; el.textContent = message; $("#toastRegion").append(el); setTimeout(() => el.remove(), 2600); }

  init().catch((error) => { document.body.innerHTML = `<main class="options-shell"><section class="settings-panel"><h1>LiveDash could not start</h1><p>${h(error.message || error)}</p></section></main>`; });
})();
