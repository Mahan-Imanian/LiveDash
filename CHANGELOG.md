# Changelog

## Unreleased

### Fixed

- Dates: `2026-02-31`, `feb 30`, `25:00`, `13pm` and other out-of-range dates and times are no longer accepted (`2026-02-31` used to become March 3). Rejected text stays in the task title. A month-name date without a year moves to the next year in which it exists, so `feb 29` finds the next leap year.
- Dates: `in N days` and `in N weeks` count calendar days, and a time with no date rolls to the next calendar day, so neither skips or repeats a day around a daylight-saving change. `in N hours` keeps the time even when it is 24 hours or more.
- Repeating tasks: a monthly task on the 31st returns to the 31st after a short month, and a yearly task on Feb 29 returns in leap years. Previously the clamped day (28th, 30th) became permanent.
- Repeating tasks saved with "Save selection for later" from the context menu now keep their repeat.
- Calendar: out-of-range DATE and DATE-TIME values are skipped instead of rolling over. Summaries containing a double quote are no longer dropped. Monthly and yearly rules skip months that lack the start day, as RFC 5545 specifies, instead of moving to the next month. Monthly rules with `BYDAY` (such as `2TU` or `-1FR`) and `BYMONTHDAY` are expanded. Rules with parts that are not implemented, and malformed `INTERVAL` or `COUNT` values, show the first occurrence only; `INTERVAL=x` used to produce thousands of invalid entries.
- Search: history pages that differ only in their query string (YouTube videos, forum threads) are kept as separate results. They used to merge into one entry. Tracking parameters such as `utm_*` and `fbclid` are still ignored.
- Night paper: the accent choice and the white-favicon inversion now apply when the theme is light or follows a light system setting. Every accent used to render as ember there.
- Calendar and Wikipedia requests time out after 10 seconds, as weather requests already did.
- Import: a backup with an invalid item skips that item instead of all items of its kind; tasks are checked for the fields the page needs; undo also removes imported groups; a file containing `null` shows the "not a backup" message instead of failing silently.
- The accent swatches in Customize use the same colours as the theme.

### Changed

- Ranking constants have names and units and are documented in [docs/ranking.md](docs/ranking.md), including how they were chosen. Tests in `tests/rank.test.ts` pin the orderings they are meant to produce.
- `tests/contrast.test.ts` computes WCAG contrast for every theme, paper tone and accent from `src/styles/tokens.css`.
- Removed unused code (`toggleTask`, `Kbd`, an unused typed-visit parameter in ranking) and duplicated task construction, settings merging and permission calls.

## 2.2.0

Visual redesign of the new tab, the quick-capture popup and every panel. Features, keys, permissions and network behaviour did not change.

### Changed

- **Masthead.** The date became the page headline, set in Newsreader, with a live clock under it. The next meeting sits beside it with a countdown, its time range, the Join button and the meeting after it. With no meeting it shows how many tasks are due, or a link to connect a calendar. A line above shows the time-of-day name (morning, afternoon, evening or late) and the week number.
- **Search.** Larger serif input whose underline takes the accent colour on focus. Result groups have labelled rules, URLs use a monospace face, and the selected row shows its action and key. The hint on the right changes from <kbd>/</kbd> to <kbd>></kbd> while the box has focus.
- **Shortcut keys** are drawn as keycaps with a raised edge, hover and press states, a drag grip and an insertion mark while dragging. Labels have more room.
- **Columns** are separated by a double rule with serif headings. Agenda times use a monospace face.
- **Dark mode** has its own blue-black palette with ivory text instead of a darkened copy of the light theme. Light themes have a fine paper grain.
- **Type.** Schibsted Grotesk for interface text and IBM Plex Mono for addresses, times and keys, both bundled. Newsreader uses its optical-size axis.
- **Panels.** Drawers, Settings, Customize, Tasks, Notes, Bookmarks, the shortcut editor, menus, toasts, the weather forecast, focus mode and the popup share headings, rules and controls. The forecast draws each day's range on a shared scale.
- **Motion.** On load, rules draw in, then the headline, keys and columns appear in sequence. All of it is off when the system requests reduced motion.
- **Picture backgrounds** have a top and bottom shade to keep text readable on busy photos.

### Checks

Layout was checked by hand in Chrome at 560, 900, 1280 and 1440 px wide, light and dark, with a fresh profile, a profile with history, and the picture of the day. There are no automated layout tests.

These notes originally said text meets WCAG AA "on every tone and accent in both themes (lowest 4.86:1)". No record of that measurement exists. `tests/contrast.test.ts` now computes the ratios from the colour tokens; see the README for its scope and current result.

## 2.1.0

Replaced the 2.0 launcher with a newspaper-style page layout. 2.0 had dropped things Chrome's own new tab provides (visible shortcuts, a search box, a background, customization); 2.1 brought those back and kept the 2.0 additions: one search box over tabs, history and bookmarks, plus columns for recently closed pages and the day's tasks and meetings. Search and shortcuts are visible on load; columns and panels open with one key; commands and keyboard control are available; weather, wallpaper and focus are off until turned on.

### Added

