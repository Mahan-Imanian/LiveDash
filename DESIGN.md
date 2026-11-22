# LiveDash design system

The system of record for how LiveDash looks and moves. `src/styles/tokens.css` holds the values; this file says what they are for. Both change in the same commit.

**Direction: Front Page, edition.** LiveDash is laid out as a newspaper's front page, and the page reports news about the reader's own day: the next meeting as the lead story, what they were working on, what is open. The metaphor is carried by structure and content, not by ornament.

**Status:** this document describes the redesign as built so far (gates 1 and 2: foundations, search). Sections marked *planned* are decided but not yet in code.

## Principles

1. **Design for the thousandth open.** The page paints complete and typable. Nothing animates on load.
2. **The search line is the product.** Everything else supports getting somewhere or capturing something.
3. **Structure, not ornament.** Rules, columns and type hierarchy do the editorial work. No texture, grain, washes, glows or decorative italic.
4. **Colour means something.** The accent marks only live things: now, overdue, selection, the primary action.
5. **Every state is designed.** Loading, empty, error, offline, permission not granted, stale.

## Type

Two faces, both OFL, bundled locally (`src/styles/fonts.css`, about 179 KB):

| Face | Role |
| --- | --- |
| Newsreader (upright, variable `opsz` 6–72, `wght` 200–800) | Nameplate, headlines, briefs, note text |
| Schibsted Grotesk (variable `wght` 400–900) | Every label, control, time and count |

There is no monospace face and no italic. Times, counts and figures use Schibsted with `font-variant-numeric: tabular-nums`. If a fallback face is ever substituted, it must be upright: synthesised italic is not allowed.

**Roles** (`tokens.css`):

| Token | Use |
| --- | --- |
| `--text-nameplate` | The LiveDash nameplate (`opsz` 72) |
| `--text-hed` | The lead headline (next event) |
| `--text-dek` | The line under a headline |
| `--text-brief` | Titles in Pick up, Notes and other columns |
| `--text-search` | The search line |
| `--text-md` | Body and controls (14.5 px) |
| `--text-sm`, `--text-xs`, `--text-2xs` | Labels and meta. **12 px is the floor.** |

**Rules:**

- Sentence case everywhere.
- No tracked uppercase labels.
- No middle-dot chains of more than two items.
- En dash in ranges (7:04–7:49 PM).
- Headings use `text-wrap: balance`.

## Colour

Light is **newsprint**: cool and grey, deliberately not cream. Dark is the **night edition**: warm charcoal with newsprint ink, designed on its own rather than inverted.

| Token | Light | Night edition | Use |
| --- | --- | --- | --- |
| `--bg` | `#f1f0eb` | `#14130f` | Page |
| `--surface` | `#f8f7f3` | `#1c1a16` | Drawers, popovers, raised panels |
| `--surface-2` | `#e6e4dd` | `#24221c` | Wells, hover |
| `--line` | `#cfccc3` | `#36322a` | Hairlines |
| `--rule` | `#141412` | `#ece6d8` | Section and masthead rules |
| `--ink-1` | `#141412` | `#ece6d8` | Primary text |
| `--ink-2` | `#3d3b36` | `#c3bba9` | Secondary text |
| `--ink-3` | `#5c5952` | `#9d9584` | Meta (still AA) |
| `--accent` (ember, default) | `#ad2817` printer's red | `#ff8b63` | Live things only |

**Accents** (cobalt, moss, iris, graphite) replace the red everywhere it appears.

**Paper tones** are distinct stocks:

| Tone | Light | Dark |
| --- | --- | --- |
| Stone | Neutral grey `#e9e9e6` | `#131414` |
| Sage | `#e2e8dc` | `#10140f` |
| Mist | `#e0e7ee` | `#0f1318` |
| Clay | `#efe1d4` | `#17110d` |
| Night | — | Deep blue-black stock `#0d1017` (forces the night edition) |

`tests/contrast.test.ts` checks all 180 combinations of system scheme, theme, tone and accent against WCAG AA for text tokens. Lowest at gate 1: **5.30:1** (accent on clay).

## Space and shape

- **Spacing:** a 4 px scale (`--space-1` to `--space-10`). `--col-gap` is 24 px (20 px compact).
- **Radii:** small and by size (4 px for controls, 8 px for large panels). Print is mostly square.
- **Page width:** `--page-max: 2480px`. Wide screens get more columns, never a stretched column (*planned* in gate 3).

## Motion

Three durations and three curves, from Emil Kowalski's values:

| Token | Value | Use |
| --- | --- | --- |
| `--dur-1` | 120 ms | Hover and press colour |
| `--dur-2` | 200 ms | Small popovers, row collapse after undo |
| `--dur-3` | 280 ms | Drawers |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Enter, exit, default |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | On-screen movement |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Drawers |

**Rules:**

- **Nothing animates on page load.**
- **Nothing triggered from the keyboard animates:** opening search, result selection, hiding the panels while typing, `/` and `>`.
- **No `ease-in` on UI.**
- **No looping motion.** No blur, glow or `box-shadow` animation.
- **Animate only `transform` and `opacity`.** Colour changes may transition.
- **Reduced motion:** listed components drop `transform` from their transitions and keep colour and opacity changes. Per-component treatment arrives in the motion gate.

## Search

The search line is the product. The result list is set like a newspaper's index.

**Row anatomy**, left to right:

- a 3 px selection rule;
- the site icon or monogram;
- the title, in Newsreader at `--text-brief`;
- under it, the address in Schibsted, muted;
- on the selected top hit, a third line, "Ranked first: …";
- on the right, state words (open, a time, "closed at 6:44 PM");
- the verb with ↵, shown only on the selected row.

