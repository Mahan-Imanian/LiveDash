(function(){
  const $ = (s) => document.querySelector(s);
  const storage = globalThis.LiveDashStorage;
  const defaults = globalThis.LiveDashDefaults;
  const h = (v) => String(v ?? "").replace(/[&<>"]/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  let state;
  let tab;
  async function init(){
    state = await storage.getState();
    tab = await activeTab();
    render();
    $("#sideOpenDashboard").addEventListener("click", () => chrome.tabs.create({ url:"newtab.html" }));
    $("#sideCaptureForm").addEventListener("submit", saveCapture);
    $("#sideAddTask").addEventListener("click", taskFromPage);
  }
  function render(){
    $("#sideTabContext").innerHTML = tab && tab.url ? `<div class="panel-head"><div><h2>Current page</h2><p>${h(tab.title || tab.url)}</p></div></div><small>${h(tab.url)}</small>` : `<div class="empty-state"><strong>No active page</strong><p>Open a regular tab to capture context.</p></div>`;
    const open = state.tasks.filter((t)=>t.status!=="done").slice(0,5);
    $("#sideTasks").innerHTML = open.map((t)=>`<div class="work-row"><div><strong>${h(t.title)}</strong><small>${h(t.priority)} · ${h(t.source)}</small></div></div>`).join("") || `<div class="empty-state"><strong>No open tasks</strong><p>Add work from the current page.</p></div>`;
    $("#sideCaptures").innerHTML = state.captures.slice(0,5).map((c)=>`<div class="capture-row"><strong>${h(c.title)}</strong><small>${h(c.type)} · ${h(c.status)}</small></div>`).join("");
  }
  async function saveCapture(event){
    event.preventDefault();
    const text = $("#sideCaptureText").value.trim();
    if(!text) return;
    await storage.updateState((draft) => {
      draft.captures.unshift({ id:defaults.uid("capture"), type:"page-note", title:text.slice(0,70), url:tab?.url || "", note:text, status:"inbox", createdAt:new Date().toISOString() });
      storage.appendActivity(draft,"capture","Side panel capture saved",text.slice(0,90));
    });
    $("#sideCaptureText").value = "";
    state = await storage.getState();
    render();
  }
  async function taskFromPage(){
    const title = $("#sideCaptureText").value.trim() || tab?.title || "Task from current page";
    await storage.updateState((draft) => {
      draft.tasks.unshift({ id:defaults.uid("task"), title, priority:"medium", status:"open", due:new Date().toISOString().slice(0,10), source:"Current page", owner:"You", notes:tab?.url || "", linkedUrl:tab?.url || "", createdAt:new Date().toISOString() });
      storage.appendActivity(draft,"task","Task created from page",title);
    });
    state = await storage.getState();
    render();
  }
  function activeTab(){ return new Promise((resolve) => chrome.tabs.query({active:true,currentWindow:true}, (tabs) => resolve(tabs && tabs[0] ? tabs[0] : null))); }
  init();
})();
