# LiveDash v12

LiveDash is a local-first Chrome extension that turns the New Tab page into a focused daily command center.

Version 11 removes the generated-dashboard feel and rebuilds the experience around command, capture, today’s work, browser context, and trustworthy local state.

## Install

1. Unzip the project.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Choose **Load unpacked**.
5. Select the unzipped LiveDash folder.
6. Open a new tab.

## Extension surfaces

- **New Tab**: daily command surface, work queue, capture inbox, context rail, alerts, reports, modules, settings.
- **Popup**: quick capture, capture current tab, add task, top work, open dashboard, open side panel.
- **Side Panel**: focused current-page workflow with page capture and task creation.
- **Options**: appearance, density, default view, shortcuts, backup, import, restore, reset.
- **Background service worker**: local freshness checks and stale source notices.

## Keyboard

- `Ctrl K` or `Cmd K`: open command palette.
- `Esc`: close command palette, drawers, and overlays.
- `C`: open capture command when not typing.
- `,`: open settings when not typing.

## Data model

LiveDash stores data in `chrome.storage.local` under schema version 11. Local storage fallback is kept for development contexts. Imports are validated. Reset creates a restore point.

## Validate

Run:

```bash
npm run build
npm run package
```

The build validates Manifest V3, required extension pages, CSP, local assets, no inline scripts, no remote scripts, English/global runtime files, JavaScript syntax, and package structure.

## Load test checklist

- New Tab opens `newtab.html`.
- Popup opens and saves a capture.
- Side panel opens and captures the active page.
- Options page saves preferences.
- Command palette opens with `Ctrl K`.
- Task completion persists after reload.
- Export/import/reset flows complete.
- No horizontal overflow at desktop, tablet, and mobile widths.
