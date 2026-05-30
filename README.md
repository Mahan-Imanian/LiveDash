# LiveDash v4

LiveDash v4 is a Manifest V3 Chrome extension that turns the Chrome new tab page into a local-first personal operations command center.

## Install in Chrome

1. Unzip `LiveDash.zip`.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Choose **Load unpacked**.
5. Select the `LiveDash-v4` folder.
6. Open a new tab.

## Extension surfaces

- `newtab.html`: main LiveDash dashboard through `chrome_url_overrides.newtab`.
- `popup.html`: compact quick panel for current status, top tasks, focus timer, and quick notes.
- `options.html`: structured preferences, import/export, reset, data health, and shortcuts.
- `background.js`: Manifest V3 service worker for install migration, startup initialization, alarms, freshness updates, and local notices.

## Data storage

LiveDash stores dashboard state in `chrome.storage.local` using schema version 4. A fallback storage path exists for local file testing outside Chrome. Import validates backup shape and saves a restore point before replacing dashboard data. Reset saves a restore point before restoring defaults.

## Keyboard

- Cmd+K on macOS opens the command palette.
- Ctrl+K on Windows/Linux opens the command palette.
- Escape closes dialogs, drawers, and the command palette.
- Tab navigation uses visible focus rings.

## Validation

Run static validation locally with:

```bash
npm run build
```

This checks JavaScript syntax and validates the extension manifest, required files, icons, CSP, and forbidden placeholder markers.
