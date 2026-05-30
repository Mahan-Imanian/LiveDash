(function(global){
  const defaults = global.LiveDashDefaults;
  const KEY = defaults.STORAGE_KEY;
  const LEGACY_KEYS = defaults.LEGACY_KEYS;

  function hasChromeStorage(){
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  function storageGet(keys){
    return new Promise((resolve) => {
      if(!hasChromeStorage()){
        const result = {};
        const list = Array.isArray(keys) ? keys : [keys];
        list.forEach((key) => {
          const raw = localStorage.getItem(key);
          if(raw){
            try { result[key] = JSON.parse(raw); } catch { result[key] = raw; }
          }
        });
        resolve(result);
        return;
      }
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function storageSet(value){
    return new Promise((resolve) => {
      if(!hasChromeStorage()){
        Object.keys(value).forEach((key) => localStorage.setItem(key, JSON.stringify(value[key])));
        resolve();
        return;
      }
      chrome.storage.local.set(value, () => resolve());
    });
  }

  function storageRemove(keys){
    return new Promise((resolve) => {
      if(!hasChromeStorage()){
        const list = Array.isArray(keys) ? keys : [keys];
        list.forEach((key) => localStorage.removeItem(key));
        resolve();
        return;
      }
      chrome.storage.local.remove(keys, () => resolve());
    });
  }

  async function getState(){
    const keys = [KEY].concat(LEGACY_KEYS);
    const result = await storageGet(keys);
    let state = result[KEY];
    let migrated = false;
    if(!state){
      for(const legacyKey of LEGACY_KEYS){
        if(result[legacyKey]){
          state = result[legacyKey];
          migrated = true;
          break;
        }
      }
    }
    const merged = defaults.mergeState(state);
    if(!state || migrated || merged.schemaVersion !== defaults.VERSION){
      await saveState(merged);
      if(migrated) await storageRemove(LEGACY_KEYS);
    }
    return merged;
  }

  async function saveState(state){
    const clean = defaults.mergeState(state);
    clean.updatedAt = new Date().toISOString();
    await storageSet({ [KEY]: clean });
    return clean;
  }

  async function updateState(mutator){
    const state = await getState();
    const next = defaults.clone(state);
    const result = mutator(next) || next;
    return saveState(result);
  }

  function appendActivity(state, type, title, detail){
    state.activity = Array.isArray(state.activity) ? state.activity : [];
    state.activity.unshift({ id: defaults.uid("activity"), type, title, detail: detail || "", createdAt: new Date().toISOString() });
    state.activity = state.activity.slice(0, 120);
  }

  function appendNotification(state, title, body, severity){
    state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
    state.notifications.unshift({ id: defaults.uid("notice"), title, body, severity: severity || "info", read: false, createdAt: new Date().toISOString() });
    state.notifications = state.notifications.slice(0, 80);
  }

  function validateImport(payload){
    if(!payload || typeof payload !== "object") throw new Error("Import file is not valid dashboard data.");
    const state = payload.state || payload;
    if(!state || typeof state !== "object") throw new Error("Import file does not contain a dashboard state object.");
    if(state.schemaVersion && Number(state.schemaVersion) > defaults.VERSION) throw new Error("Import file uses a newer schema than this extension supports.");
    if(state.tasks && !Array.isArray(state.tasks)) throw new Error("Tasks must be an array.");
    if(state.notes && !Array.isArray(state.notes)) throw new Error("Notes must be an array.");
    if(state.metrics && !Array.isArray(state.metrics)) throw new Error("Metrics must be an array.");
    return defaults.mergeState(state);
  }

  async function exportState(){
    const state = await getState();
    return {
      product: "LiveDash",
      format: "livedash-dashboard-backup",
      schemaVersion: defaults.VERSION,
      exportedAt: new Date().toISOString(),
      state
    };
  }

  async function importState(payload){
    const current = await getState();
    const next = validateImport(payload);
    next.lastBackup = current;
    appendActivity(next, "import", "Dashboard data imported", "Validated backup imported with pre-import restore point.");
    appendNotification(next, "Import complete", "Dashboard data was imported successfully.", "success");
    return saveState(next);
  }

  async function resetState(){
    const current = await getState();
    const next = defaults.createDefaultState();
    next.lastBackup = current;
    appendActivity(next, "reset", "Dashboard reset", "Default extension dashboard restored with restore point.");
    appendNotification(next, "Dashboard reset", "Default v4 dashboard restored. Previous state is available as a restore point.", "warning");
    return saveState(next);
  }

  function downloadJson(payload, filename){
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 250);
  }

  global.LiveDashStorage = { getState, saveState, updateState, appendActivity, appendNotification, exportState, importState, resetState, validateImport, downloadJson, hasChromeStorage };
})(globalThis);
