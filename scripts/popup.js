(function(){
  const defaults = window.LiveDashDefaults;
  const store = window.LiveDashStorage;
  const $ = (selector) => document.querySelector(selector);
  let state;
  let timer;
  function h(value){ return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]); }
  function isUrl(input){ return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input); }
  function url(input){ return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) ? input : `https://${input}`; }
  function fmtTime(date){ return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: state?.settings?.timeFormat === "12h" ? true : state?.settings?.timeFormat === "24h" ? false : undefined }).format(date); }
  function remaining(){ if(!state.focus.active || !state.focus.endsAt) return state.focus.durationMin * 60; return Math.max(0, Math.round((new Date(state.focus.endsAt).getTime() - Date.now()) / 1000)); }
  function duration(seconds){ return `${Math.floor(seconds/60).toString().padStart(2,"0")}:${Math.floor(seconds%60).toString().padStart(2,"0")}`; }
  function applyTheme(){
    const selected = state.settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : state.settings.theme;
    const wallpaper = defaults.wallpapers.find((item) => item.id === state.settings.wallpaper) || defaults.wallpapers[0];
    document.body.dataset.theme = selected === "light" || wallpaper.mode === "light" ? "light" : "dark";
    document.body.dataset.density = state.settings.density || "balanced";
    document.body.style.setProperty("--wp-a", wallpaper.a);
    document.body.style.setProperty("--wp-b", wallpaper.b);
    document.body.style.setProperty("--wp-c", wallpaper.c);
    document.body.style.setProperty("--accent", wallpaper.accent);
  }
  function render(){
    applyTheme();
    $("#popupTime").textContent = fmtTime(new Date());
    $("#popupDate").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    $("#popupFocus").textContent = duration(remaining());
    const view = defaults.savedViews.find((item) => item.id === state.selectedView) || defaults.savedViews[0];
    $("#popupView").textContent = view.name;
    $("#popupStatus").textContent = `${state.tasks.filter((task) => task.status !== "done").length} open tasks · ${state.alerts.filter((alert) => alert.status === "open").length} open alerts`;
    const tasks = state.tasks.filter((task) => task.status !== "done").sort((a,b) => ({critical:0,high:1,medium:2,low:3}[a.priority] ?? 9) - ({critical:0,high:1,medium:2,low:3}[b.priority] ?? 9)).slice(0,4);
    $("#popupTasks").innerHTML = tasks.length ? tasks.map((task) => `<div class="list-item"><span class="status-dot ${task.priority === "critical" ? "danger" : task.priority === "high" ? "warning" : "success"}"></span><div><strong>${h(task.title)}</strong><small>${h(task.priority)} · ${h(task.source)}</small></div><button class="row-action" type="button" data-id="${h(task.id)}">Done</button></div>`).join("") : `<div class="empty-state"><div><strong>No open tasks.</strong><p>Add one from the popup or dashboard.</p></div></div>`;
  }
  async function save(mutator){ state = await store.updateState((draft) => { mutator(draft); return draft; }); render(); }
  async function startFocus(){ await save((draft) => { const now = Date.now(); draft.focus.active = true; draft.focus.startedAt = new Date(now).toISOString(); draft.focus.endsAt = new Date(now + draft.focus.durationMin * 60000).toISOString(); store.appendActivity(draft, "focus", "Focus started from popup", `${draft.focus.durationMin} minutes`); }); }
  async function stopFocus(){ await save((draft) => { if(draft.focus.active) draft.focus.completedSessions += 1; draft.focus.active = false; draft.focus.startedAt = null; draft.focus.endsAt = null; store.appendActivity(draft, "focus", "Focus stopped from popup", "Timer cleared."); }); }
  async function addTask(){ const title = prompt("Task title"); if(!title) return; await save((draft) => { draft.tasks.unshift({ id: defaults.uid("task"), title, priority: "high", status: "open", due: new Date(Date.now() + 86400000).toISOString(), owner: "You", source: "Popup", tags: [] }); store.appendActivity(draft, "task", "Task created from popup", title); }); }
  async function saveNote(){ const body = $("#popupNote").value.trim(); if(!body) return; await save((draft) => { const now = new Date().toISOString(); draft.notes.unshift({ id: defaults.uid("note"), title: body.slice(0,48), body, tags: ["quick"], createdAt: now, updatedAt: now }); store.appendActivity(draft, "note", "Quick note saved", body.slice(0,70)); }); $("#popupNote").value = ""; }
  async function completeTask(id){ await save((draft) => { const task = draft.tasks.find((item) => item.id === id); if(task){ task.status = "done"; store.appendActivity(draft, "task", "Task completed from popup", task.title); } }); }
  function search(event){ event.preventDefault(); const query = $("#popupSearch").value.trim(); if(!query) return; const target = isUrl(query) ? url(query) : `https://www.google.com/search?q=${encodeURIComponent(query)}`; if(typeof chrome !== "undefined" && chrome.tabs) chrome.tabs.create({ url: target }); else window.open(target, "_blank"); }
  function bind(){
    $("#popupSearchForm").addEventListener("submit", search);
    $("#popupStartFocus").addEventListener("click", startFocus);
    $("#popupStopFocus").addEventListener("click", stopFocus);
    $("#popupAddTask").addEventListener("click", addTask);
    $("#popupSaveNote").addEventListener("click", saveNote);
    $("#openDashboard").addEventListener("click", () => chrome.tabs ? chrome.tabs.create({ url: "chrome://newtab" }) : window.open("newtab.html"));
    $("#popupCommand").addEventListener("click", () => chrome.tabs ? chrome.tabs.create({ url: "chrome://newtab" }) : window.open("newtab.html"));
    $("#popupSettings").addEventListener("click", () => chrome.runtime ? chrome.runtime.openOptionsPage() : window.open("options.html"));
    $("#popupTasks").addEventListener("click", (event) => { const button = event.target.closest("button[data-id]"); if(button) completeTask(button.dataset.id); });
  }
  bind();
  store.getState().then((loaded) => { state = loaded; render(); timer = setInterval(render, 1000); });
  window.addEventListener("unload", () => clearInterval(timer));
})();
