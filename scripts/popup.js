(function () {
  const root = document.getElementById('popup');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let state;

  async function save() { state = await window.LiveDashStore.setState(state); }

  async function getCurrentTab() {
    try {
      if (!chrome?.tabs?.query) return null;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs && tabs[0] ? tabs[0] : null;
    } catch (error) {
      return null;
    }
  }

  async function captureTab(asTask = false) {
    const tab = await getCurrentTab();
    const title = tab?.title || 'Captured page';
    const url = tab?.url || '';
    if (asTask) {
      state.tasks = [{ id: uid('task'), title: `Review ${title}`, status: 'open', priority: 'medium', due: new Date().toISOString(), source: url || 'Browser' }, ...(state.tasks || [])];
    } else {
      state.captures = [{ id: uid('capture'), title, url, createdAt: new Date().toISOString() }, ...(state.captures || [])].slice(0, 30);
      state.notes = [{ id: uid('note'), title, body: url || title, tag: 'capture', createdAt: new Date().toISOString() }, ...(state.notes || [])];
    }
    state.activity = [{ id: uid('activity'), title: asTask ? 'Task from tab' : 'Page captured', body: title, createdAt: new Date().toISOString() }, ...(state.activity || [])].slice(0, 30);
    await save();
    render();
  }

  async function addTask() {
    const input = document.getElementById('popupTask');
    const title = input.value.trim() || 'New task';
    state.tasks = [{ id: uid('task'), title, status: 'open', priority: 'medium', due: new Date().toISOString(), source: 'Popup' }, ...(state.tasks || [])];
    input.value = '';
    await save();
    render();
  }

  async function addNote() {
    const input = document.getElementById('popupNote');
    const body = input.value.trim() || 'Quick note';
    state.notes = [{ id: uid('note'), title: body.slice(0, 50), body, tag: 'popup', createdAt: new Date().toISOString() }, ...(state.notes || [])];
    input.value = '';
    await save();
    render();
  }

  async function openDashboard() {
    const url = chrome.runtime.getURL('newtab.html');
    if (chrome?.tabs?.create) await chrome.tabs.create({ url });
  }

  async function openSidePanel() {
    try {
      if (chrome?.sidePanel?.open) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch (error) {
      await openDashboard();
    }
  }

  function render() {
    const tasks = (state.tasks || []).filter((task) => task.status !== 'done').slice(0, 3);
    const unread = (state.notifications || []).filter((notice) => !notice.read).length;
    root.innerHTML = `<section class="popup-card">
      <div class="popup-header"><div><div class="popup-title">LiveDash</div><div class="card-subtitle">Quick actions · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div><span class="brand-mark" style="width:42px;height:42px;border-radius:14px;font-size:20px">L</span></div>
    </section>
    <section class="popup-card">
      <div class="card-title-row"><div class="card-title">⚡ Current page</div><span class="badge">${unread} alerts</span></div>
      <div class="quick-actions"><button class="primary-button" data-action="capture-tab" type="button">Save tab</button><button class="secondary-button" data-action="task-tab" type="button">Task from tab</button></div>
    </section>
    <section class="popup-card">
      <div class="card-title">☑ Top tasks</div>
      <div class="task-list">${tasks.length ? tasks.map((task) => `<div class="task-row"><div class="task-check">□</div><div><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta">${escapeHtml(task.priority)} · ${escapeHtml(task.source)}</div></div><span></span></div>`).join('') : `<div class="empty-state"><div class="empty-icon">✓</div><div>No open tasks.</div></div>`}</div>
      <div class="task-input-row"><button class="primary-button" data-action="add-task" type="button">＋</button><input id="popupTask" placeholder="Add task..." aria-label="Add task"></div>
    </section>
    <section class="popup-card">
      <div class="card-title">📝 Quick note</div>
      <input id="popupNote" class="form-input" placeholder="Write a note..." aria-label="Quick note">
      <div class="quick-actions" style="margin-top:10px"><button class="secondary-button" data-action="add-note" type="button">Save note</button><button class="secondary-button" data-action="open-sidepanel" type="button">Side panel</button></div>
    </section>
    <section class="popup-card"><div class="quick-actions"><button class="primary-button" data-action="open-dashboard" type="button">Open dashboard</button><button class="secondary-button" data-action="open-options" type="button">Settings</button></div></section>`;
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'capture-tab') await captureTab(false);
    if (action === 'task-tab') await captureTab(true);
    if (action === 'add-task') await addTask();
    if (action === 'add-note') await addNote();
    if (action === 'open-dashboard') await openDashboard();
    if (action === 'open-sidepanel') await openSidePanel();
    if (action === 'open-options' && chrome?.runtime?.openOptionsPage) await chrome.runtime.openOptionsPage();
  });

  async function boot() {
    state = await window.LiveDashStore.getState();
    render();
  }

  boot();
})();
