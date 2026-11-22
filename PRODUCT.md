# Product

## Platform

web

## Users

A keyboard-first person who opens dozens of new tabs a day in Chrome on a laptop or desktop and wants, within about a second, to either get somewhere (an open tab, a page from history, a bookmark, a shortcut, the web) or capture something (a task with a date, a note). They see the page hundreds of times a week, so the thousandth open matters more than the first.

## Product Purpose

LiveDash replaces Chrome's new tab with one search over everything Chrome already knows (open tabs, history, bookmarks, tabs on other devices) plus the user's tasks, notes and commands, and puts today's calendar, tasks, recently closed pages and notes on the same page. Success: the user reaches the thing they wanted, or has captured the thing they meant to remember, without thinking about the tool.

## Positioning

Ranking and parsing run locally over data Chrome already stores; there is no account, no server and no analytics, and every network feature (weather, picture of the day, the user's own calendar feed) is opt-in with its own permission. A dashboard-with-widgets new tab cannot truthfully claim one search over the browser's own data with nothing leaving the device.

## Operating Context

- Opened from Ctrl/Cmd+T dozens of times a day; judged in roughly the first 200 ms.
- Most common real viewport is a 1280×720 or 1366×768 laptop, often with a bookmarks bar; also 1440–3440 px wide desktops.
- A quick-capture popup (Alt+Shift+L) on any page, about 360–400 px wide.
- A full-screen focus timer.
- Chrome 120 or newer only; Manifest V3.

## Capabilities and Constraints

- One search with grouped results (open tabs, shortcuts, history, bookmarks, other devices, tasks, notes, commands), site keywords (`yt jazz`), date-phrase task capture ("call mom friday 6pm"), `>` commands, `?` key list.
- Nine Alt-numbered shortcut keys plus unnumbered keys, groups, drag and keyboard reordering, icons, history-ranked suggestions.
- Today (iCal events from a pasted secret address, tasks with overdue marks, undo and repeats), Pick up (recently closed, other devices, recent history), Notes with pinning.
- Opt-in weather (Open-Meteo), focus timer, Wikipedia picture of the day or a user photo as background; Customize panel for theme, accent, paper tone, density and headline face.
- Stack is fixed: WXT, React 19, TypeScript, Biome, `node --test`. No CSS framework, component library, animation library, date library or charting library. Hand-written `when.ts` and `ics.ts` parsers stay.
- Optional-permissions model stays exactly as is; settings in `chrome.storage.sync`, items in `chrome.storage.local`, changes broadcast to every open LiveDash tab.
- Fonts are bundled locally (OFL); no network fonts.

## Brand Commitments

- Name: LiveDash. MIT licensed.
- Voice in the interface: plain, sentence case, no exclamation marks, no hype.
- No account, no server, no analytics, no remote code; nothing about browsing leaves the device.
- Never show invented data: if something cannot be loaded, say so and show when it was last updated.
- Not yet published on the Chrome Web Store; the new tab itself and the store listing are the whole first impression.

## Evidence on Hand

- README, PRIVACY.md, CHANGELOG.md, docs/ranking.md and the existing screenshots in `.github/assets/`.
- No users, reviews, install counts or testimonials exist; none may be invented.

## Product Principles

1. Design for the thousandth open: instant, stable, typable on first paint.
2. The search line is the product; everything else supports getting somewhere or capturing something.
3. Local and private by construction, and visibly so.
4. Every state is designed: loading, empty, error, offline, permission not granted, stale.
5. Keyboard first, never keyboard only.

## Accessibility & Inclusion

WCAG 2.2 AA across every surface, theme, paper tone, accent and photo background; full keyboard operation including reordering; `prefers-reduced-motion` honoured completely; browser zoom 80–200% and OS text scaling.
