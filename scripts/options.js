(function(){
  const defaults = window.LiveDashDefaults;
  const store = window.LiveDashStorage;
  const $ = (selector) => document.querySelector(selector);
  let state;

  function toast(message){ const region = $("#toastRegion"); const node = document.createElement("div"); node.className = "toast"; node.textContent = message; region.append(node); setTimeout(() => node.remove(), 2800); }

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

  function setup(){
    $("#optWallpaper").innerHTML = defaults.wallpapers.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    $("#optDefaultView").innerHTML = defaults.savedViews.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
  }

  function render(){
    applyTheme();
    $("#optTheme").value = state.settings.theme;
    $("#optWallpaper").value = state.settings.wallpaper;
    $("#optDensity").value = state.settings.density;
    $("#optGlass").value = state.settings.glass;
    $("#optDefaultView").value = state.settings.defaultView;
    $("#optName").value = state.settings.greetingName || "";
    $("#optWeather").value = state.settings.weatherLocation || "";
    $("#optTimeFormat").value = state.settings.timeFormat;
    $("#storageHealth").innerHTML = `
      <div class="list-item"><span class="status-dot success"></span><div><strong>Storage</strong><small>${store.hasChromeStorage() ? "chrome.storage.local" : "localStorage fallback"}</small></div></div>
      <div class="list-item"><span class="status-dot success"></span><div><strong>Schema</strong><small>v${state.schemaVersion}</small></div></div>
      <div class="list-item"><span class="status-dot success"></span><div><strong>Records</strong><small>${state.tasks.length} tasks · ${state.notes.length} notes · ${state.links.length} links</small></div></div>`;
  }

  async function save(mutator){ state = await store.updateState((draft) => { mutator(draft); return draft; }); render(); toast("Saved"); }
  async function exportBackup(){ const payload = await store.exportState(); store.downloadJson(payload, `livedash-v7-backup-${new Date().toISOString().slice(0,10)}.json`); toast("Backup exported"); }
  async function importFile(file){ try { const payload = JSON.parse(await file.text()); state = await store.importState(payload); render(); toast("Backup imported"); } catch(error){ toast(error.message || "Import failed"); } }
  async function reset(){ if(!confirm("Reset LiveDash to defaults? Current data will be retained as a restore point.")) return; state = await store.resetState(); render(); toast("Dashboard reset"); }
  async function restore(){ try { state = await store.restoreBackup(); render(); toast("Restore complete"); } catch(error){ toast(error.message); } }

  function bind(){
    ["optTheme", "optWallpaper", "optDensity", "optGlass", "optDefaultView", "optName", "optWeather", "optTimeFormat"].forEach((id) => {
      $("#" + id).addEventListener("change", () => save((draft) => {
        draft.settings.theme = $("#optTheme").value;
        draft.settings.wallpaper = $("#optWallpaper").value;
        draft.settings.density = $("#optDensity").value;
        draft.settings.glass = $("#optGlass").value;
        draft.settings.defaultView = $("#optDefaultView").value;
        draft.settings.greetingName = $("#optName").value || "Operator";
        draft.settings.weatherLocation = $("#optWeather").value || "New York";
        draft.weather.location = draft.settings.weatherLocation;
        draft.settings.timeFormat = $("#optTimeFormat").value;
        store.appendActivity(draft, "settings", "Options updated", "Extension options changed.");
      }));
    });
    $("#optExport").addEventListener("click", exportBackup);
    $("#optImport").addEventListener("click", () => $("#optImportFile").click());
    $("#optImportFile").addEventListener("change", () => { const file = $("#optImportFile").files[0]; if(file) importFile(file); $("#optImportFile").value = ""; });
    $("#optReset").addEventListener("click", reset);
    $("#optRestore").addEventListener("click", restore);
  }

  setup();
  bind();
  store.getState().then((loaded) => { state = loaded; render(); });
})();
