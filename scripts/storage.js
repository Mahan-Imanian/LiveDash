(function () {
  const STORE_KEY = 'livedash_state_v18';
  const LEGACY_KEYS = ['livedash_state_v121', 'livedash_state_v12', 'livedash_state_v11', 'livedash_state_v10', 'livedash_state_v9'];

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  function deepMerge(base, next) {
    if (!next || typeof next !== 'object' || Array.isArray(next)) return clone(next ?? base);
    const output = clone(base || {});
    Object.keys(next).forEach((key) => {
      if (next[key] && typeof next[key] === 'object' && !Array.isArray(next[key])) {
        output[key] = deepMerge(output[key] || {}, next[key]);
      } else {
        output[key] = clone(next[key]);
      }
    });
    return output;
  }

  async function rawGet(key) {
    if (hasChromeStorage()) {
      const result = await chrome.storage.local.get(key);
      return result[key];
    }
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  async function rawSet(key, value) {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function migrateLegacy() {
    for (const key of LEGACY_KEYS) {
      const oldState = await rawGet(key);
      if (oldState) {
        return oldState;
      }
    }
    return undefined;
  }

  async function getState() {
    const defaults = window.LiveDashDefaults.defaultState;
    const stored = (await rawGet(STORE_KEY)) || (await migrateLegacy());
    const merged = deepMerge(defaults, stored || {});
    merged.schemaVersion = window.LiveDashDefaults.SCHEMA_VERSION;
    if (!merged.updatedAt) merged.updatedAt = new Date().toISOString();
    await rawSet(STORE_KEY, merged);
    return merged;
  }

  async function setState(nextState) {
    const stamped = deepMerge(window.LiveDashDefaults.defaultState, nextState || {});
    stamped.schemaVersion = window.LiveDashDefaults.SCHEMA_VERSION;
    stamped.updatedAt = new Date().toISOString();
    await rawSet(STORE_KEY, stamped);
    return stamped;
  }

  async function updateState(mutator) {
    const current = await getState();
    const result = typeof mutator === 'function' ? await mutator(clone(current)) : mutator;
    return setState(result || current);
  }

  async function resetState() {
    const reset = clone(window.LiveDashDefaults.defaultState);
    reset.updatedAt = new Date().toISOString();
    await rawSet(STORE_KEY, reset);
    return reset;
  }

  async function exportState() {
    const state = await getState();
    return {
      product: 'LiveDash',
      schemaVersion: window.LiveDashDefaults.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state
    };
  }

  async function importState(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid backup file.');
    const imported = payload.state || payload;
    if (!imported.settings && !imported.tasks && !imported.quickLinks) {
      throw new Error('Backup does not contain LiveDash dashboard data.');
    }
    return setState(deepMerge(window.LiveDashDefaults.defaultState, imported));
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result)); } catch (error) { reject(new Error('Could not read JSON backup.')); }
      };
      reader.onerror = () => reject(new Error('Could not read selected file.'));
      reader.readAsText(file);
    });
  }

  window.LiveDashStore = {
    STORE_KEY,
    getState,
    setState,
    updateState,
    resetState,
    exportState,
    importState,
    downloadJson,
    readJsonFile
  };
})();
