# Changelog

## 2.0.0

A ground-up rebuild. LiveDash is now a local-first, keyboard-first new tab focused on one loop: open a tab, see what's next, act, get back to work.

### Removed

- The account system: Google sign-in, email/phone/OTP login, profile, avatar, referrals, friends and friend requests. Nothing needs an account any more.
- LiveCoin, the store, missions and rewards, and the focus leaderboard.
- Virtual pets, mood log, network/IP lookup, YouTube stats, prayer times and daily zikr, currency and crypto rates, RSS news, translator, image and voice search, trending searches, and the Explorer site directory.
- Hardcoded crypto prices that were shown as live data whenever the API failed.
- Google Analytics, including a measurement secret shipped in the bundle and an opt-out switch that did not work.
- The dependency on `livedash.codersays.com` (most endpoints returned 404).
- Remote Google Fonts, the Workbox service-worker cache, Firefox build leftovers, Docker files, both lockfiles (one of which pointed at a private registry and could not be installed), Tailwind, daisyUI, moment and about 30 other dependencies.
- Region-specific defaults (Tehran time-zone handling, `region=IR`, Persian translator default, Saturday weekend, Iranian football-club theme).
- All Widgetify-era code, names, themes, assets and issue templates.
- Host permissions for google.com, accounts.google.com, googleapis.com and google-analytics.com; the `identity` and optional `tabs`/`tabGroups` permissions.

### Rebuilt

- **Storage.** One local store with separate keys for tasks, notes, shortcuts, focus state and UI state, plus settings in Chrome sync storage. Open tabs stay in sync live. No code path clears user data except the explicit **Erase everything** action.
- **Tasks.** Work offline with no account. Natural-language dates (“Friday 5pm”, “in 2 hours”, “oct 12”, “next week”), overdue / today / upcoming / no-date groups, inline editing, drag and keyboard reordering, completion animation, and undo for complete, delete and clear.
- **Shortcuts.** Real links (middle-click, Ctrl-click and hover URL all work), most-visited suggestions, letter or uploaded icons, keyboard navigation, keys 1–9, and undo on unpin. No more empty placeholder grid.
- **Notes.** Autosave as you type, first line as title, undo on delete.
- **Focus timer.** Starts immediately, keeps correct time across tab closes and browser restarts, counts sessions, suggests the next break, and shows minutes left on the toolbar badge. Notifications are opt-in and requested only when you turn them on.
- **Design.** A new token-based design system (type scale, 4-pt spacing, three radii, two elevations, one icon set, one motion curve), light, dark and system themes with five accents, no theme flash on load, and a new mark and icon.
- **Accessibility.** Every control has an accessible name. Dialogs use the native modal `<dialog>`. Lists and grids use roving focus, focus is visible everywhere, motion respects reduced-motion, and every text/background pair meets WCAG AA contrast.
- **Build.** Minified production bundle (about 100 KB of gzipped JavaScript, down from 3.7 MB unminified), a single npm lockfile from the public registry, CI that type-checks, lints, tests and builds a zip, and no source maps in the package.

### Added

- Command bar (<kbd>/</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd>) that adds tasks and notes, opens sites, searches the web, finds shortcuts, tasks, notes and bookmarks, and runs commands. It previews how a date will be read before you commit.
- Quick capture from any page (<kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>L</kbd>) with “Pin this page” and “Save this page as a note”.
- Right-click actions: add selected text as a task, pin a page or link.
- Optional calendar (any iCal link) with the next event under the clock and today's agenda above your tasks.
- Optional weather from Open-Meteo, showing when it was last updated and offering a retry when unavailable.
- Export, import and erase in Settings.
- One-time migration of tasks, notes and bookmarks from LiveDash 1.x.
- Privacy policy, third-party notices and unit tests for date parsing, iCal parsing, fuzzy matching and URL handling.
