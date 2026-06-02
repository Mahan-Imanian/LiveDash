(function () {
  const root = document.getElementById('options');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  let state;

  async function save() { state = await window.LiveDashStore.setState(state); }

  function render() {
    root.innerHTML = `<section class="options-card"><div class="popup-header"><div><div class="side-title">LiveDash Settings</div><div class="card-subtitle">Personalized new tab dashboard · Manifest V3</div></div><span class="brand-mark">L</span></div></section>
      <section class="options-card"><div class="card-title">Appearance</div>
        <div class="option-row"><div><strong>Theme</strong><div class="card-subtitle">Choose your dashboard background.</div></div><select id="theme" class="form-input"><option value="sky">Sky</option><option value="mist">Mist</option><option value="pearl">Pearl</option><option value="sunset">Sunset</option><option value="forest">Forest</option></select></div>
        <div class="option-row"><div><strong>Density</strong><div class="card-subtitle">Controls spacing and widget comfort.</div></div><select id="density" class="form-input"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div>
        <div class="option-row"><div><strong>Time format</strong><div class="card-subtitle">Choose 12-hour or 24-hour time.</div></div><select id="timeFormat" class="form-input"><option value="12h">12-hour</option><option value="24h">24-hour</option></select></div>
      </section>
      <section class="options-card"><div class="card-title">Search and widgets</div>
        <div class="option-row"><div><strong>Default search</strong><div class="card-subtitle">Used by the central search bar.</div></div><select id="searchEngine" class="form-input"><option value="google">Google</option><option value="bing">Bing</option><option value="duckduckgo">DuckDuckGo</option></select></div>
        <div class="option-row"><div><strong>Home route</strong><div class="card-subtitle">Default visible new-tab surface.</div></div><select id="route" class="form-input"><option value="home">Widgets</option><option value="apps">Apps</option><option value="explore">Explore</option></select></div>
      </section>
      <section class="options-card"><div class="card-title">Data management</div>
        <div class="quick-actions"><button class="primary-button" data-action="export" type="button">Export backup</button><label class="secondary-button" style="cursor:pointer"><input id="importFile" type="file" accept="application/json" style="display:none">Import backup</label><button class="secondary-button" data-action="reset" type="button">Reset</button></div>
        <div class="card-subtitle">Stored locally with chrome.storage.local. No remote scripts or external runtime dependency.</div>
      </section>
      <section class="options-card"><div class="card-title">Keyboard shortcuts</div>
        <div class="task-row"><div class="task-check">⌘</div><div><div class="task-title">Open command palette</div><div class="task-meta">Cmd/Ctrl + K from the new tab dashboard</div></div><span></span></div>
        <div class="task-row"><div class="task-check">⎋</div><div><div class="task-title">Close overlays</div><div class="task-meta">Escape closes command palette, modal, or drawer</div></div><span></span></div>
      </section>
      <section class="options-card"><div class="card-title">About</div><div class="card-subtitle">LiveDash 17.0.0 · English-first · global defaults · Widgetify-style personalization.</div></section>`;
    document.getElementById('theme').value = state.settings.theme || 'sky';
    document.getElementById('density').value = state.settings.density || 'comfortable';
    document.getElementById('timeFormat').value = state.profile.timeFormat || '12h';
    document.getElementById('searchEngine').value = state.settings.searchEngine || 'google';
    document.getElementById('route').value = state.settings.route || 'home';
  }

  async function exportBackup() {
    const backup = await window.LiveDashStore.exportState();
    window.LiveDashStore.downloadJson(`livedash-backup-${new Date().toISOString().slice(0,10)}.json`, backup);
  }

  async function importBackup(file) {
    try {
      const payload = await window.LiveDashStore.readJsonFile(file);
      state = await window.LiveDashStore.importState(payload);
      render();
    } catch (error) {
      alert(error.message || 'Import failed');
    }
  }

  root.addEventListener('change', async (event) => {
    const target = event.target;
    if (target.id === 'theme') state.settings.theme = target.value;
    if (target.id === 'density') state.settings.density = target.value;
    if (target.id === 'timeFormat') state.profile.timeFormat = target.value;
    if (target.id === 'searchEngine') state.settings.searchEngine = target.value;
    if (target.id === 'route') state.settings.route = target.value;
    if (target.id === 'importFile' && target.files && target.files[0]) await importBackup(target.files[0]);
    await save();
  });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'export') await exportBackup();
    if (button.dataset.action === 'reset' && confirm('Reset LiveDash data? Export a backup first if needed.')) {
      state = await window.LiveDashStore.resetState();
      render();
    }
  });

  async function boot() {
    state = await window.LiveDashStore.getState();
    render();
  }

  boot().catch((error) => {
    root.innerHTML = `<section class="options-card"><div class="side-title">Settings could not load</div><p>${escapeHtml(error.message)}</p></section>`;
  });
})();
