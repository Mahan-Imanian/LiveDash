(function(){
  const $ = (s) => document.querySelector(s);
  const storage = globalThis.LiveDashStorage;
  const defaults = globalThis.LiveDashDefaults;
  const h = (v) => String(v ?? "").replace(/[&<>"]/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  let state;
  const rel = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    if(diff < 60000) return "just now";
    if(diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if(diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return `${Math.floor(diff/86400000)}d ago`;
  };
  async function init(){
    state = await storage.getState();
    render();
    $("#openDashboard").addEventListener("click", () => chrome.tabs.create({ url:"newtab.html" }));
    $("#popupSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
    $("#popupOpenSide").addEventListener("click", openSidePanel);
    $("#captureTab").addEventListener("click", captureTab);
    $("#popupAddTask").addEventListener("click", addTask);
    $("#popupCaptureForm").addEventListener("submit", saveCapture);
  }
  function render(){
    $("#popupTime").textContent = new Intl.DateTimeFormat(undefined,{weekday:"short",hour:"numeric",minute:"2-digit"}).format(new Date());
    const open = state.tasks.filter((t)=>t.status!=="done");
    const alerts = state.alerts.filter((a)=>a.status==="open");
    $("#popupStatus").innerHTML = `<strong>${open.length} open tasks</strong><small>${alerts.length} alerts · local updated ${rel(state.updatedAt)}</small>`;
    $("#popupTasks").innerHTML = open.slice(0,4).map((t)=>`<div class="work-row"><div><strong>${h(t.title)}</strong><small>${h(t.priority)} · ${h(t.source)}</small></div><button data-task="${h(t.id)}" type="button">Done</button></div>`).join("") || `<div class="empty-state"><strong>No open tasks</strong><p>Capture something new.</p></div>`;
    document.querySelectorAll("[data-task]").forEach((btn) => btn.addEventListener("click", async () => {
      await storage.updateState((draft) => {
        const task = draft.tasks.find((t) => t.id === btn.dataset.task);
        if(task){ task.status = "done"; storage.appendActivity(draft,"task","Task completed",task.title); storage.appendNotification(draft,"Task completed",task.title,"success"); }
      });
      state = await storage.getState();
      render();
    }));
  }
  async function saveCapture(event){
    event.preventDefault();
    const text = $("#popupCaptureText").value.trim();
    if(!text) return;
    await storage.updateState((draft) => {
      draft.captures.unshift({ id:defaults.uid("capture"), type:"note", title:text.slice(0,70), url:"", note:text, status:"inbox", createdAt:new Date().toISOString() });
      storage.appendActivity(draft,"capture","Quick capture saved",text.slice(0,90));
    });
    $("#popupCaptureText").value = "";
    state = await storage.getState();
    render();
  }
  async function captureTab(){
    const tab = await activeTab();
    if(!tab || !tab.url) return;
    await storage.updateState((draft) => {
      draft.captures.unshift({ id:defaults.uid("capture"), type:"page", title:tab.title || tab.url, url:tab.url, note:"Captured from extension popup.", status:"inbox", createdAt:new Date().toISOString() });
      storage.appendActivity(draft,"capture","Current tab captured",tab.title || tab.url);
    });
    state = await storage.getState();
    render();
  }
  async function addTask(){
    const title = $("#popupCaptureText").value.trim() || prompt("Task title");
    if(!title) return;
    await storage.updateState((draft) => {
      draft.tasks.unshift({ id:defaults.uid("task"), title, priority:"medium", status:"open", due:new Date().toISOString().slice(0,10), source:"Popup", owner:"You", notes:"Created from popup.", createdAt:new Date().toISOString() });
      storage.appendActivity(draft,"task","Task added",title);
    });
    $("#popupCaptureText").value = "";
    state = await storage.getState();
    render();
  }
  function activeTab(){ return new Promise((resolve) => chrome.tabs.query({active:true,currentWindow:true}, (tabs) => resolve(tabs && tabs[0] ? tabs[0] : null))); }
  function openSidePanel(){ if(chrome.sidePanel && chrome.sidePanel.open){ chrome.windows.getCurrent((win) => chrome.sidePanel.open({ windowId:win.id })); } }
  init();
})();
