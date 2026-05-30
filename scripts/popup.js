(function(){
  const D = globalThis.LiveDashDefaults;
  const S = globalThis.LiveDashStorage;
  let state;
  const $ = (id) => document.getElementById(id);
  function esc(value){ return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char])); }
  function toast(message, tone){ const node = document.createElement("div"); node.className = `toast ${tone || "success"}`; node.textContent = message; $("toastRegion").append(node); setTimeout(() => node.remove(), 2200); }
  function applyTheme(){
    const pref = state.settings.theme;
    const systemLight = matchMedia("(prefers-color-scheme: light)").matches;
    document.documentElement.dataset.theme = pref === "system" ? (systemLight ? "light" : "dark") : pref;
    document.documentElement.dataset.density = state.settings.density;
    document.documentElement.dataset.background = state.settings.background || "aurora";
  }
  function viewName(){ return (D.savedViews.find((view) => view.id === state.settings.selectedView) || D.savedViews[0]).name; }
  function focusText(){
    if(!state.focus.active || !state.focus.endsAt) return "Off";
    const ms = Math.max(0, new Date(state.focus.endsAt).getTime() - Date.now());
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }
  function render(){
    applyTheme();
    $("popupClock").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date());
    $("popupFocus").textContent = focusText();
    $("popupView").textContent = viewName();
    $("popupToggleFocus").textContent = state.focus.active ? "Stop focus" : "Start focus";
    const tasks = state.tasks.filter((task) => task.status !== "done").slice(0, 4);
    $("popupTasks").innerHTML = tasks.length ? tasks.map((task) => `<div class="popup-task"><strong>${esc(task.title)}</strong><span>${esc(task.priority)} · ${esc(task.status)}</span></div>`).join("") : `<div class="empty-state compact"><strong>Task queue clear</strong><span>No active tasks.</span></div>`;
  }
  async function mutate(mutator, message){
    state = await S.updateState(mutator);
    render();
    if(message) toast(message);
  }
  async function toggleFocus(){
    await mutate((draft) => {
      if(draft.focus.active){
        draft.focus.active = false;
        draft.focus.startedAt = null;
        draft.focus.endsAt = null;
        draft.focus.completedToday += 1;
        S.appendActivity(draft, "focus", "Focus session completed", "Session stopped from popup.");
        S.appendNotification(draft, "Focus completed", "Focus time was recorded.", "success");
      } else {
        const start = new Date();
        const end = new Date(start.getTime() + draft.focus.durationMin * 60000);
        draft.focus.active = true;
        draft.focus.startedAt = start.toISOString();
        draft.focus.endsAt = end.toISOString();
        S.appendActivity(draft, "focus", "Focus session started", "Session started from popup.");
      }
    }, state.focus.active ? "Focus completed" : "Focus started");
  }
  async function addTask(){
    await mutate((draft) => {
      draft.tasks.unshift({ id: D.uid("task"), title: "New quick task", priority: "medium", status: "open", due: new Date().toISOString(), source: "Popup", owner: "You" });
      S.appendActivity(draft, "task", "Quick task created", "Created from popup.");
      S.appendNotification(draft, "Quick task created", "A new task was added from the popup.", "success");
    }, "Quick task added");
  }
  async function saveNote(){
    const body = $("popupNote").value.trim();
    if(!body){ toast("Write a note first", "warning"); return; }
    await mutate((draft) => {
      draft.notes.unshift({ id: D.uid("note"), title: "Quick note", body, tags: ["popup"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      S.appendActivity(draft, "note", "Quick note created", body.slice(0, 80));
      S.appendNotification(draft, "Quick note saved", "The note was added to LiveDash.", "success");
    }, "Note saved");
    $("popupNote").value = "";
  }
  function runSearch(value){
    const query = value.trim();
    if(!query) return;
    if(query.startsWith("/task")){ addTask(); return; }
    if(query.startsWith("/note")){ $("popupNote").focus(); return; }
    const url = /^https?:\/\//i.test(query) ? query : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    if(typeof chrome !== "undefined" && chrome.tabs) chrome.tabs.create({ url });
    else window.open(url, "_blank", "noopener");
  }
  function openDashboard(){
    const hasChrome = typeof chrome !== "undefined" && chrome.runtime;
    const url = hasChrome ? chrome.runtime.getURL("newtab.html") : "newtab.html";
    if(hasChrome && chrome.tabs) chrome.tabs.create({ url });
    else window.open(url, "_blank", "noopener");
  }
  function openSettings(){
    if(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
    else window.open("options.html", "_blank", "noopener");
  }
  async function init(){
    state = await S.getState();
    render();
    $("popupToggleFocus").addEventListener("click", toggleFocus);
    $("popupAddTask").addEventListener("click", addTask);
    $("popupSaveNote").addEventListener("click", saveNote);
    $("openDashboard").addEventListener("click", openDashboard);
    $("popupSettings").addEventListener("click", openSettings);
    $("popupSearch").addEventListener("keydown", (event) => { if(event.key === "Enter") runSearch($("popupSearch").value); });
    setInterval(render, 1000);
  }
  document.addEventListener("DOMContentLoaded", init);
})();
