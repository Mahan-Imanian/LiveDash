# LiveDash v7

LiveDash is a Manifest V3 Chrome extension that replaces the Chrome New Tab page with a personal operations command center.

## Install locally

1. Unzip `LiveDash-v7.zip`.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer Mode.
4. Select **Load unpacked**.
5. Choose the unzipped `LiveDash-v7` folder.
6. Open a new tab.

## Extension surfaces

- New Tab: main LiveDash dashboard with search, bookmarks, widgets, tasks, notes, focus, metrics, activity, and settings.
- Popup: compact quick panel for search, focus, top tasks, quick note, dashboard launch, and settings.
- Options: appearance, dashboard preferences, import/export, reset, restore, shortcuts, and storage health.
- Background service worker: storage initialization, update/startup activity, alarm-based freshness marker.

## Core features

- Widgetify-style new tab layout with central search, bookmark grid, side widgets, and bottom dock.
- English-first global defaults for US and Europe.
- Chrome bookmarks import using the `bookmarks` permission.
- Local-first persistence through `chrome.storage.local`.
- Safe migration from earlier LiveDash storage keys.
- Versioned import and export backups.
- Safe reset with restore point.
- Command palette with Cmd+K or Ctrl+K.
- Focus timer, priority task table, notes, metrics, charts, agenda, world clocks, weather fallback, signals, and activity trail.
- No remote scripts, no CDN runtime dependency, no inline scripts, no Persian or Iran-specific runtime assumptions.

## Validation

Run:

```bash
npm run build
npm run package
```

`npm run build` validates Manifest V3 structure, script syntax, CSP safety, required files, asset paths, and language/regional cleanup.

## Permissions

- `storage`: persists dashboard data locally.
- `alarms`: updates freshness markers.
- `bookmarks`: imports browser bookmarks into the launcher when requested by the user.
