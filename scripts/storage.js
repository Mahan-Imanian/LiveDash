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
    return new Promise((resolve, reject) => {
      if(!hasChromeStorage()){
        Object.keys(value).forEach((key) => localStorage.setItem(key, JSON.stringify(value[key])));
        resolve();
        return;
      }
      chrome.storage.local.set(value, () => {
        const err = chrome.runtime && chrome.runtime.lastError;
        if(err) reject(new Error(err.message));
        else resolve();
      });
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

  function appendActivity(state, type, title, detail){
    state.activity = Array.isArray(state.activity) ? state.activity : [];
    state.activity.unshift({ id: defaults.uid("activity"), type, title, detail: detail || "", createdAt: new Date().toISOString() });
    state.activity = state.activity.slice(0, 200);
  }

  function appendNotification(state, title, body, severity){
    state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
    state.notifications.unshift({ id: defaults.uid("notice"), title, body, severity: severity || "info", read: false, createdAt: new Date().toISOString() });
    state.notifications = state.notifications.slice(0, 120);
  }

  async function getState(){
    const keys = [KEY].concat(LEGACY_KEYS);
    const result = await storageGet(keys);
    let source = result[KEY];
    let migrated = false;
    if(!source){
      for(const legacyKey of LEGACY_KEYS){
        if(result[legacyKey]){
          source = result[legacyKey];
          migrated = true;
          break;
        }
      }
    }
    const merged = defaults.mergeState(source);
    if(!source || migrated || source.schemaVersion !== defaults.VERSION){
      appendActivity(merged, "migration", migrated ? "Storage migrated" : "Local workspace prepared", migrated ? "Older LiveDash data was upgraded to v11." : "Default tasks, captures, and source health were created.");
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

  function validateImport(payload){
    if(!payload || typeof payload !== "object") throw new Error("Import file is not valid LiveDash data.");
    const state = payload.state || payload;
    if(!state || typeof state !== "object") throw new Error("Import file does not contain dashboard state.");
    if(state.schemaVersion && Number(state.schemaVersion) > defaults.VERSION) throw new Error("Import file uses a newer schema than this extension supports.");
    ["tasks", "notes", "links", "metrics", "alerts", "reports", "activity"].forEach((field) => {
      if(state[field] && !Array.isArray(state[field])) throw new Error(`${field} must be an array.`);
    });
    return defaults.mergeState(state);
  }

  async function exportState(){
    const state = await getState();
    appendActivity(state, "export", "Dashboard backup exported", "A versioned LiveDash v11 backup was created.");
    await saveState(state);
    return {
      product: "LiveDash",
      format: "livedash-v11-backup",
      schemaVersion: defaults.VERSION,
      exportedAt: new Date().toISOString(),
      state
    };
  }

  async function importState(payload){
    const current = await getState();
    const next = validateImport(payload);
    next.lastBackup = current;
    appendActivity(next, "import", "Dashboard data imported", "Validated backup imported with a pre-import restore point.");
    appendNotification(next, "Import complete", "Dashboard data was imported successfully.", "success");
    return saveState(next);
  }

  async function resetState(){
    const current = await getState();
    const next = defaults.createDefaultState();
    next.lastBackup = current;
    appendActivity(next, "reset", "Dashboard reset", "Default LiveDash v11 dashboard restored with a restore point.");
    appendNotification(next, "Dashboard reset", "Default dashboard restored. Previous data is retained as a restore point.", "warning");
    return saveState(next);
  }

  async function restoreBackup(){
    const current = await getState();
    if(!current.lastBackup) throw new Error("No restore point is available.");
    const backup = defaults.mergeState(current.lastBackup);
    backup.lastBackup = current;
    appendActivity(backup, "restore", "Restore point loaded", "Previous dashboard backup restored.");
    appendNotification(backup, "Restore complete", "The previous dashboard state was restored.", "success");
    return saveState(backup);
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

  global.LiveDashStorage = { getState, saveState, updateState, appendActivity, appendNotification, exportState, importState, resetState, restoreBackup, validateImport, downloadJson, hasChromeStorage };
})(globalThis);
