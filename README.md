# LiveDash

LiveDash is a Manifest V3 Chrome extension that replaces the Chrome New Tab page with a local-first personal operations command center.

## Install as an unpacked extension

1. Unzip the project.
2. Open `chrome://extensions` in Google Chrome.
3. Enable Developer Mode.
4. Select Load unpacked.
5. Choose the unzipped `LiveDash-v5` folder.
6. Open a new tab.

## Extension surfaces

- New Tab: full LiveDash dashboard with command bar, saved views, dashboard modules, metrics, tasks, notes, activity, notifications, import/export, and edit mode.
- Popup: quick status, top tasks, quick note, focus timer, search, settings, and dashboard launch.
- Options: theme, density, saved view, time range, time format, weather location label, import/export, reset, storage health, and shortcuts.
- Background service worker: initialization, scheduled freshness refresh, storage migration support, local notices.

## Keyboard

- Cmd+K on macOS: command palette.
- Ctrl+K on Windows/Linux: command palette.
- Escape: close palette, drawers, and dialogs.
- Tab: navigate controls with visible focus states.

## Persistence

LiveDash stores data in `chrome.storage.local`. In non-extension development contexts, the storage layer falls back to `localStorage`.

Stored data includes:

- Settings
- Saved view selection
- Filters
- Tasks
- Notes
- Metrics
- Commitments
- Quick links
- Weather fallback context
- Timezones
- Notifications
- Activity history
- Restore point after import/reset

## Import and export

Export creates a versioned JSON backup with schema metadata. Import validates the backup, preserves a pre-import restore point, and records the import in activity history.

## Reset

Reset restores the default v5 dashboard and saves the previous state as a restore point in local storage.

## Validation

Run:

```bash
npm run build
```

This validates JavaScript syntax, manifest structure, required extension files, CSP, local assets, and package integrity.

## Regional behavior

LiveDash is English-first and uses global defaults. It does not require Persian locale, RTL layout, Iran-specific services, Persian calendar defaults, remote scripts, or region-locked APIs. Weather is offline-safe by default and can be labeled for any global location.
