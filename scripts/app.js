(function(){
  const defaults = window.LiveDashDefaults;
  const store = window.LiveDashStorage;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let state;
  let timer;
  let selectedCommandIndex = 0;

  function h(value){ return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]); }
  function currentView(){ return defaults.savedViews.find((view) => view.id === state.selectedView) || defaults.savedViews[0]; }
  function currentLayout(){ return state.views[state.selectedView]?.layout || []; }
  function catalog(type){ return defaults.moduleCatalog.find((item) => item.type === type) || defaults.moduleCatalog[0]; }
  function allowedSpan(span){ return defaults.spans.includes(Number(span)) ? Number(span) : 4; }
  function fmtDate(value, options){ return new Intl.DateTimeFormat(undefined, options || { month: "short", day: "numeric" }).format(new Date(value)); }
  function fmtTime(value, timeZone){ return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone, hour12: state.settings.timeFormat === "12h" ? true : state.settings.timeFormat === "24h" ? false : undefined }).format(value instanceof Date ? value : new Date(value)); }
  function rel(value){
    const delta = Math.round((Date.now() - new Date(value).getTime()) / 60000);
    if(delta < 1) return "just now";
    if(delta < 60) return `${delta}m ago`;
    const hours = Math.round(delta / 60);
    if(hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }
  function isUrl(input){ return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input); }
  function url(input){ return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) ? input : `https://${input}`; }
  function initials(text){ return String(text || "LD").split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase(); }
  function priorityRank(value){ return { critical: 0, high: 1, medium: 2, low: 3 }[value] ?? 4; }
  function filteredTasks(){
    const q = state.filters.query.toLowerCase();
    return state.tasks.filter((task) => {
      if(state.filters.priority !== "all" && task.priority !== state.filters.priority) return false;
      if(state.filters.status !== "all" && task.status !== state.filters.status) return false;
      if(q && !`${task.title} ${task.source} ${task.owner} ${task.tags?.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a,b) => priorityRank(a.priority) - priorityRank(b.priority) || new Date(a.due) - new Date(b.due));
  }
  function filteredNotes(){
    const q = state.filters.query.toLowerCase();
    return state.notes.filter((note) => !q || `${note.title} ${note.body} ${note.tags?.join(" ")}`.toLowerCase().includes(q));
  }
  function filteredAlerts(){
    const q = state.filters.query.toLowerCase();
    return state.alerts.filter((alert) => {
      if(state.filters.status !== "all" && alert.status !== state.filters.status) return false;
      if(state.filters.source !== "all" && alert.source !== state.filters.source) return false;
      if(q && !`${alert.title} ${alert.source} ${alert.detail}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function toast(message, action){
    const region = $("#toastRegion");
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<strong>${h(message)}</strong>${action ? `<button class="row-action" data-action="${h(action)}" type="button">Undo</button>` : ""}`;
    region.append(node);
    setTimeout(() => node.remove(), 3600);
  }
  function setHidden(selector, hidden){ const node = $(selector); if(node) node.hidden = hidden; }

  function applyTheme(){
    const selected = state.settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : state.settings.theme;
    const wallpaper = defaults.wallpapers.find((item) => item.id === state.settings.wallpaper) || defaults.wallpapers[0];
    document.body.dataset.theme = selected === "light" || wallpaper.mode === "light" ? "light" : "dark";
    document.body.dataset.density = state.settings.density || "balanced";
    document.body.dataset.edit = String(Boolean(state.editMode));
    document.body.dataset.reducedMotion = String(Boolean(state.settings.reducedMotion));
    document.body.style.setProperty("--wp-a", wallpaper.a);
    document.body.style.setProperty("--wp-b", wallpaper.b);
    document.body.style.setProperty("--wp-c", wallpaper.c);
    document.body.style.setProperty("--accent", wallpaper.accent || state.settings.accent || "#7dd3fc");
  }

  function renderNav(){
    $("#primaryNav").innerHTML = defaults.navItems.map((item) => `<button class="nav-item" type="button" data-action="nav" data-id="${item.id}" aria-current="${state.selectedNav === item.id ? "page" : "false"}"><span class="nav-icon">${h(item.icon)}</span><span>${h(item.label)}</span></button>`).join("");
  }

  function renderControls(){
    const open = state.tasks.filter((task) => task.status !== "done").length;
    const critical = state.alerts.filter((item) => item.status === "open" && item.severity === "critical").length;
    $("#viewSelect").innerHTML = defaults.savedViews.map((view) => `<option value="${view.id}">${h(view.name)}</option>`).join("");
    $("#viewSelect").value = state.selectedView;
    $("#timeRange").value = state.timeRange;
    $("#priorityFilter").value = state.filters.priority;
    $("#statusFilter").value = state.filters.status;
    $("#sourceFilter").value = state.filters.source;
    $("#globalFilter").value = state.filters.query;
    $("#editToggle").textContent = state.editMode ? "Editing" : "View";
    $("#editToggle").setAttribute("aria-pressed", String(Boolean(state.editMode)));
    $("#editPanel").hidden = !state.editMode;
    const unread = state.notifications.filter((item) => !item.read).length + critical;
    $("#signalCount").textContent = String(unread);
    $("#freshness").textContent = `Local · updated ${rel(state.updatedAt)}`;
    $("#inspectorView").textContent = String(open);
    $("#inspectorMode").textContent = String(critical);
    $("#inspectorModules").textContent = String(currentLayout().length);
    $("#inspectorFreshness").textContent = store.hasChromeStorage() ? "Stored locally" : "Local fallback";
    $("#heroTitle").textContent = currentView().name;
    $("#heroCopy").textContent = operationalBrief();
  }

  function operationalBrief(){
    const open = state.tasks.filter((task) => task.status !== "done").length;
    const overdue = state.tasks.filter((task) => task.status !== "done" && new Date(task.due) < new Date()).length;
    const critical = state.alerts.filter((item) => item.status === "open" && item.severity === "critical").length;
    const last = rel(state.updatedAt);
    return `${open} open items · ${overdue} overdue · ${critical} critical signals · stored locally, updated ${last}.`;
  }

  function sectionMeta(){
    const map = {
      today: ["What changed", "Actionable work, urgent signals, and recent local activity."],
      work: ["Work queue", "Prioritized tasks, commitments, notes, and blocked follow-ups."],
      reports: ["Reports", "Metrics, saved briefs, records, and exportable snapshots."],
      activity: ["Activity", "Local history for dashboard changes, imports, exports, tasks, notes, and settings."],
      alerts: ["Alerts", "Severity-ranked signals with acknowledgement and stale-data handling."],
      settings: ["Settings", "Storage, templates, module defaults, import/export, reset, and extension status."]
    };
    return map[state.selectedNav] || map.today;
  }

  function surfaceLayout(){
    if(state.selectedNav === "today") return currentLayout();
    const fixed = {
      work: [
        { id: "surface-work-summary", type: "command-summary", span: 6 },
        { id: "surface-work-tasks", type: "priority-table", span: 8 },
        { id: "surface-work-schedule", type: "schedule-commitments", span: 4 },
        { id: "surface-work-alerts", type: "alerts-queue", span: 6 },
        { id: "surface-work-notes", type: "notes-followups", span: 6 }
      ],
      reports: [
        { id: "surface-reports", type: "reports-surface", span: 6 },
        { id: "surface-trend", type: "revenue-trend", span: 6 },
        { id: "surface-kpis", type: "kpi-strip", span: 12 },
        { id: "surface-records", type: "metrics-records", span: 12 }
      ],
      activity: [
        { id: "surface-activity-main", type: "activity-feed", span: 8 },
        { id: "surface-health-main", type: "module-health", span: 4 },
        { id: "surface-alerts-history", type: "alerts-queue", span: 12 }
      ],
      alerts: [
        { id: "surface-alerts-only", type: "alerts-queue", span: 8 },
        { id: "surface-health", type: "module-health", span: 4 },
        { id: "surface-activity", type: "activity-feed", span: 12 }
      ],
      settings: [
        { id: "surface-health-settings", type: "module-health", span: 4 },
        { id: "surface-reports-settings", type: "reports-surface", span: 4 },
        { id: "surface-activity-settings", type: "activity-feed", span: 4 }
      ]
    };
    return fixed[state.selectedNav] || currentLayout();
  }

  function renderDashboard(){
    const [title, copy] = sectionMeta();
    $("#sectionHead").innerHTML = `<div><span class="eyebrow">${h(currentView().name)}</span><h2>${h(title)}</h2><p>${h(copy)}</p></div><div class="button-row"><button type="button" data-action="open-module-library">Module library</button><button type="button" data-action="apply-template">Templates</button></div>`;
    const layout = surfaceLayout();
    $("#dashboardGrid").innerHTML = layout.map((module, index) => renderModule(module, index, state.selectedNav === "today")).join("");
  }

  function renderModule(module, index, editable){
    const meta = catalog(module.type);
    const status = module.type === "weather-readiness" ? "stale" : "fresh";
    const editControls = editable ? `<button type="button" data-action="move-module" data-dir="up" data-id="${h(module.id)}" aria-label="Move ${h(meta.name)} earlier">Move up</button><button type="button" data-action="move-module" data-dir="down" data-id="${h(module.id)}" aria-label="Move ${h(meta.name)} later">Move down</button><button type="button" data-action="resize-module" data-id="${h(module.id)}" aria-label="Resize ${h(meta.name)}">${allowedSpan(module.span)} cols</button><button type="button" data-action="configure-module" data-id="${h(module.id)}" data-type="${h(module.type)}" aria-label="Configure ${h(meta.name)}">Settings</button><button type="button" class="danger-text" data-action="remove-module" data-id="${h(module.id)}" aria-label="Remove ${h(meta.name)}">Remove</button>` : "";
    return `<article class="module-card" data-module-id="${h(module.id)}" data-module-type="${h(module.type)}" data-span="${allowedSpan(module.span)}" data-state="${status}" tabindex="0">
      <header class="module-head">
        <div class="module-title"><h3>${h(meta.name)}</h3><p>${h(meta.category)} · ${h(meta.dataSource)}</p></div>
        <div class="module-actions" aria-label="Module actions"><button type="button" data-action="details" data-id="${h(module.id)}" data-type="${h(module.type)}" aria-label="Open ${h(meta.name)} details">Details</button>${editControls}</div>
      </header>
      <div class="badge-row"><span class="badge ${status === "stale" ? "warning" : "success"}">${status === "stale" ? "Fallback" : "Fresh"}</span><span class="badge">${h(meta.freshness)}</span><span class="badge">${h(meta.roles.join(" / "))}</span></div>
      ${renderModuleBody(module.type)}
    </article>`;
  }

  function renderModuleBody(type){
    const map = {
      "command-summary": renderCommandSummary,
      "priority-table": renderPriorityTable,
      "kpi-strip": renderKpiStrip,
      "revenue-trend": renderTrendChart,
      "status-distribution": renderStatusDistribution,
      "schedule-commitments": renderSchedule,
      "alerts-queue": renderAlerts,
      "notes-followups": renderNotes,
      "activity-feed": renderActivity,
      "reports-surface": renderReports,
      "module-health": renderHealth,
      "quick-links": renderLinks,
      "focus-session": renderFocus,
      "world-clock": renderWorldClock,
      "weather-readiness": renderWeather,
      "metrics-records": renderMetricRecords
    };
    return (map[type] || renderCommandSummary)();
  }

  function renderCommandSummary(){
    const open = state.tasks.filter((task) => task.status !== "done").length;
    const critical = state.alerts.filter((alert) => alert.status === "open" && alert.severity === "critical").length;
    const done = state.tasks.filter((task) => task.status === "done").length;
    const focus = state.focus.active ? "Active focus session" : `${state.focus.completedSessions} sessions logged`;
    return `<div class="metric-grid">
      <div class="metric-card"><div class="metric-label">Open work</div><div class="metric-value">${open}</div><div class="metric-meta"><span>Tasks</span><span class="delta ${open < 4 ? "up" : "down"}">${open < 4 ? "Healthy" : "Review"}</span></div></div>
      <div class="metric-card"><div class="metric-label">Critical signals</div><div class="metric-value">${critical}</div><div class="metric-meta"><span>Alerts</span><span class="delta ${critical ? "down" : "up"}">${critical ? "Action" : "Clear"}</span></div></div>
      <div class="metric-card"><div class="metric-label">Completed</div><div class="metric-value">${done}</div><div class="metric-meta"><span>${state.timeRange}</span><span class="delta up">Flow</span></div></div>
      <div class="metric-card"><div class="metric-label">Focus</div><div class="metric-value">${state.focus.completedSessions}</div><div class="metric-meta"><span>${h(focus)}</span><span class="delta up">Local</span></div></div>
    </div>`;
  }

  function spark(values, color){
    const w = 180, hgt = 38, pad = 3;
    const min = Math.min(...values), max = Math.max(...values);
    const points = values.map((value, index) => {
      const x = pad + index * ((w - pad * 2) / Math.max(1, values.length - 1));
      const y = hgt - pad - ((value - min) / Math.max(1, max - min)) * (hgt - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="sparkline" viewBox="0 0 ${w} ${hgt}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color || "var(--chart-1)"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points} ${w-pad},${hgt-pad} ${pad},${hgt-pad}" fill="${color || "var(--chart-1)"}" opacity=".08"/></svg>`;
  }

  function renderKpiStrip(){
    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
    return `<div class="metric-grid">${state.metrics.map((metric, index) => `<button class="metric-card" type="button" data-action="metric-detail" data-id="${h(metric.id)}"><div class="metric-label">${h(metric.label)}</div><div class="metric-value">${h(metric.value)}${h(metric.unit)}</div><div class="metric-meta"><span>${h(metric.period)}</span><span class="delta ${metric.delta >= 0 ? "up" : "down"}">${metric.delta >= 0 ? "+" : ""}${h(metric.delta)} vs target ${h(metric.target)}${h(metric.unit)}</span></div>${spark(metric.trend, colors[index % colors.length])}<div class="metric-meta"><span>${h(metric.source)}</span><span>${h(rel(metric.freshness))}</span></div></button>`).join("")}</div>`;
  }

  function renderTrendChart(){
    const all = state.metrics[0]?.trend || [12, 18, 19, 24, 27, 31, 35];
    const w = 720, hgt = 250, pad = 28;
    const min = Math.min(...all), max = Math.max(...all);
    const points = all.map((value, index) => {
      const x = pad + index * ((w - pad * 2) / Math.max(1, all.length - 1));
      const y = hgt - pad - ((value - min) / Math.max(1, max - min)) * (hgt - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<div class="chart-frame"><svg class="chart-svg" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="Execution trend chart"><line x1="${pad}" y1="${hgt-pad}" x2="${w-pad}" y2="${hgt-pad}" stroke="rgba(148,163,184,.25)"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${hgt-pad}" stroke="rgba(148,163,184,.25)"/><polyline points="${points}" fill="none" stroke="var(--chart-1)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points} ${w-pad},${hgt-pad} ${pad},${hgt-pad}" fill="var(--chart-1)" opacity=".09"/>${all.map((v,i)=>`<circle cx="${pad + i * ((w - pad * 2) / Math.max(1, all.length - 1))}" cy="${hgt - pad - ((v - min) / Math.max(1, max - min)) * (hgt - pad * 2)}" r="4" fill="var(--chart-1)"/>`).join("")}</svg></div><div class="metric-meta"><span>Source: ${h(state.metrics[0]?.source || "Local score")}</span><span>Updated ${rel(state.updatedAt)}</span></div>`;
  }

  function renderStatusDistribution(){
    const open = state.tasks.filter((task) => task.status === "open").length;
    const blocked = state.tasks.filter((task) => task.status === "blocked").length;
    const done = state.tasks.filter((task) => task.status === "done").length;
    const alerts = state.alerts.filter((alert) => alert.status === "open").length;
    const rows = [{label:"Open", value:open, color:"var(--info)"},{label:"Blocked", value:blocked, color:"var(--warning)"},{label:"Done", value:done, color:"var(--success)"},{label:"Alerts", value:alerts, color:"var(--danger)"}];
    const max = Math.max(1, ...rows.map((row) => row.value));
    return `<div class="distribution">${rows.map((row) => `<div class="distribution-row"><strong>${h(row.label)}</strong><span class="bar-track"><span class="bar-fill" style="width:${Math.max(5, row.value / max * 100)}%;background:${row.color}"></span></span><span>${row.value}</span></div>`).join("")}</div>`;
  }

  function renderPriorityTable(){
    const tasks = filteredTasks();
    return `<div class="table-tools"><form id="quickTaskForm" class="quick-add"><input id="quickTaskTitle" type="text" placeholder="Add priority task"><select id="quickTaskPriority"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><input id="quickTaskDue" type="date"><button type="submit">Add</button></form></div>${tasks.length ? `<div class="table-wrap"><table><thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Due</th><th>Source</th><th>Action</th></tr></thead><tbody>${tasks.map((task) => `<tr><td><strong>${h(task.title)}</strong><small>${h(task.owner || "You")}</small></td><td><span class="priority ${h(task.priority)}">${h(task.priority)}</span></td><td>${h(task.status)}</td><td>${h(fmtDate(task.due, { month:"short", day:"numeric" }))}</td><td>${h(task.source)}</td><td><button class="row-action" type="button" data-action="complete-task" data-id="${h(task.id)}">${task.status === "done" ? "Done" : "Complete"}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><div><strong>No tasks match the current filters.</strong><p>Add a task or clear filters.</p></div></div>`}`;
  }

  function renderSchedule(){
    return `<div class="list-stack">${state.schedule.map((item) => `<div class="list-item"><span class="status-dot ${item.status === "confirmed" ? "success" : "warning"}"></span><div><strong>${h(item.title)}</strong><small>${h(item.type)} · ${h(item.status)}</small></div><span>${h(item.time)}</span></div>`).join("")}</div>`;
  }

  function renderAlerts(){
    const alerts = filteredAlerts();
    return alerts.length ? `<div class="list-stack">${alerts.map((alert) => `<div class="list-item"><span class="status-dot ${alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "success"}"></span><div><strong>${h(alert.title)}</strong><small>${h(alert.source)} · ${h(rel(alert.createdAt))} · ${h(alert.status)}</small></div><button class="row-action" type="button" data-action="ack-alert" data-id="${h(alert.id)}">${alert.status === "acknowledged" ? "Acked" : "Ack"}</button></div>`).join("")}</div>` : `<div class="empty-state"><div><strong>No active alerts.</strong><p>Completed signals and stale data warnings will appear here.</p></div></div>`;
  }

  function renderNotes(){
    const notes = filteredNotes();
    return `<form id="quickNoteForm" class="quick-note"><input id="quickNoteTitle" type="text" placeholder="Note title"><input id="quickNoteBody" type="text" placeholder="Capture a follow-up"><input id="quickNoteTags" type="text" placeholder="tags"><button type="submit">Save</button></form>${notes.length ? `<div class="notes-grid">${notes.slice(0,6).map((note) => `<article class="note-card"><h3>${h(note.title)}</h3><p>${h(note.body)}</p><div class="tag-row">${(note.tags || []).map((tag) => `<span class="tag">${h(tag)}</span>`).join("")}<span class="tag">${h(rel(note.updatedAt))}</span></div><div class="button-row"><button class="row-action" type="button" data-action="edit-note" data-id="${h(note.id)}">Edit</button><button class="row-action" type="button" data-action="delete-note" data-id="${h(note.id)}">Delete</button></div></article>`).join("")}</div>` : `<div class="empty-state"><div><strong>No notes yet.</strong><p>Capture follow-ups, tags, decisions, and reminders.</p></div></div>`}`;
  }

  function renderActivity(){
    return `<div class="list-stack">${state.activity.slice(0,12).map((item) => `<div class="list-item"><span class="status-dot ${item.type === "reset" ? "warning" : item.type === "export" || item.type === "import" ? "success" : ""}"></span><div><strong>${h(item.title)}</strong><small>${h(item.detail)} · ${h(rel(item.createdAt))}</small></div><span>${h(item.type)}</span></div>`).join("")}</div>`;
  }

  function renderReports(){
    return `<div class="list-stack">${state.reports.map((report) => `<div class="list-item"><span class="status-dot ${report.status === "Ready" ? "success" : "warning"}"></span><div><strong>${h(report.title)}</strong><small>${h(report.range)} · ${h(report.status)} · ${h(rel(report.lastGenerated))}</small></div><button class="row-action" type="button" data-action="export-report" data-id="${h(report.id)}">Export</button></div>`).join("")}</div>`;
  }

  function renderHealth(){
    const layout = currentLayout();
    return `<div class="list-stack">
      <div class="list-item"><span class="status-dot success"></span><div><strong>Manifest V3 extension</strong><small>New tab, popup, options, and service worker are local.</small></div><span>OK</span></div>
      <div class="list-item"><span class="status-dot success"></span><div><strong>Storage</strong><small>${store.hasChromeStorage() ? "Secure local storage" : "Development fallback"}</small></div><span>v${state.schemaVersion}</span></div>
      <div class="list-item"><span class="status-dot warning"></span><div><strong>Modules</strong><small>${layout.length} modules in ${h(currentView().name)}</small></div><span>${state.editMode ? "Edit" : "View"}</span></div>
      <div class="list-item"><span class="status-dot success"></span><div><strong>Region</strong><small>English-first, US/EU friendly defaults, no Persian runtime text.</small></div><span>Global</span></div>
    </div>`;
  }

  function renderLinks(){
    return `<div class="link-grid">${state.links.slice(0,9).map((link) => `<a class="link-tile" href="${h(url(link.url))}" target="_blank" rel="noopener noreferrer"><span class="link-icon" style="--tile-color:${h(link.color || "var(--accent)")}">${h(initials(link.title))}</span><span>${h(link.title)}</span><div class="link-actions"><button type="button" data-action="edit-link" data-id="${h(link.id)}">Edit</button><button type="button" data-action="delete-link" data-id="${h(link.id)}">Del</button></div></a>`).join("")}</div><div class="button-row" style="margin-top:10px"><button type="button" data-action="add-link">Add link</button><button type="button" data-action="sync-bookmarks">Sync Chrome bookmarks</button></div>`;
  }

  function remainingSeconds(){
    if(!state.focus.active || !state.focus.endsAt) return state.focus.durationMin * 60;
    return Math.max(0, Math.round((new Date(state.focus.endsAt).getTime() - Date.now()) / 1000));
  }
  function duration(seconds){ return `${Math.floor(seconds / 60).toString().padStart(2,"0")}:${Math.floor(seconds % 60).toString().padStart(2,"0")}`; }
  function renderFocus(){
    return `<div class="time-big">${duration(remainingSeconds())}</div><p style="margin-top:10px">${state.focus.active ? "Focus session running. Local timer persists across reload." : `${state.focus.durationMin} minute focus block ready.`}</p><div class="button-row" style="margin-top:14px"><button type="button" data-action="start-focus" class="primary-button">Start</button><button type="button" data-action="stop-focus">Stop</button></div>`;
  }

  function renderWorldClock(){
    const now = new Date();
    return `<div class="list-stack">${state.worldClocks.map((clock) => `<div class="list-item"><span class="status-dot success"></span><div><strong>${h(clock.label)}</strong><small>${h(clock.timeZone)}</small></div><span>${h(fmtTime(now, clock.timeZone))}</span></div>`).join("")}</div>`;
  }

  function renderWeather(){
    return `<div class="weather-block"><div class="time-big">${h(state.weather.temperature)}°</div><p style="margin-top:10px">${h(state.weather.location)} · ${h(state.weather.condition)}</p><div class="badge-row" style="margin-top:14px"><span class="badge warning">Offline-safe fallback</span><span class="badge">${h(state.weather.source)}</span><span class="badge">${h(rel(state.weather.updatedAt))}</span></div><button type="button" data-action="refresh-weather" class="secondary-button">Refresh fallback</button></div>`;
  }

  function renderMetricRecords(){
    return `<div class="table-wrap"><table><thead><tr><th>Metric</th><th>Owner</th><th>Value</th><th>Target</th><th>Status</th><th>Source</th><th>Updated</th></tr></thead><tbody>${state.metricRecords.map((record) => `<tr><td><strong>${h(record.metric)}</strong></td><td>${h(record.owner)}</td><td>${h(record.value)}</td><td>${h(record.target)}</td><td>${h(record.status)}</td><td>${h(record.source)}</td><td>${h(rel(record.updatedAt))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderDock(){
    const dock = $("#quickDock");
    dock.hidden = !state.settings.showQuickDock;
    dock.innerHTML = [["today", "Today"], ["work", "Work"], ["reports", "Reports"], ["alerts", "Alerts"], ["activity", "Activity"]].map(([id,label]) => `<button type="button" data-action="nav" data-id="${id}" aria-current="${state.selectedNav === id ? "page" : "false"}">${label}</button>`).join("") + `<button type="button" data-action="open-command">Command</button>`;
  }

  function renderSettingsForm(){
    $("#wallpaperSetting").innerHTML = defaults.wallpapers.map((item) => `<option value="${item.id}">${h(item.name)}</option>`).join("");
    $("#defaultViewSetting").innerHTML = defaults.savedViews.map((item) => `<option value="${item.id}">${h(item.name)}</option>`).join("");
    $("#themeSetting").value = state.settings.theme;
    $("#wallpaperSetting").value = state.settings.wallpaper;
    $("#densitySetting").value = state.settings.density;
    $("#defaultViewSetting").value = state.settings.defaultView;
    $("#nameSetting").value = state.settings.greetingName || "";
    $("#weatherSetting").value = state.settings.weatherLocation || "";
    $("#timeFormatSetting").value = state.settings.timeFormat;
    $("#refreshIntervalSetting").value = state.settings.refreshInterval || "manual";
    $("#defaultSpanSetting").value = String(state.settings.defaultModuleSpan || 4);
    $("#libraryOnEditSetting").value = String(Boolean(state.settings.openModuleLibraryOnEdit));
    $("#quickDockSetting").value = String(Boolean(state.settings.showQuickDock));
    $("#motionSetting").value = String(Boolean(state.settings.reducedMotion));
  }

  function renderNotifications(){
    const list = $("#notificationList");
    const notices = state.notifications.slice(0, 30);
    list.innerHTML = notices.length ? notices.map((notice) => `<div class="list-item"><span class="status-dot ${notice.severity === "success" ? "success" : notice.severity === "warning" ? "warning" : notice.severity === "danger" ? "danger" : ""}"></span><div><strong>${h(notice.title)}</strong><small>${h(notice.body)} · ${h(rel(notice.createdAt))}</small></div><span>${notice.read ? "Read" : "New"}</span></div>`).join("") : `<div class="empty-state"><div><strong>No notifications.</strong><p>System notices, reminders, and completed actions appear here.</p></div></div>`;
  }

  function renderModuleLibrary(){
    const categories = ["all"].concat([...new Set(defaults.moduleCatalog.map((item) => item.category))]);
    $("#moduleCategory").innerHTML = categories.map((cat) => `<option value="${h(cat)}">${cat === "all" ? "All categories" : h(cat)}</option>`).join("");
    const query = $("#moduleSearch").value?.toLowerCase() || "";
    const selected = $("#moduleCategory").value || "all";
    const modules = defaults.moduleCatalog.filter((item) => {
      if(selected !== "all" && item.category !== selected) return false;
      if(query && !`${item.name} ${item.description} ${item.category} ${item.roles.join(" ")}`.toLowerCase().includes(query)) return false;
      return true;
    });
    $("#moduleLibrary").innerHTML = modules.map((item) => `<article class="library-card"><div><span class="eyebrow">${h(item.category)}</span><h3>${h(item.name)}</h3><p>${h(item.description)}</p></div><div class="library-preview">${h(item.preview)}</div><div class="library-meta"><span>Size: ${h(item.recommendedSpan)} cols</span><span>Options: ${h(item.sizes.join(" / "))}</span><span>Source: ${h(item.dataSource)}</span><span>Freshness: ${h(item.freshness)}</span><span>Roles: ${h(item.roles.join(", "))}</span><span>Permission: ${h(item.permission)}</span></div><p>${h(item.behavior)}</p><div class="button-row"><select data-size-for="${h(item.type)}">${item.sizes.map((size) => `<option value="${size}" ${size === item.recommendedSpan ? "selected" : ""}>${size} columns</option>`).join("")}</select><button class="primary-button" type="button" data-action="add-module" data-type="${h(item.type)}">Add module</button></div></article>`).join("");
  }

  function render(){
    applyTheme();
    renderNav();
    renderControls();
    renderDashboard();
    renderDock();
    renderSettingsForm();
    renderNotifications();
  }

  async function save(mutator, silent){
    state = await store.updateState((draft) => { mutator(draft); return draft; });
    render();
    if(!silent) toast("Saved");
  }

  function pushUndo(draft){
    const snapshot = defaults.clone(draft.views[draft.selectedView].layout);
    draft.undoStack.unshift({ view: draft.selectedView, layout: snapshot, createdAt: new Date().toISOString() });
    draft.undoStack = draft.undoStack.slice(0, 25);
    draft.redoStack = [];
  }

  async function switchView(id){
    const view = defaults.savedViews.find((item) => item.id === id);
    if(!view) return;
    await save((draft) => {
      draft.selectedView = id;
      draft.selectedNav = view.nav;
      store.appendActivity(draft, "view", "Saved view changed", view.name);
    }, true);
  }

  async function setNav(id){
    if(!defaults.navItems.some((item) => item.id === id)) return;
    await save((draft) => { draft.selectedNav = id; store.appendActivity(draft, "navigation", "Navigation changed", id); }, true);
    document.body.dataset.navOpen = "false";
  }

  async function toggleEdit(){
    await save((draft) => {
      draft.editMode = !draft.editMode;
      store.appendActivity(draft, "edit", draft.editMode ? "Edit mode enabled" : "View mode enabled", currentView().name);
    }, true);
    if(state.editMode && state.settings.openModuleLibraryOnEdit) openDrawer("moduleLibrary");
  }

  async function addModule(type, span){
    const item = catalog(type);
    await save((draft) => {
      pushUndo(draft);
      draft.views[draft.selectedView].layout.push({ id: defaults.uid("module"), type, span: allowedSpan(span || item.recommendedSpan) });
      store.appendActivity(draft, "module", "Module added", item.name);
      store.appendNotification(draft, "Module added", `${item.name} was added to ${defaults.savedViews.find((view) => view.id === draft.selectedView).name}.`, "success");
    }, true);
    closeAll();
    toast(`${item.name} added`, "undo-layout");
  }

  async function removeModule(id){
    await save((draft) => {
      pushUndo(draft);
      const layout = draft.views[draft.selectedView].layout;
      const removed = layout.find((item) => item.id === id);
      draft.views[draft.selectedView].layout = layout.filter((item) => item.id !== id);
      store.appendActivity(draft, "module", "Module removed", removed ? catalog(removed.type).name : id);
    }, true);
    toast("Module removed", "undo-layout");
  }

  async function moveModule(id, dir){
    await save((draft) => {
      pushUndo(draft);
      const layout = draft.views[draft.selectedView].layout;
      const index = layout.findIndex((item) => item.id === id);
      if(index < 0) return;
      const target = dir === "up" ? Math.max(0, index - 1) : Math.min(layout.length - 1, index + 1);
      const [item] = layout.splice(index, 1);
      layout.splice(target, 0, item);
      store.appendActivity(draft, "module", "Module reordered", catalog(item.type).name);
    }, true);
  }

  async function resizeModule(id){
    await save((draft) => {
      pushUndo(draft);
      const item = draft.views[draft.selectedView].layout.find((module) => module.id === id);
      if(!item) return;
      const meta = catalog(item.type);
      const sizes = meta.sizes || defaults.spans;
      const index = sizes.indexOf(Number(item.span));
      item.span = sizes[(index + 1) % sizes.length];
      store.appendActivity(draft, "module", "Module resized", `${meta.name} set to ${item.span} columns.`);
    }, true);
  }

  async function undoLayout(){
    await save((draft) => {
      const entry = draft.undoStack.shift();
      if(!entry) return;
      const current = defaults.clone(draft.views[draft.selectedView].layout);
      draft.redoStack.unshift({ view: draft.selectedView, layout: current, createdAt: new Date().toISOString() });
      draft.views[entry.view || draft.selectedView].layout = entry.layout;
      store.appendActivity(draft, "layout", "Layout undo", "Previous module layout restored.");
    }, true);
  }

  async function redoLayout(){
    await save((draft) => {
      const entry = draft.redoStack.shift();
      if(!entry) return;
      const current = defaults.clone(draft.views[draft.selectedView].layout);
      draft.undoStack.unshift({ view: draft.selectedView, layout: current, createdAt: new Date().toISOString() });
      draft.views[entry.view || draft.selectedView].layout = entry.layout;
      store.appendActivity(draft, "layout", "Layout redo", "Module layout reapplied.");
    }, true);
  }

  async function applyTemplate(){
    const options = defaults.templates.map((template) => `<option value="${template.id}">${h(template.name)}</option>`).join("");
    openModal("Apply dashboard template", `<p>Templates replace the current view layout and keep a restore point. Select a role-based default.</p><label>Template<select id="templatePicker">${options}</select></label>`, `<button type="button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="confirm-template">Apply template</button>`);
  }

  async function confirmTemplate(){
    const id = $("#templatePicker")?.value || "today";
    const template = defaults.templates.find((item) => item.id === id) || defaults.templates[0];
    await save((draft) => {
      pushUndo(draft);
      draft.views[draft.selectedView].layout = defaults.clone(template.modules);
      draft.settings.density = template.density;
      draft.selectedNav = template.nav;
      store.appendActivity(draft, "template", "Dashboard template applied", template.name);
    }, true);
    closeAll();
    toast(`${template.name} template applied`, "undo-layout");
  }

  async function quickAddTask(event){
    event.preventDefault();
    const title = $("#quickTaskTitle")?.value.trim();
    if(!title) return;
    const dueValue = $("#quickTaskDue")?.value;
    await save((draft) => {
      draft.tasks.unshift({ id: defaults.uid("task"), title, priority: $("#quickTaskPriority").value, status: "open", due: dueValue ? new Date(`${dueValue}T18:00:00`).toISOString() : new Date(Date.now() + 86400000).toISOString(), owner: "You", source: "Tasks", tags: [] });
      store.appendActivity(draft, "task", "Task added", title);
    }, true);
  }

  async function quickAddNote(event){
    event.preventDefault();
    const title = $("#quickNoteTitle")?.value.trim() || "Quick note";
    const body = $("#quickNoteBody")?.value.trim();
    if(!body) return;
    const tags = ($("#quickNoteTags")?.value || "follow-up").split(",").map((tag) => tag.trim()).filter(Boolean);
    await save((draft) => {
      const now = new Date().toISOString();
      draft.notes.unshift({ id: defaults.uid("note"), title, body, tags, createdAt: now, updatedAt: now });
      store.appendActivity(draft, "note", "Note created", title);
    }, true);
  }

  async function completeTask(id){
    await save((draft) => {
      const task = draft.tasks.find((item) => item.id === id);
      if(!task) return;
      task.status = task.status === "done" ? "open" : "done";
      store.appendActivity(draft, "task", task.status === "done" ? "Task completed" : "Task reopened", task.title);
    }, true);
  }

  async function acknowledgeAlert(id){
    await save((draft) => {
      const alert = draft.alerts.find((item) => item.id === id);
      if(!alert) return;
      alert.status = "acknowledged";
      store.appendActivity(draft, "alert", "Alert acknowledged", alert.title);
    }, true);
  }

  async function startFocus(){
    await save((draft) => {
      const now = Date.now();
      draft.focus.active = true;
      draft.focus.startedAt = new Date(now).toISOString();
      draft.focus.endsAt = new Date(now + draft.focus.durationMin * 60000).toISOString();
      store.appendActivity(draft, "focus", "Focus session started", `${draft.focus.durationMin} minutes`);
    }, true);
  }

  async function stopFocus(){
    await save((draft) => {
      if(draft.focus.active) draft.focus.completedSessions += 1;
      draft.focus.active = false;
      draft.focus.startedAt = null;
      draft.focus.endsAt = null;
      store.appendActivity(draft, "focus", "Focus session stopped", "Timer cleared.");
    }, true);
  }

  function editNote(id){
    const note = state.notes.find((item) => item.id === id);
    if(!note) return;
    openModal("Edit note", `<label>Title<input id="modalNoteTitle" value="${h(note.title)}"></label><label>Body<textarea id="modalNoteBody">${h(note.body)}</textarea></label><label>Tags<input id="modalNoteTags" value="${h((note.tags || []).join(", "))}"></label>`, `<button type="button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="save-note" data-id="${h(id)}">Save note</button>`);
  }

  async function saveNote(id){
    await save((draft) => {
      const note = draft.notes.find((item) => item.id === id);
      if(!note) return;
      note.title = $("#modalNoteTitle").value.trim() || "Untitled note";
      note.body = $("#modalNoteBody").value.trim();
      note.tags = $("#modalNoteTags").value.split(",").map((tag) => tag.trim()).filter(Boolean);
      note.updatedAt = new Date().toISOString();
      store.appendActivity(draft, "note", "Note updated", note.title);
    }, true);
    closeAll();
  }

  async function deleteNote(id){
    await save((draft) => {
      const note = draft.notes.find((item) => item.id === id);
      draft.notes = draft.notes.filter((item) => item.id !== id);
      store.appendActivity(draft, "note", "Note deleted", note?.title || id);
    }, true);
  }

  function openAddLinkModal(id){
    const link = state.links.find((item) => item.id === id) || { title: "", url: "", group: "Work", color: "#7dd3fc" };
    openModal(id ? "Edit quick link" : "Add quick link", `<label>Name<input id="modalLinkTitle" value="${h(link.title)}"></label><label>URL<input id="modalLinkUrl" value="${h(link.url)}" placeholder="https://example.com"></label><label>Group<input id="modalLinkGroup" value="${h(link.group)}"></label><label>Color<input id="modalLinkColor" type="color" value="${h(link.color || "#7dd3fc")}"></label>`, `<button type="button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="save-link" data-id="${h(id || "")}">Save link</button>`);
  }

  async function saveLink(id){
    const title = $("#modalLinkTitle").value.trim();
    const linkUrl = $("#modalLinkUrl").value.trim();
    if(!title || !linkUrl) return;
    await save((draft) => {
      const existing = draft.links.find((item) => item.id === id);
      const payload = { title, url: linkUrl, group: $("#modalLinkGroup").value.trim() || "Work", color: $("#modalLinkColor").value || "#7dd3fc" };
      if(existing) Object.assign(existing, payload);
      else draft.links.unshift(Object.assign({ id: defaults.uid("link") }, payload));
      store.appendActivity(draft, "link", existing ? "Quick link updated" : "Quick link added", title);
    }, true);
    closeAll();
  }

  async function deleteLink(id){
    await save((draft) => {
      const link = draft.links.find((item) => item.id === id);
      draft.links = draft.links.filter((item) => item.id !== id);
      store.appendActivity(draft, "link", "Quick link removed", link?.title || id);
    }, true);
  }

  async function syncBookmarks(){
    if(typeof chrome === "undefined" || !chrome.bookmarks){ toast("Bookmarks permission is unavailable in this context"); return; }
    chrome.bookmarks.getTree(async (tree) => {
      const flat = [];
      function walk(nodes){
        nodes.forEach((node) => { if(node.url) flat.push(node); if(node.children) walk(node.children); });
      }
      walk(tree);
      await save((draft) => {
        const imported = flat.slice(0, 12).map((item) => ({ id: defaults.uid("link"), title: item.title || item.url, url: item.url, group: "Chrome", color: "#93c5fd" }));
        draft.links = imported.concat(draft.links.filter((item) => item.group !== "Chrome")).slice(0, 28);
        store.appendActivity(draft, "bookmarks", "Chrome bookmarks synced", `${imported.length} bookmarks imported into quick links.`);
      }, true);
      toast("Bookmarks synced");
    });
  }

  async function refreshWeather(){
    await save((draft) => {
      draft.weather.updatedAt = new Date().toISOString();
      draft.weather.condition = "Ready";
      draft.weather.temperature = Math.round(58 + Math.random() * 18);
      store.appendActivity(draft, "weather", "Weather fallback refreshed", draft.weather.location);
    }, true);
  }

  function openDetails(type, id){
    const meta = catalog(type);
    $("#detailTitle").textContent = meta.name;
    $("#detailBody").innerHTML = `<div class="settings-panel"><h3>Module definition</h3><p>${h(meta.description)}</p><div class="library-meta" style="margin-top:12px"><span>Category: ${h(meta.category)}</span><span>Size: ${h(meta.recommendedSpan)}</span><span>Source: ${h(meta.dataSource)}</span><span>Freshness: ${h(meta.freshness)}</span><span>Roles: ${h(meta.roles.join(", "))}</span><span>Permission: ${h(meta.permission)}</span></div></div><div class="settings-panel"><h3>Behavior</h3><p>${h(meta.behavior)}</p></div>`;
    openDrawer("detail");
  }

  function configureModule(type, id){
    const meta = catalog(type);
    const module = currentLayout().find((item) => item.id === id);
    const sizeOptions = meta.sizes.map((size) => `<option value="${size}" ${module && Number(module.span) === size ? "selected" : ""}>${size} columns</option>`).join("");
    openModal(`Configure ${meta.name}`, `<label>Card size<select id="modalModuleSpan">${sizeOptions}</select></label><label>Data source<input value="${h(meta.dataSource)}" disabled></label><label>Refresh behavior<select id="modalModuleRefresh"><option>${h(meta.freshness)}</option><option>Manual</option><option>Every dashboard refresh</option></select></label><label>Threshold / target<input id="modalModuleThreshold" placeholder="Target or warning threshold"></label><label>Visibility by role<select id="modalModuleRole"><option>All roles</option>${meta.roles.map((role)=>`<option>${h(role)}</option>`).join("")}</select></label>`, `<button type="button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="save-module-config" data-id="${h(id)}">Save configuration</button>`);
  }

  async function saveModuleConfig(id){
    await save((draft) => {
      const module = draft.views[draft.selectedView].layout.find((item) => item.id === id);
      if(!module) return;
      pushUndo(draft);
      module.span = allowedSpan($("#modalModuleSpan").value);
      module.settings = { refresh: $("#modalModuleRefresh").value, threshold: $("#modalModuleThreshold").value, role: $("#modalModuleRole").value };
      store.appendActivity(draft, "module", "Module settings changed", catalog(module.type).name);
    }, true);
    closeAll();
  }

  function metricDetail(id){
    const metric = state.metrics.find((item) => item.id === id);
    if(!metric) return;
    $("#detailTitle").textContent = metric.label;
    $("#detailBody").innerHTML = `<div class="metric-card"><div class="metric-label">Current value</div><div class="metric-value">${h(metric.value)}${h(metric.unit)}</div><div class="metric-meta"><span>Target ${h(metric.target)}${h(metric.unit)}</span><span class="delta ${metric.delta >= 0 ? "up" : "down"}">${metric.delta >= 0 ? "+" : ""}${h(metric.delta)}</span></div>${spark(metric.trend)}</div><div class="settings-panel"><h3>Source and freshness</h3><p>${h(metric.source)} · ${h(metric.period)} · updated ${h(rel(metric.freshness))}</p></div>`;
    openDrawer("detail");
  }

  function openModal(title, body, footer){
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $("#modalFooter").innerHTML = footer;
    setHidden("#modalRoot", false);
    $("#modalRoot input, #modalRoot select, #modalRoot textarea, #modalRoot button")?.focus();
  }

  function openDrawer(name){
    const map = { settings: "#settingsDrawer", notifications: "#notificationDrawer", moduleLibrary: "#moduleLibraryDrawer", detail: "#detailDrawer" };
    if(name === "moduleLibrary") renderModuleLibrary();
    if(name === "settings") renderSettingsForm();
    if(name === "notifications") renderNotifications();
    setHidden(map[name], false);
    $(map[name] + " button, " + map[name] + " input, " + map[name] + " select")?.focus();
  }
  function closeAll(){
    ["#commandPalette", "#settingsDrawer", "#notificationDrawer", "#moduleLibraryDrawer", "#detailDrawer", "#modalRoot"].forEach((selector) => setHidden(selector, true));
  }

  function openPalette(){
    renderCommands();
    setHidden("#commandPalette", false);
    $("#commandInput").value = "";
    $("#commandInput").focus();
  }

  function commandSet(){
    const moduleCommands = defaults.moduleCatalog.map((item) => ({ label: `Add ${item.name}`, detail: `${item.category} · ${item.description}`, action: () => addModule(item.type, item.recommendedSpan) }));
    return [
      { label: "Open module library", detail: "Browse modules grouped by business job", action: () => openDrawer("moduleLibrary") },
      { label: state.editMode ? "Exit edit mode" : "Enter edit mode", detail: "Toggle view/edit mode separation", action: toggleEdit },
      { label: "Open settings", detail: "Theme, data, modules, and shortcuts", action: () => openDrawer("settings") },
      { label: "Open alerts", detail: "Review notification center", action: () => setNav("alerts") },
      { label: "Open reports", detail: "Saved report cards and export actions", action: () => setNav("reports") },
      { label: "Open activity", detail: "Local audit trail", action: () => setNav("activity") },
      { label: "Add task", detail: "Create a high-priority task", action: () => quickCommandTask() },
      { label: "Add note", detail: "Capture a tagged follow-up", action: () => quickCommandNote() },
      { label: "Capture link", detail: "Save a URL into quick links", action: () => openAddLinkModal() },
      { label: "Start focus session", detail: "Begin a local 25 minute timer", action: startFocus },
      { label: "Change theme", detail: "Toggle dark and light UI", action: toggleTheme },
      { label: "Export data", detail: "Download a versioned backup", action: exportBackup },
      { label: "Import data", detail: "Validate and import a backup", action: () => $("#importFile").click() },
      { label: "Reset dashboard", detail: "Restore defaults with backup", action: confirmReset }
    ].concat(defaults.savedViews.map((view) => ({ label: `Switch to ${view.name}`, detail: view.description, action: () => switchView(view.id) })), moduleCommands);
  }

  function renderCommands(){
    const q = $("#commandInput")?.value.toLowerCase() || "";
    const commands = commandSet().filter((item) => !q || `${item.label} ${item.detail}`.toLowerCase().includes(q));
    selectedCommandIndex = Math.min(selectedCommandIndex, Math.max(0, commands.length - 1));
    $("#commandList").innerHTML = commands.map((item, index) => `<button class="command-item" type="button" role="option" data-action="run-command" data-index="${index}" aria-selected="${index === selectedCommandIndex}"><span><strong>${h(item.label)}</strong><small>${h(item.detail)}</small></span><kbd>Enter</kbd></button>`).join("") || `<div class="empty-state"><div><strong>No commands found.</strong><p>Try adding a module, switching view, or opening reports.</p></div></div>`;
    $("#commandList")._commands = commands;
  }

  function runCommand(index){
    const commands = $("#commandList")._commands || [];
    const command = commands[index ?? selectedCommandIndex];
    if(!command) return;
    closeAll();
    command.action();
  }

  function quickCommandTask(){
    openModal("Add task", `<label>Task title<input id="modalTaskTitle" placeholder="Describe the task"></label><label>Priority<select id="modalTaskPriority"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>`, `<button type="button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="save-command-task">Save task</button>`);
  }
  async function saveCommandTask(){
    const title = $("#modalTaskTitle").value.trim();
    if(!title) return;
    await save((draft) => {
      draft.tasks.unshift({ id: defaults.uid("task"), title, priority: $("#modalTaskPriority").value, status: "open", due: new Date(Date.now() + 86400000).toISOString(), owner: "You", source: "Command", tags: [] });
      store.appendActivity(draft, "task", "Task added from command palette", title);
    }, true);
    closeAll();
  }
  function quickCommandNote(){
    openModal("Add note", `<label>Title<input id="modalNewNoteTitle" placeholder="Note title"></label><label>Body<textarea id="modalNewNoteBody" placeholder="Capture details"></textarea></label><label>Tags<input id="modalNewNoteTags" placeholder="ops, follow-up"></label>`, `<button type="button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="save-command-note">Save note</button>`);
  }
  async function saveCommandNote(){
    const body = $("#modalNewNoteBody").value.trim();
    if(!body) return;
    await save((draft) => {
      const now = new Date().toISOString();
      const title = $("#modalNewNoteTitle").value.trim() || body.slice(0, 48);
      draft.notes.unshift({ id: defaults.uid("note"), title, body, tags: $("#modalNewNoteTags").value.split(",").map((tag)=>tag.trim()).filter(Boolean), createdAt: now, updatedAt: now });
      store.appendActivity(draft, "note", "Note added from command palette", title);
    }, true);
    closeAll();
  }

  async function toggleTheme(){
    await save((draft) => { draft.settings.theme = draft.settings.theme === "light" ? "dark" : "light"; store.appendActivity(draft, "settings", "Theme changed", draft.settings.theme); }, true);
  }

  async function exportBackup(){
    const payload = await store.exportState();
    store.downloadJson(payload, `livedash-v9-backup-${new Date().toISOString().slice(0,10)}.json`);
    state = await store.getState();
    render();
    toast("Backup exported");
  }

  async function exportReport(id){
    const report = state.reports.find((item) => item.id === id);
    const payload = { product: "LiveDash", type: "report", schemaVersion: defaults.VERSION, report, metrics: state.metrics, tasks: filteredTasks(), alerts: filteredAlerts(), exportedAt: new Date().toISOString() };
    store.downloadJson(payload, `livedash-report-${(report?.title || "report").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.json`);
    await save((draft) => { store.appendActivity(draft, "report", "Report exported", report?.title || id); }, true);
  }

  async function importFile(file){
    try {
      const payload = JSON.parse(await file.text());
      state = await store.importState(payload);
      render();
      toast("Backup imported");
    } catch(error){ toast(error.message || "Import failed"); }
  }

  function confirmReset(){
    openModal("Reset dashboard", `<p>Reset restores the default LiveDash v9 dashboard, templates, modules, tasks, notes, alerts, and reports. A restore point is saved before reset.</p><p>Export a backup first if this state must be kept outside Chrome storage.</p>`, `<button type="button" data-action="export-data">Export backup</button><button type="button" data-action="close-modal">Cancel</button><button type="button" class="danger" data-action="confirm-reset">Reset dashboard</button>`);
  }

  async function resetDashboard(){
    state = await store.resetState();
    closeAll();
    render();
    toast("Dashboard reset");
  }

  async function restoreBackup(){
    try { state = await store.restoreBackup(); render(); toast("Restore complete"); } catch(error){ toast(error.message); }
  }

  async function saveSettings(){
    await save((draft) => {
      draft.settings.theme = $("#themeSetting").value;
      draft.settings.wallpaper = $("#wallpaperSetting").value;
      draft.settings.density = $("#densitySetting").value;
      draft.settings.defaultView = $("#defaultViewSetting").value;
      draft.settings.greetingName = $("#nameSetting").value || "Operator";
      draft.settings.weatherLocation = $("#weatherSetting").value || "New York";
      draft.weather.location = draft.settings.weatherLocation;
      draft.settings.timeFormat = $("#timeFormatSetting").value;
      draft.settings.refreshInterval = $("#refreshIntervalSetting").value;
      draft.settings.defaultModuleSpan = Number($("#defaultSpanSetting").value);
      draft.settings.openModuleLibraryOnEdit = $("#libraryOnEditSetting").value === "true";
      draft.settings.showQuickDock = $("#quickDockSetting").value === "true";
      draft.settings.reducedMotion = $("#motionSetting").value === "true";
      store.appendActivity(draft, "settings", "Settings changed", "Structured settings updated.");
    }, true);
  }

  function bind(){
    document.addEventListener("click", async (event) => {
      const target = event.target.closest("button, a");
      if(!target) return;
      const action = target.dataset.action;
      if(target.closest(".link-tile") && target.tagName === "BUTTON") event.preventDefault();
      if(!action) return;
      if(action === "nav") setNav(target.dataset.id);
      if(action === "open-command") openPalette();
      if(action === "open-module-library") openDrawer("moduleLibrary");
      if(action === "add-module") addModule(target.dataset.type, $(`select[data-size-for="${target.dataset.type}"]`)?.value);
      if(action === "remove-module") removeModule(target.dataset.id);
      if(action === "move-module") moveModule(target.dataset.id, target.dataset.dir);
      if(action === "resize-module") resizeModule(target.dataset.id);
      if(action === "configure-module") configureModule(target.dataset.type, target.dataset.id);
      if(action === "save-module-config") saveModuleConfig(target.dataset.id);
      if(action === "details") openDetails(target.dataset.type, target.dataset.id);
      if(action === "metric-detail") metricDetail(target.dataset.id);
      if(action === "complete-task") completeTask(target.dataset.id);
      if(action === "ack-alert") acknowledgeAlert(target.dataset.id);
      if(action === "start-focus") startFocus();
      if(action === "stop-focus") stopFocus();
      if(action === "edit-note") editNote(target.dataset.id);
      if(action === "save-note") saveNote(target.dataset.id);
      if(action === "delete-note") deleteNote(target.dataset.id);
      if(action === "add-link") openAddLinkModal();
      if(action === "edit-link") openAddLinkModal(target.dataset.id);
      if(action === "save-link") saveLink(target.dataset.id);
      if(action === "delete-link") deleteLink(target.dataset.id);
      if(action === "sync-bookmarks") syncBookmarks();
      if(action === "refresh-weather") refreshWeather();
      if(action === "apply-template") applyTemplate();
      if(action === "confirm-template") confirmTemplate();
      if(action === "undo-layout") undoLayout();
      if(action === "redo-layout") redoLayout();
      if(action === "close-modal") closeAll();
      if(action === "run-command") runCommand(Number(target.dataset.index));
      if(action === "save-command-task") saveCommandTask();
      if(action === "save-command-note") saveCommandNote();
      if(action === "export-data") exportBackup();
      if(action === "confirm-reset") resetDashboard();
      if(action === "export-report") exportReport(target.dataset.id);
      if(action === "undo-layout") undoLayout();
      if(action === "restore-backup") restoreBackup();
    });

    document.addEventListener("click", (event) => {
      const close = event.target.dataset.close;
      if(close) closeAll();
    });

    $("#viewSelect").addEventListener("change", (event) => switchView(event.target.value));
    $("#timeRange").addEventListener("change", (event) => save((draft) => { draft.timeRange = event.target.value; store.appendActivity(draft, "filter", "Time range changed", event.target.value); }, true));
    $("#editToggle").addEventListener("click", toggleEdit);
    $("#commandOpen").addEventListener("click", openPalette);
    $("#settingsOpen").addEventListener("click", () => openDrawer("settings"));
    $("#notificationOpen").addEventListener("click", () => openDrawer("notifications"));
    $("#openModuleLibrary").addEventListener("click", () => openDrawer("moduleLibrary"));
    $("#openModuleLibraryHero").addEventListener("click", () => openDrawer("moduleLibrary"));
    $("#applyTemplateHero").addEventListener("click", applyTemplate);
    $("#restoreModules").addEventListener("click", applyTemplate);
    $("#saveEdit").addEventListener("click", () => save((draft) => { draft.editMode = false; store.appendActivity(draft, "edit", "Dashboard layout saved", currentView().name); }, true));
    $("#undoLayout").addEventListener("click", undoLayout);
    $("#redoLayout").addEventListener("click", redoLayout);
    $("#filterButton").addEventListener("click", () => { const panel = $("#filterPanel"); panel.hidden = !panel.hidden; $("#filterButton").setAttribute("aria-expanded", String(!panel.hidden)); });
    $("#mobileNavToggle").addEventListener("click", () => { document.body.dataset.navOpen = document.body.dataset.navOpen === "true" ? "false" : "true"; });
    $("#closeSettings").addEventListener("click", closeAll);
    $("#closeNotifications").addEventListener("click", closeAll);
    $("#closeModuleLibrary").addEventListener("click", closeAll);
    $("#closeDetail").addEventListener("click", closeAll);
    $("#modalClose").addEventListener("click", closeAll);
    $("#openOptions").addEventListener("click", () => chrome.runtime ? chrome.runtime.openOptionsPage() : window.open("options.html"));
    $("#exportBackup").addEventListener("click", exportBackup);
    $("#importBackup").addEventListener("click", () => $("#importFile").click());
    $("#restoreBackup").addEventListener("click", restoreBackup);
    $("#resetDashboard").addEventListener("click", confirmReset);
    $("#markSignalsRead").addEventListener("click", () => save((draft) => { draft.notifications.forEach((notice) => notice.read = true); store.appendActivity(draft, "notifications", "Notifications marked read", "All notifications cleared."); }, true));
    $("#importFile").addEventListener("change", () => { const file = $("#importFile").files[0]; if(file) importFile(file); $("#importFile").value = ""; });
    $("#moduleSearch").addEventListener("input", renderModuleLibrary);
    $("#moduleCategory").addEventListener("change", renderModuleLibrary);
    $("#commandInput").addEventListener("input", () => { selectedCommandIndex = 0; renderCommands(); });
    $("#commandInput").addEventListener("keydown", (event) => {
      const commands = $("#commandList")._commands || [];
      if(event.key === "ArrowDown"){ event.preventDefault(); selectedCommandIndex = Math.min(commands.length - 1, selectedCommandIndex + 1); renderCommands(); }
      if(event.key === "ArrowUp"){ event.preventDefault(); selectedCommandIndex = Math.max(0, selectedCommandIndex - 1); renderCommands(); }
      if(event.key === "Enter"){ event.preventDefault(); runCommand(selectedCommandIndex); }
    });
    ["priorityFilter", "statusFilter", "sourceFilter"].forEach((id) => $("#" + id).addEventListener("change", () => save((draft) => { draft.filters.priority = $("#priorityFilter").value; draft.filters.status = $("#statusFilter").value; draft.filters.source = $("#sourceFilter").value; }, true)));
    $("#globalFilter").addEventListener("input", () => save((draft) => { draft.filters.query = $("#globalFilter").value; }, true));
    ["themeSetting", "wallpaperSetting", "densitySetting", "defaultViewSetting", "nameSetting", "weatherSetting", "timeFormatSetting", "refreshIntervalSetting", "defaultSpanSetting", "libraryOnEditSetting", "quickDockSetting", "motionSetting"].forEach((id) => $("#" + id).addEventListener("change", saveSettings));
    document.addEventListener("submit", (event) => { if(event.target.id === "quickTaskForm") quickAddTask(event); if(event.target.id === "quickNoteForm") quickAddNote(event); });
    document.addEventListener("keydown", (event) => {
      if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"){ event.preventDefault(); openPalette(); }
      if(event.key === "Escape") closeAll();
    });
  }

  async function init(){
    state = await store.getState();
    bind();
    render();
    timer = setInterval(() => { if(state) render(); }, 30000);
    setInterval(() => { if(state?.focus?.active) renderDashboard(); }, 1000);
  }
  window.addEventListener("unload", () => clearInterval(timer));
  init();
})();
