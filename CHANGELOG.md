# Changelog

## 5.0.0

- Inspected the current LiveDash v4 extension and the Widgetify reference project.
- Kept the deployable vanilla Manifest V3 architecture instead of adding a heavy build pipeline.
- Rebuilt the visual system with a more restrained command-center interface inspired by the reference extension's new-tab launcher, quick widgets, settings modal patterns, and compact extension UX.
- Removed region-specific assumptions and kept all user-facing UI in English.
- Added global-default modules: Clock, Command Search, Weather Readiness, Global Timezones, Launchpad, Metrics, Trends, Distribution, Tasks, Notes, Signals, Schedule, and Activity.
- Added a quick command surface and floating quick-action dock to improve new-tab speed without copying the reference implementation.
- Improved saved views so Executive Overview, Personal Focus, Operations, Metrics, and Minimal have materially different layouts.
- Added popup quick search and settings access.
- Added options controls for time format and weather location label.
- Updated storage schema to v5 with safe migration from v4 and older local keys.
- Updated import/export filenames and reset copy to v5.
- Reworked CSS tokens, surfaces, focus states, responsive grids, card hierarchy, and motion.
- Preserved Manifest V3 new tab override, popup, options page, background worker, local persistence, import/export, reset, activity feed, and notification center.
