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

`LD_TEST=1 npx wxt build` produces a test build in `.output-test/` that has the optional permissions granted up front. It is for automated testing only.

## Project layout

```text
entrypoints/              new tab, quick-capture popup, background service worker
src/app/                  page shell, keys, popup
src/features/search/      the search line, result model, commands
src/features/shortcuts/   keys, groups, editor
src/features/front/       masthead, pick up, today, notes
src/features/panels/      bookmarks, tasks, notes, customize, settings
src/lib/rank.ts           ranking constants and scoring: frequency, recency, hour of day, learned picks, title cleanup
src/lib/when.ts           natural-language dates and repeats
src/lib/ics.ts            iCal parsing with recurrence and meeting links
src/store/                local store, actions, import/export, migration
src/styles/tokens.css     colour, type, spacing and motion tokens
src/ui/                   drawer, menu, glyphs, controls
tests/                    unit tests (node --test), including token contrast
docs/ranking.md           every ranking constant, what it does and how it was chosen
```

If you change a ranking constant, update `docs/ranking.md` and expect `tests/rank.test.ts` to tell you which intended ordering changed. If you change a colour token, `tests/contrast.test.ts` checks WCAG AA for every theme, tone and accent. Parser changes in `when.ts` and `ics.ts` need a test for the invalid and boundary input they touch, not only the happy path.

## Ground rules

- Everything must work offline and without an account. Network features are opt-in and ask for their own permission.
- Never show invented data. If something can't be loaded, say so and show when it was last updated.
- Every interactive element needs an accessible name and must work from the keyboard.
- Use the tokens in `src/styles/tokens.css` instead of new colours, sizes or durations.
