chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    installedAt: new Date().toISOString(),
    product: 'LiveDash'
  };
  await chrome.storage.local.set({ livedash_runtime: defaults });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && tab && tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