- **Layout.** Serif masthead and search (Newsreader, bundled), a paper-and-ink palette, hairline column rules instead of cards, and drawers built on native `<dialog>`.
- **Search results replace the page.** Typing hides everything below the search line behind a results list grouped as top hit, open tabs, shortcuts, history, bookmarks, other devices, tasks, notes and commands. <kbd>→</kbd> or right-click shows each result's actions.
- **Search engine choice:** Chrome default, Google, DuckDuckGo, Bing, Brave Search, Kagi, Ecosia, Startpage or a custom address. Site keywords such as `yt`, `w`, `gh`, `maps` and `tr` are editable in Settings.
- **Shortcut keys with groups.** Group tabs (rename, delete, open as a Chrome tab group), drag to reorder or onto a group, custom icons (site, coloured letter or uploaded image), context menus and keyboard editing. First run offers to import Chrome's most visited sites. History-based suggestions fill empty slots and can be dismissed one by one.
- **Pick up.** Recently closed tabs and windows, pages open on other devices, and the last 24 hours of history without search results, sign-in flows and error pages.
- **Today.** The next meeting with Join, then due, upcoming and undated tasks, plus quick add with natural-language dates.
- **Repeating tasks:** "every day", "weekdays", "every week", "every month on the 1st" and "every year". Completing one moves it to the next date, with undo. Month-end dates are clamped. Day-of-month phrases such as "on the 1st" are parsed. Lead-ins such as "Remind me to" are removed from titles.
- **Notes column** with pinned notes, and a notes drawer with search.
- **Bookmarks drawer** with folders, breadcrumbs and search. The bookmarks bar opens flattened, as in Chrome's side panel.
- **Weather:** city search or "use my location", current conditions, 12-hour and 5-day forecast, last-updated time, refresh and an offline state. Data comes from Open-Meteo; network access is requested when weather is turned on.
- **Backgrounds:** six paper tones, Wikipedia's picture of the day (landscape only, credited with author and license) or your own photo, with a dim control. In photo mode, text and accent colours switch to light values.
- **Customize panel:** theme, accent, background, density, serif or sans headlines, a switch for each column, clock and date format, and weather.
- **Focus mode** (full screen) with 15, 25, 50 and 90-minute presets, breaks, an intent line and keyboard control.
- **Settings** split into sections: Search, Browser access, Calendar, Focus, Keyboard, Data & privacy and About.

### Fixed

- Favicons that are pure white or pure black are inverted when they would disappear against the theme.
- Untitled history entries show the site name instead of a raw address.
- Drawers focus their main field on open, and group tabs are a single tab stop with arrow-key navigation.
- Screens 2000 px and wider scale the whole page instead of showing a small centred column.
- Weather requests time out after 10 seconds. (Calendar and Wikipedia requests did not until the Unreleased fixes above.)
- The keyboard reference lists only keys that work. Chrome reserves Ctrl+K.

### Checks

Checked by hand in Chrome at 1024, 1280, 1440, 1600, 1920 and 2560 px, at 125% and 200% zoom, light and dark, with every background, on a fresh profile and on one with history, and with the keyboard only.

On 2026-10-04 a scripted Chrome session on the author's Windows 11 machine recorded first contentful paint of 84 and 88 ms on two warm reloads and 240 ms on the first load, and a lowest contrast of 4.91:1 across eight sampled text styles on each paper tone. These were one-off measurements, not repeated since, and that palette was replaced in 2.2.0.

### Removed

- The 2.0 numbered "places" list and the separate Later page. Shortcuts, Pick up, Today and the Tasks drawer cover them.
- lucide-react.

## 2.0.0

Replaced the 1.x widget dashboard with a launcher: one prompt that searches history, open tabs and bookmarks, and a list of the places you are most likely to open next, ranked from your own history.

### Added

- **Go.** A prompt with up to nine likely destinations below it, numbered 1–9, ranked by visit frequency, recency, hour of day and what you previously picked from LiveDash for the letters typed. Pinned entries keep their numbers.
- **Switch instead of duplicate.** Opening a page that is already open switches to that tab and closes the new one. Duplicate tabs are detected and closed with undo.
- **Pick up.** Recently closed tabs and windows, reopened with one key.
- **Typed input.** Addresses open, other text searches with the default engine, text with a date ("dentist thursday 9am") is saved for later, `>` lists commands, and <kbd>→</kbd> shows actions for any row (open in new tab, pin, save for later, copy link, never suggest).
- **Later.** Pages, tasks and notes to come back to, grouped by due date, with inline editing, reordering and undo.
- **Status line** with the next meeting and its join link, and a running focus timer, shown only when they apply.
- **Quick capture** on any page with Alt+Shift+L, and right-click "Save page for later" / "Pin to LiveDash".
- **Keyboard focus.** LiveDash takes focus from the address bar on new tabs (can be turned off).

### Removed

- Everything from 1.x that was not about getting somewhere: accounts and sign-in, LiveCoin and the store, missions, referrals, friends, leaderboard, pets, mood log, IP lookup, YouTube stats, prayer times, crypto and currency rates (including hardcoded prices shown as live), RSS, translator, image and voice search, Explorer directory, wallpapers and themes for sale.
- Google Analytics (including a secret shipped in the bundle and an opt-out that did nothing) and the dependency on an API that returned 404s.
- The widget grid, clock hero, weather, shortcut tiles and cards. The icon library, Tailwind, daisyUI, moment and about 30 other dependencies.
- Region-specific defaults and all remaining 1.x code, names, assets and templates.

### Internals

- Local store with live sync between open tabs. The only code path that erases user data is the confirmed "Erase everything" action.
- Ranking (`src/lib/rank.ts`), natural-language dates (`src/lib/when.ts`) and iCal parsing with recurrence and meeting-link detection (`src/lib/ics.ts`), with unit tests.
- Minimal required permissions; history, tabs, sessions, bookmarks and notifications are optional and requested when a feature needs them.
- One set of design tokens: system sans for content, monospace for keys and metadata, a single accent, line-numbered rows, no cards, and a custom glyph set.
- No network requests unless you search or add a calendar; no background work unless a focus session is running.
- One-time migration of tasks, notes and bookmarks from 1.x.
- Reproducible build from the public npm registry, CI, privacy policy and third-party notices.
