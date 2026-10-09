# Changelog

## Unreleased

### Fixed

- Impossible dates and times such as `2026-02-31` or `25:00` were rejected instead of rolling over.
- Relative dates and repeating tasks kept the right day across daylight-saving changes and short months.
- Repeating tasks saved from the right-click menu kept their repeat.
- Calendar import expanded monthly `BYDAY` and `BYMONTHDAY` rules and skipped invalid values and unsupported rules.
- Search kept pages that differ only in query string, such as YouTube videos, as separate results.
- Accent colours and favicon inversion applied to the Night paper tone in the light theme.
- Calendar and Wikipedia requests timed out after 10 seconds.
- Backup import skipped invalid items one by one and reported files that are not backups.

### Changed

- Documented the ranking constants in [docs/ranking.md](docs/ranking.md) and added tests for the orderings they produce.
- Added a contrast test for every theme, paper tone and accent.
- Removed unused and duplicated code.

## 2.2.0

Redesigned the new tab, the quick-capture popup and all panels. Features, keys, permissions and network behaviour did not change.

### Changed

- The masthead showed the date, a clock and the next meeting with a countdown and Join button.
- Restyled search results, shortcut keys, columns and panels.
- Dark mode got its own palette.
- Bundled interface and monospace fonts.
- Added a load animation, off when the system requests reduced motion.
- Shaded picture backgrounds to keep text readable.

## 2.1.0

Replaced the 2.0 launcher with a page laid out like a newspaper front page. It restored what Chrome's own new tab offers (visible shortcuts, a search box, a background, customization) and kept 2.0's combined search, recently closed pages, tasks and meetings.

### Added

- Grouped search results with actions for each result.
- A choice of search engine and editable site keywords such as `yt` and `w`.
- Shortcut groups, drag to reorder, custom icons, opening a group as a tab group, and import of most visited sites.
- Pick up, Today and Notes columns, and Bookmarks and Notes drawers.
- Repeating tasks (daily, weekdays, weekly, monthly, yearly).
- Optional weather, picture of the day or your own photo as background, and paper tones.
- Customize panel, full-screen focus mode and sectioned Settings.

### Fixed

- White or black favicons stayed visible on every theme.
- Untitled history entries showed the site name.
- Keyboard focus in drawers and group tabs.
- Screens 2000 px and wider scaled the page.
- Weather requests timed out after 10 seconds.

### Removed

- The numbered places list, the separate Later page and lucide-react.

## 2.0.0

Replaced the 1.x widget dashboard with a launcher ranked from local history.

### Added

- A search prompt with up to nine ranked destinations.
- Switching to an open tab instead of opening a duplicate, and closing duplicate tabs with undo.
- Recently closed tabs and windows, a Later list, quick capture with <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>L</kbd>, and right-click save and pin.
- iCal calendar support with meeting links, and a focus timer.
- One-time migration of tasks, notes and bookmarks from 1.x.
- CI, a privacy policy and third-party notices.

### Changed

- History, tabs, sessions, bookmarks and notifications became optional permissions, requested when a feature needs them.
- No network requests unless you search or add a calendar.

### Removed

- Accounts, the LiveCoin store, social features and all widgets unrelated to navigation, including crypto and currency rates that showed hardcoded prices as live.
- Tailwind, daisyUI, moment, about 30 other dependencies, and a dependency on an API that returned 404s.
- Region-specific defaults and the remaining 1.x code and assets.

### Security

- Removed Google Analytics, which shipped a secret in the bundle and ignored its opt-out.
