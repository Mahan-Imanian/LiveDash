# LiveDash v9

LiveDash is a Manifest V3 Chrome extension that replaces the new tab page with a restrained, local-first personal operations command center.

This version responds to the latest product critique by removing the landing-page-style hero, reducing chrome, making command search the primary action, collapsing the heavy sidebar into a rail, hiding module controls outside edit mode, and rebuilding the first viewport around useful operational state.

## Install locally

1. Unzip the package.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Enable Developer Mode.
5. Select **Load unpacked**.
6. Choose the unzipped LiveDash v9 folder.
7. Open a new tab.

## What v9 changes

- Compact command-first new tab shell.
- No oversized marketing hero.
- View mode is calm by default.
- Edit mode shows grid-constrained module controls, undo, redo, templates, and save.
- Sidebar reduced to a compact navigation rail.
- User-facing freshness now reads as local update state instead of implementation language.
- Widgetify-style personalization retained only for module library, add/remove, configuration, and low-friction daily-use mechanics.
- Final tone moved away from consumer homepage UI and toward Linear/Raycast/Datadog-style restraint.

## Core surfaces

- New tab dashboard: command bar, saved views, module grid, tasks, alerts, reports, notes, metrics, activity.
- Popup: quick command/search, focus timer, top tasks, quick note, dashboard/settings launch.
- Options: theme, density, default view, module defaults, import/export, restore point, reset, shortcuts, storage health.
- Background service worker: hourly local freshness check and critical-alert reminder entry.

## Shortcuts

- Cmd+K on macOS or Ctrl+K on Windows/Linux: command palette.
- Esc: close palette, drawers, and modals.
- Tab: keyboard navigation with visible focus rings.

## Data model

LiveDash stores data locally using the extension storage API with schema version 9. Import/export is validated, versioned, and creates restore points before destructive changes. The app is English-first, global, US/EU-friendly, offline-safe for local features, and avoids region-locked runtime services.

## Validation

Run:

```bash
npm run build
npm run package
```

The package script creates `updated-premium-project-v9.zip` one directory above the project folder.
