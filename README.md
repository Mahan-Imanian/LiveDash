# LiveDash v8

LiveDash is a Manifest V3 Chrome extension that replaces the new tab page with a local-first Personal Operations Command Center.

## What changed in v8

LiveDash v8 adapts Widgetify-style modular personalization without copying the consumer homepage model. Widgets are now treated as enterprise-grade modules inside saved views, templates, structured navigation, dashboard sections, and role-aware workflows.

## Extension surfaces

- New Tab dashboard: `newtab.html`
- Popup quick panel: `popup.html`
- Options page: `options.html`
- Background service worker: `background.js`
- Local persistence: `chrome.storage.local`
- Offline fallback: local state and local seed data

## Load unpacked in Chrome

1. Unzip the project.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Select Load unpacked.
5. Choose the unzipped LiveDash v8 folder.
6. Open a new tab.

## Useful controls

- Cmd+K on macOS or Ctrl+K on Windows/Linux opens the command palette.
- Escape closes overlays.
- Edit mode reveals module controls.
- Module Library adds modules by business category.
- Settings contains structured preferences, import/export, restore, and reset.

## Module Library categories

- Metrics
- Operations
- Tasks
- Notes
- Alerts
- Reports
- Integrations
- Team Activity
- Personal Productivity

Each module includes category, preview, size options, data-source requirement, freshness behavior, role relevance, permission requirement, and runtime state behavior.

## Local data

Data is stored locally in `chrome.storage.local` using schema version 8. Import/export is versioned and validated. Reset saves a restore point before replacing local state.

## Validation

Run:

```bash
npm run build
```

Package:

```bash
npm run package
```

The package script creates `updated-premium-project-v8.zip` one directory above the project folder.
