importScripts("scripts/default-state.js", "scripts/storage.js");

chrome.runtime.onInstalled.addListener(async (details) => {
  const state = await LiveDashStorage.getState();
  await LiveDashStorage.updateState((draft) => {
    LiveDashStorage.appendActivity(draft, "extension", details.reason === "install" ? "LiveDash installed" : "LiveDash updated", `Reason: ${details.reason}`);
    LiveDashStorage.appendNotification(draft, "LiveDash ready", "Your new tab command center is installed and stored locally.", "success");
    return draft;
  });
  chrome.alarms.create("livedash:freshness", { periodInMinutes: 30 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("livedash:freshness", { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if(alarm.name !== "livedash:freshness") return;
  await LiveDashStorage.updateState((draft) => {
    draft.weather.updatedAt = new Date().toISOString();
    LiveDashStorage.appendActivity(draft, "system", "Freshness check", "Background freshness marker updated.");
    return draft;
  });
});
