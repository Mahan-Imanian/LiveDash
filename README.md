# LiveDash

LiveDash is a Manifest V3 Chrome extension that transforms the new tab into an interactive, engaging, personalized dashboard.

This build is intentionally close to the Widgetify-style reference: light blue atmosphere, rounded white panels, category tabs, app launcher grids, widget cards, bottom dock, account modal, settings drawer, quick bookmarks, clock, calendar, currency, Pomodoro, tasks, notes, popup actions, and side-panel page capture.

## Install locally

1. Unzip the project.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select the unzipped project folder.
6. Open a new tab.

## Included extension surfaces

- `newtab.html` — primary LiveDash dashboard.
- `popup.html` — quick capture, tab capture, task, note, and open dashboard actions.
- `sidepanel.html` — current page workflow and capture surface.
- `options.html` — theme, search, time format, import/export, reset, and shortcut settings.
- `background.js` — lightweight MV3 service worker.

## Features

- Widgetify-style top category navigation.
- App library tailored for US and European users.
- Daily essentials, public services, tools, Google services, AI, travel/finance, and social categories.
- Widget dashboard with clock, weather, search, bookmark slots, daily prompt, rates, Pomodoro, task list, calendar, notes, notifications, and world clocks.
- Local-first persistence using `chrome.storage.local` with localStorage fallback for development.
- Import/export backup.
- Safe reset.
- Cmd/Ctrl+K command palette.
- Popup and side panel workflows.

## Validation

Run:

```bash
npm run build
npm run package
```

The package command produces:

`/mnt/data/updated-premium-project-v12-widgetify.zip`
