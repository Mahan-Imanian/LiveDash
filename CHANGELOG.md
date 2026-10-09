# Changelog

## 2.1.0

2.0 was a better launcher, but it gave up things Chrome's own new tab does well: visible shortcuts, a real search box, a background, customization. 2.1 is a front page. It does everything Chrome's new tab does, then adds what Chrome can't: your tabs, history and bookmarks in one search box, and quiet columns for what to pick up and what's on today. Complexity is layered. Search and shortcuts are visible immediately. Columns and panels are one key away. Commands and keyboard control are there for power users. Weather, wallpaper and focus are opt-in.

### New

- **Front-page design.** Serif masthead and search (Newsreader, bundled locally), a warm paper-and-ink palette, hairline column rules instead of cards, and drawers built on native `<dialog>`.
- **Search transforms the page.** Typing hides everything below the search line behind a results list grouped as top hit, open tabs, shortcuts, history, bookmarks, other devices, tasks, notes and commands. → or right-click shows each result's actions.
- **Choice of search engine** (Chrome default, Google, DuckDuckGo, Bing, Brave Search, Kagi, Ecosia, Startpage or a custom address). Site keywords such as `yt`, `w`, `gh`, `maps` and `tr` can be edited in Settings.
- **Shortcut keys with groups.** Group tabs (rename, delete, open as a Chrome tab group), drag to reorder or onto a group, custom icons (site, coloured letter or uploaded image), context menus and keyboard editing. On first run you can import Chrome's most visited sites. History-based suggestions fill empty space and can each be dismissed.
- **Pick up.** Recently closed tabs and windows, pages open on your other devices, and the last 24 hours of history. Search results, sign-in flows and error pages are filtered out.
- **Today.** The next meeting with Join, then due, upcoming and undated tasks, plus quick add with natural-language dates.
- **Repeating tasks.** "every day", "weekdays", "every week", "every month on the 1st" and "every year". Completing one rolls it forward, with undo, and month-end dates are clamped. Day-of-month dates such as "on the 1st" are understood. "Remind me to …" and similar lead-ins are dropped from titles.
- **Notes column** with pinned notes, and a notes drawer with search.
- **Bookmarks drawer.** Folders, breadcrumbs and search. The bookmarks bar opens flattened, as in Chrome's side panel.
- **Weather.** City search or "use my location", current conditions, 12-hour and 5-day forecast, an updated time, refresh and an offline state. Data comes from Open-Meteo, and network access is asked for only when you turn weather on.
- **Backgrounds.** Six paper tones, Wikipedia's picture of the day (landscape only, credited with author and license) or your own photo, with a dim control. In photo mode, text and accent colours are retuned so they stay legible.
- **Customize panel.** Theme, accent, background, density, serif or sans headlines, a switch for each column, clock and date format, and weather.
- **Full-screen focus mode.** 15, 25, 50 and 90-minute presets, breaks, an intent line and keyboard control.
- **Settings redesigned** into sections: Search, Browser access, Calendar, Focus, Keyboard, Data & privacy and About.

### Fixed and refined

- Favicons that are pure white or pure black are inverted when they would vanish against the theme.
- Untitled history entries show the site name instead of a raw address.
- Drawers focus their main field on open, and group tabs are a single tab stop with arrow-key navigation.
- Very large screens (2000px+) scale the whole page instead of floating a small column.
- Network requests time out after 10 seconds instead of spinning forever.
- The keyboard reference lists only keys that work. Chrome reserves Ctrl+K.

### Verified

Tested in Chrome at 1024, 1280, 1440, 1600, 1920 and 2560 px, at 125% and 200% zoom, in light and dark, with every background, on a fresh profile and on one with history, and with keyboard only. Secondary text meets WCAG AA (at least 4.9:1) on every tone in both themes. First contentful paint is under 100 ms on a warm load.

### Removed

- The 2.0 numbered "places" list and the separate Later page. Their jobs are now done by shortcuts, Pick up, Today and the Tasks drawer.
- lucide-react.

## 2.0.0

LiveDash is no longer a dashboard. The new tab is now a single instrument built around one question — *where to?* — and the one thing Chrome's own new tab can't do: rank where you're about to go from what you actually do.

### The product

- **Go.** One prompt, and beneath it the places you're most likely to want right now, numbered 1–9. Ranked from your history by frequency, recency and hour of day, plus what you've picked from LiveDash for the letters you typed. Pins keep their numbers.
- **Switch, don't duplicate.** Opening something already open jumps to that tab and closes the new one. Duplicate tabs are detected and closed with undo.
- **Pick up.** Recently closed tabs and windows, one key to reopen.
- **Type anything.** Addresses open, questions search with your default engine, dated phrases ("dentist thursday 9am") become things saved for later, `>` lists commands, `→` shows actions for any row (open in new tab, pin, save for later, copy link, never suggest).
- **Later.** Pages, tasks and notes to come back to, grouped by when they're due, with inline editing, reordering and undo.
- **Right now.** A single top line shows the next meeting with its join link and a running focus timer — only when they apply.
- **Quick capture** on any page with Alt+Shift+L, and right-click "Save page for later" / "Pin to LiveDash".
- **Start typing immediately.** LiveDash takes keyboard focus from the address bar on new tabs (can be turned off).

### Removed

- Everything from 1.x that wasn't about getting somewhere: accounts and sign-in, LiveCoin and the store, missions, referrals, friends, leaderboard, pets, mood log, IP lookup, YouTube stats, prayer times, crypto and currency rates (including hardcoded prices shown as live), RSS, translator, image and voice search, Explorer directory, wallpapers and themes for sale.
- Google Analytics (including a secret shipped in the bundle and an opt-out that did nothing) and the dependency on an API that returned 404s.
- The widget grid, clock hero, weather, shortcut tiles and every card. The icon library, Tailwind, daisyUI, moment and about 30 other dependencies.
- Region-specific defaults and all remaining 1.x code, names, assets and templates.

### Under the hood

- Local-first store with live sync between open tabs; no code path erases user data except an explicit, confirmed "Erase everything".
- Ranking (`src/lib/rank.ts`), natural-language dates (`src/lib/when.ts`) and iCal parsing with recurrence and meeting-link detection (`src/lib/ics.ts`), all unit-tested.
- Minimal required permissions; history, tabs, sessions, bookmarks and notifications are optional and requested in context.
- One typographic design system: system sans for content, monospace for keys and metadata, a single accent, line-numbered rows, no cards, a custom glyph set with one stroke weight.
- About 95 KB of gzipped JavaScript; no network requests unless you search or add a calendar; no background work unless a focus session is running.
- One-time migration of tasks, notes and bookmarks from 1.x.
- Clean, reproducible build from the public npm registry, CI, privacy policy and third-party notices.
