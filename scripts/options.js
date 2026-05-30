(function(){
  const D = globalThis.LiveDashDefaults;
  const S = globalThis.LiveDashStorage;
  let state;
  const $ = (id) => document.getElementById(id);
  function toast(message, tone){ const node = document.createElement("div"); node.className = `toast ${tone || "success"}`; node.textContent = message; $("toastRegion").append(node); setTimeout(() => node.remove(), 3000); }
  function applyTheme(){
    const pref = state.settings.theme;
    const systemLight = matchMedia("(prefers-color-scheme: light)").matches;
    document.documentElement.dataset.theme = pref === "system" ? (systemLight ? "light" : "dark") : pref;
    document.documentElement.dataset.density = state.settings.density;
    document.documentElement.dataset.motion = state.settings.reducedMotion ? "reduced" : "standard";
  }
  function setViewOptions(){
    $("defaultViewSelect").innerHTML = D.savedViews.map((view) => `<option value="${view.id}">${view.name}</option>`).join("");
  }
  function render(){
    applyTheme();
    setViewOptions();
    $("themeSelect").value = state.settings.theme;
    $("densitySelect").value = state.settings.density;
    $("defaultViewSelect").value = state.settings.defaultView;
    $("timeRangeSelect").value = state.settings.timeRange;
    $("reducedMotionCheck").checked = Boolean(state.settings.reducedMotion);
    $("showSignalsCheck").checked = Boolean(state.settings.showSignals);
    $("timeFormatSelect").value = state.settings.timeFormat || "auto";
    $("weatherLocationInput").value = state.settings.weatherLocation || "";
    $("schemaValue").textContent = `v${state.schemaVersion}`;
    $("taskCount").textContent = String(state.tasks.length);
    $("noteCount").textContent = String(state.notes.length);
    $("activityCount").textContent = String(state.activity.length);
  }
  async function mutate(mutator, message){
    state = await S.updateState(mutator);
    render();
    if(message) toast(message);
  }
  async function exportDashboard(){
    const payload = await S.exportState();
    S.downloadJson(payload, `livedash-v5-backup-${new Date().toISOString().slice(0,10)}.json`);
    await mutate((draft) => { S.appendActivity(draft, "export", "Dashboard data exported", "Backup created from options page."); S.appendNotification(draft, "Export complete", "Dashboard backup downloaded.", "success"); }, "Export complete");
  }
  async function importDashboard(){
    const file = $("importFileInput").files && $("importFileInput").files[0];
    if(!file) return;
    try{
      const payload = JSON.parse(await file.text());
      state = await S.importState(payload);
      render();
      toast("Import complete");
    } catch(error){
      toast(error.message || "Import failed", "warning");
    } finally {
      $("importFileInput").value = "";
    }
  }
  async function resetDashboard(){
    const ok = confirm("Reset LiveDash to the default v5 dashboard? A restore point will be saved in Chrome storage.");
    if(!ok) return;
    state = await S.resetState();
    render();
    toast("Dashboard reset", "warning");
  }
  async function init(){
    state = await S.getState();
    render();
    $("themeSelect").addEventListener("change", () => mutate((draft) => { draft.settings.theme = $("themeSelect").value; S.appendActivity(draft, "settings", "Theme changed", $("themeSelect").value); }, "Theme updated"));
    $("densitySelect").addEventListener("change", () => mutate((draft) => { draft.settings.density = $("densitySelect").value; S.appendActivity(draft, "settings", "Density changed", $("densitySelect").value); }, "Density updated"));
    $("defaultViewSelect").addEventListener("change", () => mutate((draft) => { draft.settings.defaultView = $("defaultViewSelect").value; draft.settings.selectedView = $("defaultViewSelect").value; S.appendActivity(draft, "settings", "Default view changed", $("defaultViewSelect").value); }, "Default view updated"));
    $("timeRangeSelect").addEventListener("change", () => mutate((draft) => { draft.settings.timeRange = $("timeRangeSelect").value; S.appendActivity(draft, "settings", "Default time range changed", $("timeRangeSelect").value); }, "Time range updated"));
    $("reducedMotionCheck").addEventListener("change", () => mutate((draft) => { draft.settings.reducedMotion = $("reducedMotionCheck").checked; S.appendActivity(draft, "settings", "Reduced motion changed", String($("reducedMotionCheck").checked)); }, "Motion preference updated"));
    $("showSignalsCheck").addEventListener("change", () => mutate((draft) => { draft.settings.showSignals = $("showSignalsCheck").checked; S.appendActivity(draft, "settings", "Signal visibility changed", String($("showSignalsCheck").checked)); }, "Signal preference updated"));
    $("timeFormatSelect").addEventListener("change", () => mutate((draft) => { draft.settings.timeFormat = $("timeFormatSelect").value; S.appendActivity(draft, "settings", "Time format changed", $("timeFormatSelect").value); }, "Time format updated"));
    $("weatherLocationInput").addEventListener("change", () => mutate((draft) => { const value = $("weatherLocationInput").value.trim() || "New York"; draft.settings.weatherLocation = value; draft.weather.location = value; draft.weather.updatedAt = new Date().toISOString(); S.appendActivity(draft, "settings", "Weather location changed", value); }, "Weather location updated"));
    $("exportButton").addEventListener("click", exportDashboard);
    $("importButton").addEventListener("click", () => $("importFileInput").click());
    $("importFileInput").addEventListener("change", importDashboard);
    $("resetButton").addEventListener("click", resetDashboard);
  }
  document.addEventListener("DOMContentLoaded", init);
})();
