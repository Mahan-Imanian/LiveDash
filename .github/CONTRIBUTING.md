# Contributing

Requirements: Node.js 22.18 or newer (the unit tests run TypeScript directly with `node --test`) and Chrome 120 or newer.

```bash
git clone https://github.com/Mahan-Imanian/LiveDash.git
cd LiveDash
npm ci
npm run dev
```

`npm run dev` opens a Chrome instance with the extension loaded and reloads it on change.

Before opening a pull request:

```bash
npm run check
```

That runs the type checker, Biome (lint and formatting) and the unit tests in `tests/`.

`LD_TEST=1 npx wxt build` produces a test build in `.output-test/` that has site access granted up front and lets a test harness fill the index from the new tab. It is for automated testing only.

## Project layout

```text
entrypoints/newtab/        the new tab
entrypoints/popup/         the toolbar popup: what happens to this page
entrypoints/background.ts  registers the page reader, checks and stores pages, forgets on request
entrypoints/reader.content.ts  reads a page's text after eight seconds of viewing
src/app/                   new tab UI: photo and veil, search line, results, settings, popup
src/memory/db.ts           IndexedDB: pages, the word index, search candidates, the resurfaced sentence
src/memory/text.ts         words, sentences, the best sentence for a query, highlights, text-fragment links
src/memory/rank.ts         result order and the "read Tuesday" labels
src/memory/privacy.ts      the never-keep rules, address and title cleanup
src/memory/settings.ts     settings and the messages between the page, the reader and the service worker
src/lib/since.ts           time phrases in search ("pricing yesterday")
src/styles/app.css         every colour, size and motion value
public/photos/             the bundled background pictures
tests/                     unit tests (node --test)
docs/ranking.md            how results are found and ordered
DESIGN.md                  the design system
PRODUCT.md                 who LiveDash is for and the constraints every change keeps
```

If you change a ranking weight, update `docs/ranking.md`; `tests/memory-rank.test.ts` and `tests/memory-text.test.ts` tell you which intended ordering changed. If you change the never-keep rules, add a test for the address you meant to catch and one you didn't. Design changes keep `DESIGN.md` and `src/styles/app.css` in step.

## Ground rules

- LiveDash makes no network requests of its own. Page text never leaves the device.
- Nothing is read until the user turns remembering on, and the never-keep rules are checked both in the page and in the service worker.
- Never show invented data.
- Every interactive element needs an accessible name and must work from the keyboard.
- Use the values in `src/styles/app.css` instead of new colours, sizes or durations.
