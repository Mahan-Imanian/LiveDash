# Product

## Platform

web (Chrome extension new tab)

## Users

Someone who reads a lot in Chrome for work or study (docs, issues, articles, forum threads) and regularly loses a page they know they read: the title is forgotten, history shows "Untitled" or a dozen look-alike entries, and a web search returns everything except that page. They open a new tab dozens of times a day, so the page has to be fast and quiet the thousandth time.

## Product Purpose

LiveDash replaces Chrome's new tab with one search over the text of pages you've read. You type what you remember, it shows the sentence from the page, when you read it and for how long, and opens the page scrolled to that sentence. The empty tab shows one sentence from something read before, as proof that it works and a small reason to look again.

Success: the user finds the page they half-remember in one search, without having saved it.

## Positioning

The text is kept and searched on the device. There is no account, server, analytics or AI model. Chrome's own "History search, powered by AI" is limited to some regions, covers only pages after it is turned on, and sends search terms and page content to Google. Cloud "browser memory" features belong to their own browsers. Small full-text history extensions exist with a few hundred users and don't replace the new tab or read time phrases (checked 2026-11-23).

## Operating Context

- Opened from Ctrl/Cmd+T dozens of times a day; judged in roughly the first 200 ms.
- Common viewports: 1280×720 and 1366×768 laptops, 1440–2560 px desktops.
- A small toolbar popup (Alt+Shift+L) on any page.
- Chrome 120 or newer, Manifest V3.

## Capabilities and Constraints

- Reads `https` pages only after the user turns remembering on and grants site access; a never-keep list, paused sites and incognito exclusion always apply.
- Full-text index in IndexedDB; time phrases from `since.ts`; results lead with the matching sentence and open with a text fragment.
- Stack is fixed: WXT, React 19, TypeScript, Biome, `node --test`. No CSS framework, component library, animation library, date library or chart library.
- Settings in `chrome.storage.sync`; page text in IndexedDB on the device only.
- Fonts and pictures are bundled; the extension makes no network requests of its own.

## Brand Commitments

- Name: LiveDash. MIT licensed.
- Voice in the interface: plain, sentence case, no exclamation marks, no hype.
- Nothing about browsing leaves the device.
- Never show invented data.
- Not yet on the Chrome Web Store; the new tab and the store listing are the whole first impression.

## Evidence on Hand

- README, PRIVACY.md, CHANGELOG.md, docs/ranking.md and the screenshots in `.github/assets/` (made from sample pages, not real browsing).
- No users, reviews, install counts or testimonials exist; none may be invented.

## Product Principles

1. Design for the thousandth open: instant, stable, typable on first paint.
2. The search line is the product.
3. Show the sentence, not the page.
4. Local and private by construction, and visibly so.
5. Every state is designed: first run, nothing kept yet, no match, access removed.

## Accessibility & Inclusion

WCAG 2.2 AA over every bundled photo; full keyboard operation; `prefers-reduced-motion` honoured; browser zoom 80–200%.
