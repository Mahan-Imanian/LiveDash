# Changelog

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
- Region-specific defaults and all Widgetify-era code, names, assets and templates.

### Under the hood

- Local-first store with live sync between open tabs; no code path erases user data except an explicit, confirmed "Erase everything".
- Ranking (`src/lib/rank.ts`), natural-language dates (`src/lib/when.ts`) and iCal parsing with recurrence and meeting-link detection (`src/lib/ics.ts`), all unit-tested.
- Minimal required permissions; history, tabs, sessions, bookmarks and notifications are optional and requested in context.
- One typographic design system: system sans for content, monospace for keys and metadata, a single accent, line-numbered rows, no cards, a custom glyph set with one stroke weight.
- About 95 KB of gzipped JavaScript; no network requests unless you search or add a calendar; no background work unless a focus session is running.
- One-time migration of tasks, notes and bookmarks from 1.x.
- Clean, reproducible build from the public npm registry, CI, privacy policy and third-party notices.