**Matched letters** are underlined in the accent, 2 px, like a proofreader's mark. Never a background block. Ranges come from `matchRanges` in `src/lib/fuzzy.ts`, which follows the same tiers as the score, so what is underlined is what matched.

**Sections** sit in a 150 px left lane when the list is at least 720 px wide (a container query), and stack above their rows when narrower. The order:

1. Top hit
2. Visited … (time-scoped)
3. Open tabs
4. Shortcuts
5. History
6. Bookmarks
7. Other devices
8. Tasks
9. Notes
10. Commands
11. Also (add as task, write as note)
12. Leave LiveDash

**Leave LiveDash.** The web search is its own last section, under a double rule, so it is always clear when Enter takes you off your own data. When nothing local is a strong match, the top hit itself is the web search, and its section says "Leave LiveDash".

**Selection** is a style on the row (`aria-selected`): an accent rule and a 6% ink fill. It never animates, because it moves with the arrow keys.

**Why it ranked first.** `explain()` in `src/lib/rank.ts` builds the reason from the same terms `rankQuery` scores:

- title or site match;
- open in a tab;
- in your shortcuts;
- past picks for this query;
- visit count.

It never states a reason that did not score.

**Reading the query.** A line under the field says what Enter will do:

- for a date phrase: "New task “call mom”, due Friday, 6:00 PM. ↵ adds it, Ctrl ↵ searches the web instead";
- for a time phrase: "Pages from yesterday (Saturday, November 21) matching “figma”".

This replaces the coloured date chip, which repeated the same fact the row already showed.

**Time-aware search.** `parseSince` (`src/lib/since.ts`) reads past-only phrases at the start or end of the query:

- yesterday, optionally morning, afternoon or evening;
- last night, this morning, this afternoon, earlier today;
- N days ago;
- this week, last week (weeks start on Monday);
- on or last *weekday*;
- during *event*, for today's calendar events that have started.

"Today", "tonight" and bare weekdays stay with the task parser, so "call mom friday 6pm" is still a task. With a phrase, results come from `chrome.history.search` with that start and end time, plus recently closed tabs inside the window. It needs the history permission, which is already optional; without it, the phrase is ordinary text.

**Announcements.** One polite live-region message about 450 ms after typing stops: "5 results. Switch to tab: Next.js". The selected option's accessible name includes the ranking reason.

**Missing favicons.** The monogram is the site's initial on `oklch(0.47 0.07 h)`, with the hue from a hash of the host. Lightness and chroma are the same for every site, so no tile shouts, and white text is above 4.5:1 on every hue. A real favicon replaces it as soon as Chrome's cache has one.

**Right-to-left and long titles.** Titles and addresses use `dir="auto"` for correct bidirectional rendering, aligned to the list edge so the column holds. They truncate with an ellipsis on one line.

## Cold start

- `public/early.js` restores theme, accent, tone, density and headline face from localStorage before first paint, so none of them flash.
- `color-scheme` is set on `:root` and in the page's meta tag.

## Placeholder copy awaiting approval

New strings introduced by the redesign. Each needs a yes before release; until then they ship as written here.

| Where | String |
| --- | --- |
| Search, web section | "Leave LiveDash" |
| Search, top hit | "Ranked first: …" with "title match", "site match", "open in a tab", "in your shortcuts", "you picked it for “q” N times", "visited N times" |
| Search, task preview | "New task “…”, due … ↵ adds it, Ctrl ↵ searches the web instead." |
| Search, time preview | "Pages from … (…) matching “…”." |
| Search, time section | "Visited yesterday" and the other phrase labels |
| Search, closed tab in a time window | "closed at 6:44 PM" |
| Search, idle hint | "? all keys" |
| Search, no results | "Nothing matches “…”." |
| Search, announcement | "N results. Verb: title" |

## Killed from the previous design, and why

| Removed | Why |
| --- | --- |
| Cream `#f3f0e8` paper | The stock AI-editorial ground; replaced by newsprint |
| Grain overlay and radial colour wash | Texture as decoration; a full-screen layer on every paint |
| Newsreader italic | Used only as decoration (placeholder, nameplate, notes); 65 KB |
| IBM Plex Mono | Monospace labels were a generic tell; tabular figures do the job; 30 KB |
| On-load choreography (11 elements, staggered keycaps and columns, rule draws, blurred headline) | Seen 100+ times a day; delayed perceived readiness |
| Pulsing dots | Infinite paint loop with no meaning beyond "soon" |
| Animated result cursor and result rise | Keyboard-driven, every keystroke; the cursor also animated `width` and `height` |
| Panels sliding away when typing starts | Keyboard-driven |
| Search underline draw on focus | Ran on every new tab |
| `ease-in` exits | Starts slow at the moment the eye is on it |
| 11 px text | Below the 12 px floor |
| The date chip in the search field | Said the same thing as the row; replaced by the preview line |
| The gliding selection cursor | Keyboard-driven; selection is now a row style |
| Monospace group labels and serif-only top hit | Two voices in one list; every title is now the same serif |
| The fixed eight-colour monogram palette | Clashed with every accent and tone |
| 3D keycap shading | Box inside box inside box; flattened now, replaced by the skybox in gate 4 |

## Planned (decided in phase 1, not yet built)

- **Gate 3, masthead and Today:**
  - nameplate with ears;
  - folio with edition number and tab briefing;
  - lead story with meeting context;
  - columns added by width;
  - CLS 0.
- **Gate 4:** shortcut keys as the skybox index strip.
- **Gate 5 and later:**
  - Pick up recap, Notes, Commands, weather, focus timer, Customize;
  - the 380 px popup;
  - the settings matrix;
  - photo legibility;
  - motion, accessibility, cold-start pass;
  - README, screenshots, store assets.
