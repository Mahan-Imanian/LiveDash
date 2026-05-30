importScripts("scripts/default-state.js");

const D = globalThis.LiveDashDefaults;

function getState(){
  return new Promise((resolve) => {
    chrome.storage.local.get([D.STORAGE_KEY], (result) => resolve(D.mergeState(result[D.STORAGE_KEY])));
  });
}

function saveState(state){
  state.updatedAt = new Date().toISOString();
  return new Promise((resolve) => chrome.storage.local.set({ [D.STORAGE_KEY]: state }, resolve));
}

async function ensureState(reason){
  const result = await new Promise((resolve) => chrome.storage.local.get([D.STORAGE_KEY], resolve));
  if(!result[D.STORAGE_KEY]){
    const state = D.createDefaultState();
    state.activity.unshift({ id: D.uid("activity"), type: "system", title: "Extension installed", detail: reason || "LiveDash state initialized.", createdAt: new Date().toISOString() });
    await saveState(state);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  ensureState(details.reason || "installed");
  chrome.alarms.create("livedash-refresh", { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  ensureState("startup");
  chrome.alarms.create("livedash-refresh", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if(alarm.name !== "livedash-refresh") return;
  const state = await getState();
  const now = new Date();
  const blocked = state.tasks.filter((task) => task.status === "blocked").length;
  state.metrics = state.metrics.map((metric) => Object.assign({}, metric, { freshnessMin: Math.min(60, (metric.freshnessMin || 0) + 15) }));
  state.activity.unshift({ id: D.uid("activity"), type: "system", title: "Scheduled refresh completed", detail: "Freshness metadata updated by the background service worker.", createdAt: now.toISOString() });
  if(blocked > 0 && state.settings.showSignals){
    state.notifications.unshift({ id: D.uid("notice"), title: "Blocked work needs review", body: `${blocked} task${blocked === 1 ? " is" : "s are"} blocked.`, severity: "warning", read: false, createdAt: now.toISOString() });
  }
  state.activity = state.activity.slice(0, 120);
  state.notifications = state.notifications.slice(0, 80);
  await saveState(state);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(!message || message.type !== "LIVEDASH_PING") return false;
  sendResponse({ ok: true, version: D.VERSION });
  return true;
});
