const STORAGE_KEY = "livedash:v10:state";
function now(){ return new Date().toISOString(); }
function getState(){ return new Promise((resolve) => chrome.storage.local.get([STORAGE_KEY], (result) => resolve(result[STORAGE_KEY] || null))); }
function setState(state){ return new Promise((resolve) => chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve)); }
function appendActivity(state, type, title, detail){
  state.activity = Array.isArray(state.activity) ? state.activity : [];
  state.activity.unshift({ id:`activity-${Date.now()}`, type, title, detail:detail || "", createdAt:now() });
  state.activity = state.activity.slice(0,200);
}
function appendNotification(state, title, body, severity){
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  state.notifications.unshift({ id:`notice-${Date.now()}`, title, body, severity:severity || "info", read:false, createdAt:now() });
  state.notifications = state.notifications.slice(0,120);
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("livedash-freshness", { periodInMinutes: 60 });
  if(chrome.sidePanel && chrome.sidePanel.setPanelBehavior){ chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick:false }); }
});
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("livedash-freshness", { periodInMinutes: 60 }));
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if(alarm.name !== "livedash-freshness") return;
  const state = await getState();
  if(!state) return;
  const staleReports = Array.isArray(state.reports) ? state.reports.filter((report) => report.status === "stale").length : 0;
  state.sources = Array.isArray(state.sources) ? state.sources : [];
  const storageSource = state.sources.find((source) => source.id === "storage");
  if(storageSource){ storageSource.updatedAt = now(); storageSource.state = "fresh"; }
  state.updatedAt = now();
  appendActivity(state, "refresh", "Local freshness check", staleReports ? `${staleReports} report source needs review.` : "All local sources are ready.");
  if(staleReports) appendNotification(state, "Report source needs review", `${staleReports} local report source is stale.`, "warning");
  await setState(state);
});
