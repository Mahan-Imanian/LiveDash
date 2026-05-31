(function(){
  const defaults = window.LiveDashDefaults;
  const store = window.LiveDashStorage;
  const $ = (selector) => document.querySelector(selector);
  let state;
  function toast(message){ const node = document.createElement("div"); node.className = "toast"; node.textContent = message; $("#toastRegion").append(node); setTimeout(() => node.remove(), 2800); }
  function h(value){ return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]); }
  function applyTheme(){
    const selected = state.settings.theme === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : state.settings.theme;
    const wallpaper = defaults.wallpapers.find((item) => item.id === state.settings.wallpaper) || defaults.wallpapers[0];
    document.body.dataset.theme = selected === "light" || wallpaper.mode === "light" ? "light" : "dark";
    document.body.dataset.density = state.settings.density || "balanced";
    document.body.dataset.reducedMotion = String(Boolean(state.settings.reducedMotion));
    document.body.style.setProperty("--wp-a", wallpaper.a);
    document.body.style.setProperty("--wp-b", wallpaper.b);
    document.body.style.setProperty("--wp-c", wallpaper.c);
    document.body.style.setProperty("--accent", wallpaper.accent);
  }
  function setup(){
    $("#optWallpaper").innerHTML = defaults.wallpapers.map((item) => `<option value="${item.id}">${h(item.name)}</option>`).join("");
    $("#optDefaultView").innerHTML = defaults.savedViews.map((item) => `<option value="${item.id}">${h(item.name)}</option>`).join("");
    $("#versionLabel").textContent = `${defaults.VERSION}.0.0`;
  }
  function render(){
    applyTheme();
    $("#optTheme").value = state.settings.theme;
    $("#optWallpaper").value = state.settings.wallpaper;
    $("#optDensity").value = state.settings.density;
    $("#optDefaultView").value = state.settings.defaultView;
    $("#optName").value = state.settings.greetingName || "";
    $("#optWeather").value = state.settings.weatherLocation || "";
    $("#optTimeFormat").value = state.settings.timeFormat;
    $("#optRefresh").value = state.settings.refreshInterval || "manual";
    $("#optSpan").value = String(state.settings.defaultModuleSpan || 4);
    $("#optLibraryOnEdit").value = String(Boolean(state.settings.openModuleLibraryOnEdit));
    $("#optQuickDock").value = String(Boolean(state.settings.showQuickDock));
    $("#optReducedMotion").value = String(Boolean(state.settings.reducedMotion));
    $("#storageHealth").innerHTML = `<div class="list-item"><span class="status-dot success"></span><div><strong>Storage engine</strong><small>${store.hasChromeStorage() ? "Secure local storage" : "Development fallback"}</small></div><span>OK</span></div><div class="list-item"><span class="status-dot success"></span><div><strong>Schema</strong><small>LiveDash v${state.schemaVersion}</small></div><span>Current</span></div><div class="list-item"><span class="status-dot success"></span><div><strong>Records</strong><small>${state.tasks.length} tasks · ${state.notes.length} notes · ${state.views[state.selectedView].layout.length} modules</small></div><span>Local</span></div>`;
  }
  async function save(){
    state = await store.updateState((draft) => {
      draft.settings.theme = $("#optTheme").value;
      draft.settings.wallpaper = $("#optWallpaper").value;
      draft.settings.density = $("#optDensity").value;
      draft.settings.defaultView = $("#optDefaultView").value;
      draft.settings.greetingName = $("#optName").value || "Operator";
      draft.settings.weatherLocation = $("#optWeather").value || "New York";
      draft.weather.location = draft.settings.weatherLocation;
      draft.settings.timeFormat = $("#optTimeFormat").value;
      draft.settings.refreshInterval = $("#optRefresh").value;
      draft.settings.defaultModuleSpan = Number($("#optSpan").value);
      draft.settings.openModuleLibraryOnEdit = $("#optLibraryOnEdit").value === "true";
      draft.settings.showQuickDock = $("#optQuickDock").value === "true";
      draft.settings.reducedMotion = $("#optReducedMotion").value === "true";
      store.appendActivity(draft, "settings", "Options updated", "Extension options changed.");
      return draft;
    });
    render();
    toast("Saved");
  }
  async function exportBackup(){ const payload = await store.exportState(); store.downloadJson(payload, `livedash-v9-backup-${new Date().toISOString().slice(0,10)}.json`); state = await store.getState(); render(); toast("Backup exported"); }
  async function importFile(file){ try { const payload = JSON.parse(await file.text()); state = await store.importState(payload); render(); toast("Backup imported"); } catch(error){ toast(error.message || "Import failed"); } }
  async function reset(){ if(!confirm("Reset LiveDash to defaults? A restore point will be saved first.")) return; state = await store.resetState(); render(); toast("Dashboard reset"); }
  async function restore(){ try { state = await store.restoreBackup(); render(); toast("Restore complete"); } catch(error){ toast(error.message); } }
  function bind(){
    ["optTheme", "optWallpaper", "optDensity", "optDefaultView", "optName", "optWeather", "optTimeFormat", "optRefresh", "optSpan", "optLibraryOnEdit", "optQuickDock", "optReducedMotion"].forEach((id) => $("#" + id).addEventListener("change", save));
    $("#optExport").addEventListener("click", exportBackup);
    $("#optImport").addEventListener("click", () => $("#optImportFile").click());
    $("#optImportFile").addEventListener("change", () => { const file = $("#optImportFile").files[0]; if(file) importFile(file); $("#optImportFile").value = ""; });
    $("#optReset").addEventListener("click", reset);
    $("#optRestore").addEventListener("click", restore);
    $("#openNewTab").addEventListener("click", () => chrome.tabs ? chrome.tabs.create({ url: "chrome://newtab" }) : window.open("newtab.html"));
  }
  setup();
  bind();
  store.getState().then((loaded) => { state = loaded; render(); });
})();
