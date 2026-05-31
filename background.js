const STORAGE_KEY = "livedash:v9:state";

function now(){ return new Date().toISOString(); }
function getState(){
  return new Promise((resolve) => chrome.storage.local.get([STORAGE_KEY], (result) => resolve(result[STORAGE_KEY] || null)));
}
function setState(state){
  return new Promise((resolve) => chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve));
}
function appendActivity(state, type, title, detail){
  state.activity = Array.isArray(state.activity) ? state.activity : [];
  state.activity.unshift({ id: `activity-${Date.now()}`, type, title, detail: detail || "", createdAt: now() });
  state.activity = state.activity.slice(0, 200);
}
function appendNotification(state, title, body, severity){
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  state.notifications.unshift({ id: `notice-${Date.now()}`, title, body, severity: severity || "info", read: false, createdAt: now() });
  state.notifications = state.notifications.slice(0, 120);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("livedash-freshness", { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("livedash-freshness", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if(alarm.name !== "livedash-freshness") return;
  const state = await getState();
  if(!state) return;
  state.updatedAt = now();
  appendActivity(state, "refresh", "Scheduled freshness check", "Background service worker confirmed local dashboard freshness.");
  if(state.alerts && state.alerts.some((alert) => alert.status === "open" && alert.severity === "critical")) {
    appendNotification(state, "Critical alerts still open", "Open the LiveDash new tab dashboard to review unresolved signals.", "warning");
  }
  await setState(state);
});
