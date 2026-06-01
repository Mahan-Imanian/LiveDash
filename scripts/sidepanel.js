(function () {
  const root = document.getElementById('sidepanel');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let state;
  let currentTab;

  async function save() { state = await window.LiveDashStore.setState(state); }

  async function getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs && tabs[0] ? tabs[0] : null;
    } catch (error) {
      return null;
    }
  }

  async function capture(kind) {
    const title = currentTab?.title || 'Current page';
    const url = currentTab?.url || '';
    if (kind === 'task') {
      state.tasks = [{ id: uid('task'), title: `Review ${title}`, status: 'open', priority: 'medium', due: new Date().toISOString(), source: url || 'Side panel' }, ...(state.tasks || [])];
    } else {
      state.captures = [{ id: uid('capture'), title, url, createdAt: new Date().toISOString() }, ...(state.captures || [])].slice(0, 30);
      state.notes = [{ id: uid('note'), title, body: url || title, tag: 'page', createdAt: new Date().toISOString() }, ...(state.notes || [])];
    }
    state.activity = [{ id: uid('activity'), title: kind === 'task' ? 'Task from page' : 'Page captured', body: title, createdAt: new Date().toISOString() }, ...(state.activity || [])].slice(0, 30);
    await save();
    render();
  }

  function render() {
    const captures = (state.captures || []).slice(0, 6);
    const tasks = (state.tasks || []).filter((task) => task.status !== 'done').slice(0, 4);
    root.innerHTML = `<section class="side-card"><div class="side-title">LiveDash</div><div class="card-subtitle">Page context and quick capture</div></section>
      <section class="side-card"><div class="card-title-row"><div class="card-title">🌐 Current page</div></div><div class="task-row"><div class="task-check">⌁</div><div><div class="task-title">${escapeHtml(currentTab?.title || 'No page available')}</div><div class="task-meta">${escapeHtml(currentTab?.url || 'Open the panel on a normal browser page.')}</div></div><span></span></div><div class="quick-actions" style="margin-top:10px"><button class="primary-button" data-action="capture" type="button">Save page</button><button class="secondary-button" data-action="task" type="button">Task from page</button></div></section>
      <section class="side-card"><div class="card-title">☑ Open work</div><div class="task-list">${tasks.map((task) => `<div class="task-row"><div class="task-check">□</div><div><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta">${escapeHtml(task.source || 'Local')}</div></div><span></span></div>`).join('') || `<div class="empty-state"><div class="empty-icon">✓</div><div>No open work.</div></div>`}</div></section>
      <section class="side-card"><div class="card-title">🧾 Recent captures</div><div class="task-list">${captures.map((item) => `<div class="task-row"><div class="task-check">↗</div><div><div class="task-title">${escapeHtml(item.title)}</div><div class="task-meta">${escapeHtml(item.url || '')}</div></div><span></span></div>`).join('') || `<div class="empty-state"><div class="empty-icon">＋</div><div>Capture pages here.</div></div>`}</div></section>`;
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'capture') await capture('note');
    if (button.dataset.action === 'task') await capture('task');
  });

  async function boot() {
    state = await window.LiveDashStore.getState();
    currentTab = await getCurrentTab();
    render();
  }

  boot();
})();
