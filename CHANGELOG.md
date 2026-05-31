# Changelog

## 11.0.0

- Removed the hero/landing-page layer from the new tab surface.
- Removed floating bottom navigation and duplicate module/template entry points.
- Rebuilt the New Tab as a three-zone extension-native surface: command header, today work column, context rail.
- Made command/search/capture the primary interface element.
- Replaced vague dashboard metrics with actionable work states: due today, blocked, capture inbox, stale sources.
- Added browser-context capture using `activeTab` and side panel workflows.
- Added `sidepanel.html` and `scripts/sidepanel.js`.
- Added top-priority, work queue, capture inbox, source freshness, alerts, reports, activity, and inspectable metric detail drawers.
- Added cleaner edit mode with fixed edit toolbar, grid guide overlay, module inspector, undo, redo, save, discard, template apply, resize, reorder, and remove.
- Hid module controls outside hover or edit mode.
- Rewrote copy to concrete user-actionable language.
- Reworked the visual system with restrained dark surfaces, reduced border intensity, smaller radius, semantic colors, and stricter spacing.
- Updated popup to focus on quick capture, current tab capture, top tasks, settings, dashboard, and side panel.
- Updated options page for appearance, density, default view, shortcuts, storage, backup, import, restore, and reset.
- Updated schema, storage, validation, package metadata, README, and final package name to v11.
- Preserved Manifest V3, local-first persistence, popup, options page, background worker, import/export, and reset.
