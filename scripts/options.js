(function(){
  const $ = (s) => document.querySelector(s);
  const storage = globalThis.LiveDashStorage;
  let state;
  async function init(){
    state = await storage.getState();
    render();
    $("#openDashboard").addEventListener("click", () => chrome.tabs.create({ url:"newtab.html" }));
    $("#optionsForm").addEventListener("submit", saveOptions);
    $("#exportData").addEventListener("click", exportData);
    $("#importData").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", importData);
    $("#restoreData").addEventListener("click", restoreData);
    $("#resetData").addEventListener("click", resetData);
  }
  function render(){
    $("#defaultView").innerHTML = state.templates.map((view) => `<option value="${view.id}" ${state.settings.defaultView === view.id ? "selected" : ""}>${view.name}</option>`).join("");
    $("#theme").value = state.settings.theme;
    $("#density").value = state.settings.density;
    $("#defaultView").value = state.settings.defaultView;
    $("#timeFormat").value = state.settings.timeFormat;
    $("#displayName").value = state.settings.displayName;
    $("#defaultSpan").value = String(state.settings.defaultModuleSpan || 6);
    const bytes = new Blob([JSON.stringify(state)]).size;
    const stale = state.sources.filter((source) => source.state !== "fresh").length;
    $("#storageSummary").textContent = `${Math.round(bytes/1024)} KB stored locally. ${stale} source${stale === 1 ? "" : "s"} need review.`;
  }
  async function saveOptions(event){
    event.preventDefault();
    state = await storage.updateState((draft) => {
      draft.settings.theme = $("#theme").value;
      draft.settings.density = $("#density").value;
      draft.settings.defaultView = $("#defaultView").value;
      draft.settings.timeFormat = $("#timeFormat").value;
      draft.settings.displayName = $("#displayName").value.trim() || "Alex";
      draft.settings.defaultModuleSpan = Number($("#defaultSpan").value);
      storage.appendActivity(draft,"settings","Options saved","Appearance, layout, or defaults changed.");
      storage.appendNotification(draft,"Settings saved","Options were updated locally.","success");
    });
    render();
  }
  async function exportData(){
    const data = await storage.exportState();
    storage.downloadJson(data, `livedash-v10-backup-${new Date().toISOString().slice(0,10)}.json`);
    state = await storage.getState();
    render();
  }
  async function importData(event){
    const file = event.target.files[0];
    if(!file) return;
    try{
      state = await storage.importState(JSON.parse(await file.text()));
      render();
      alert("Backup imported.");
    }catch(error){ alert(error.message || "Import failed."); }
    event.target.value = "";
  }
  async function restoreData(){
    try{ state = await storage.restoreBackup(); render(); alert("Restore point loaded."); }
    catch(error){ alert(error.message || "No restore point is available."); }
  }
  async function resetData(){
    if(!confirm("Reset LiveDash to the v10 default state? A restore point will be retained.")) return;
    state = await storage.resetState();
    render();
  }
  init();
})();
