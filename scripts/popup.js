(function(){
  const defaults = window.LiveDashDefaults;
  const store = window.LiveDashStorage;
  const $ = (selector) => document.querySelector(selector);
  let state;
  let timer;

  function escapeHtml(value){ return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]); }
  function fmtTime(date){ return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: state?.settings?.timeFormat === "12h" ? true : state?.settings?.timeFormat === "24h" ? false : undefined }).format(date); }
  function isUrl(input){ return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input); }
  function normalizedUrl(input){ return /^(https?:\/\/|chrome:\/\/|file:\/\/)/i.test(input) ? input : `https://${input}`; }
  function remaining(){ if(!state.focus.active || !state.focus.endsAt) return state.focus.durationMin * 60; return Math.max(0, Math.round((new Date(state.focus.endsAt).getTime() - Date.now()) / 1000)); }
  function formatDuration(seconds){ return `${Math.floor(seconds/60).toString().padStart(2,"0")}:${Math.floor(seconds%60).toString().padStart(2,"0")}`; }
  function toast(message){ const node = document.createElement("div"); node.className = "toast"; node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 2200); }

  function applyTheme(){
    const selected = state.settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : state.settings.theme;
    const wallpaper = defaults.wallpapers.find((item) => item.id === state.settings.wallpaper) || defaults.wallpapers[1];
    document.body.dataset.theme = selected === "light" || wallpaper.mode === "light" ? "light" : "dark";
    document.body.dataset.glass = state.settings.glass || "medium";
    document.body.style.setProperty("--wp-a", wallpaper.a);
    document.body.style.setProperty("--wp-b", wallpaper.b);
    document.body.style.setProperty("--wp-c", wallpaper.c);
    document.body.style.setProperty("--accent", wallpaper.accent);
  }

  function render(){
    applyTheme();
    $("#popupTime").textContent = fmtTime(new Date());
    $("#popupDate").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    $("#popupFocus").textContent = formatDuration(remaining());
    const tasks = state.tasks.filter((task) => task.status !== "done").sort((a,b) => ({critical:0,high:1,medium:2,low:3}[a.priority] ?? 4) - ({critical:0,high:1,medium:2,low:3}[b.priority] ?? 4)).slice(0,4);
    $("#popupTasks").innerHTML = tasks.map((task) => `<div class="list-item"><span class="status-dot ${task.priority === "critical" ? "danger" : task.priority === "high" ? "warning" : "success"}"></span><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.priority)} · ${escapeHtml(task.status)}</small></div><button data-complete="${escapeHtml(task.id)}" type="button">Done</button></div>`).join("") || `<div class="empty-state">No open tasks</div>`;
    document.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => completeTask(button.dataset.complete)));
  }

  async function reload(){ state = await store.getState(); render(); }
  async function save(mutator){ state = await store.updateState((draft) => { mutator(draft); return draft; }); render(); }
  async function completeTask(id){ await save((draft) => { const task = draft.tasks.find((item) => item.id === id); if(task){ task.status = "done"; store.appendActivity(draft, "task", "Task completed from popup", task.title); } }); }
  async function startFocus(){ await save((draft) => { const now = Date.now(); draft.focus.active = true; draft.focus.startedAt = new Date(now).toISOString(); draft.focus.endsAt = new Date(now + draft.focus.durationMin * 60000).toISOString(); store.appendActivity(draft, "focus", "Focus started from popup", `${draft.focus.durationMin} minute session.`); }); }
  async function stopFocus(){ await save((draft) => { draft.focus.active = false; draft.focus.startedAt = null; draft.focus.endsAt = null; store.appendActivity(draft, "focus", "Focus stopped from popup", "Session stopped."); }); }
  async function addTask(){ const title = prompt("Task title"); if(!title) return; await save((draft) => { draft.tasks.unshift({ id: defaults.uid("task"), title, priority: "high", status: "open", due: new Date().toISOString(), source: "Popup", owner: "You" }); store.appendActivity(draft, "task", "Task created from popup", title); }); }
  async function saveNote(){ const body = $("#popupNote").value.trim(); if(!body) return; await save((draft) => { const now = new Date().toISOString(); draft.notes.unshift({ id: defaults.uid("note"), title: body.slice(0,48), body, tags: ["quick"], createdAt: now, updatedAt: now }); store.appendActivity(draft, "note", "Quick note saved", body.slice(0,60)); }); $("#popupNote").value = ""; toast("Note saved"); }

  function search(){
    const query = $("#popupSearch").value.trim();
    if(!query) return;
    const target = isUrl(query) ? normalizedUrl(query) : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url: target });
  }

  function bind(){
    $("#openDashboard").addEventListener("click", () => chrome.tabs.create({ url: "chrome://newtab" }));
    $("#popupSearch").addEventListener("keydown", (event) => { if(event.key === "Enter") search(); });
    $("#popupStartFocus").addEventListener("click", startFocus);
    $("#popupStopFocus").addEventListener("click", stopFocus);
    $("#popupAddTask").addEventListener("click", addTask);
    $("#popupSaveNote").addEventListener("click", saveNote);
    $("#popupCommand").addEventListener("click", () => chrome.tabs.create({ url: "chrome://newtab" }));
    $("#popupSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
  }

  bind();
  reload();
  timer = setInterval(render, 1000);
  window.addEventListener("unload", () => clearInterval(timer));
})();
