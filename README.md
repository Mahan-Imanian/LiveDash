# LiveDash v6

LiveDash is a Manifest V3 Chrome extension that replaces the Chrome New Tab page with an English-first personal operations command center.

## Install locally

1. Unzip the project.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Select **Load unpacked**.
5. Choose the `LiveDash-v6` folder.
6. Open a new tab.

## Extension surfaces

- New Tab: primary dashboard, launcher, saved views, command palette, tasks, notes, metrics, schedule, signals, activity, and edit mode.
- Popup: quick search, top tasks, focus timer, quick note, dashboard launch, and settings shortcut.
- Options: theme, density, background, default view, time range, time format, weather label, storage health, import, export, reset, and keyboard reference.
- Background service worker: initializes storage, keeps scheduled freshness metadata, and records local system activity.

## Core shortcuts

- Cmd+K on macOS opens the command palette.
- Ctrl+K on Windows and Linux opens the command palette.
- `/` in the search hub routes into commands.
- Escape closes overlays.

## Data model

LiveDash stores local extension data in `chrome.storage.local` under schema v6. It migrates previous v5, v4, and older local keys through the storage abstraction. Import/export uses a versioned backup format with validation and restore-point protection before destructive imports or resets.

## Global defaults

The product uses English copy, locale-aware dates and times, US and European example timezones, global links, system-safe fonts, and offline-safe local fallbacks. It does not depend on Persian localization, RTL layout, Iran-specific services, region-locked APIs, remote scripts, or hosted pages.

## Validation

Run:

```bash
npm run build
```

Package:

```bash
npm run package
```

The package command creates `updated-premium-project-v6.zip` one directory above the project root.
