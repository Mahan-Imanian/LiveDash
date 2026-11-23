# LiveDash design system

How LiveDash looks and behaves. The values live in `src/styles/app.css`; this file says what they are for. Both change in the same commit.

**Direction: one sentence over one photo.** The approved comp (`comp1`, idle) and its search state (`comp3`) set the page: a full-bleed photo, a veil measured from it, white type, and nothing else on first view. The page has one job: find what you read. Restraint follows the new tabs people keep (Bonjourr shows 4 controls, Tabliss 6): a clock, the search line, one sentence and a settings button.

## Principles

1. **Design for the thousandth open.** The page paints complete and typable. Nothing animates while you type.
2. **The search line is the product.** Everything else is evidence that it works (the resurfaced sentence) or a way to control it (settings).
3. **Show the sentence, not the page.** Results lead with the sentence you remembered, then say where and when you read it.
4. **Privacy is visible.** "Remembered on this device", the count in settings and the never-kept list are always one look away.
5. **Every state is designed.** First run, nothing kept yet, no match, time phrase only, site access removed, page forgotten.

## Layout

Measured from the comp (1536 × 1024) and scaled with the viewport through one unit, `--u: min(1vw, 1.6vh)`: 3:2 and 16:10 screens scale with the width, wider or shorter ones with the height, so type never outgrows the first viewport.

| Region | Position | Notes |
| --- | --- | --- |
| Clock and date | top left, 1.95% in | Time without AM/PM, as on a phone lock screen |
| Search line | left 9.11%, top 16%, 81.9% wide | Icon, field, 2 px white rule under it |
| Sentence and source | starts 3.78u under the rule | The sentence is at most 21.5em wide, so it wraps to two or three lines. "You read this …" and the site never break inside; under 480 px the site takes its own line |
| Results | replace the sentence while typing | Scroll inside the column; the field never moves |
| Footer | bottom, 1.4% in | Photo title or match count on the left; status and settings on the right |

## Type

One face, Yantramanav (OFL, bundled, 300/400/500, about 50 KB), chosen by measuring the comp's cap height, width and weight against the catalogue.

| Role | Size | Weight |
| --- | --- | --- |
| Resurfaced sentence | 3.9u (60 px at the comp size) | 300 |
| Top result sentence | 2.6u | 400 |
| Clock | 2.6u | 500, tabular figures |
| Source line, result meta | 2.2u, 1.65u | 400 |
| Result title | 2u | 500 |
| Search field | 2.1u | 300 |
| Date | 1.69u | 400 |
| Row sentence, footer | 1.42u, 1.17u | 400 |

Every size has a pixel floor for small windows (13 px at the smallest). Sentence case everywhere, no tracked capitals.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#ffffff` | Primary text over the photo |
| `--ink-2` | white at 86% | Source lines, meta, footer |
| `--ink-3` | white at 72% | Placeholder, key hints |
| `--hit` | `#c8f560` | Matched words in results, text selection, the caret, focus rings |
| `--panel`, `--panel-2`, `--panel-line` | `#121417`, `#1b1e22`, `#2c3036` | Settings panel and popup |
| `--danger` | `#ffb4a8` | "Forget everything" |
| `--tint` | per photo | Painted before the photo decodes, remembered for the next open |

The page is dark only. Its type sits on photographs, not on a theme.

## The photo and the veil

The first run carries more copy than the comp, so while remembering is off the veil holds at about 0.5 down to 58% of the height and fades out by 80%.


Six generated pictures ship in `public/photos` (dusk and night scenes with calm sky in the upper half, where the text sits). The day picks one, or the user fixes one.

When the photo decodes, `Photo.tsx` draws it at 96 × 64, takes the band behind the text, and finds the 90th-percentile luminance. `scrimFor()` returns the black veil needed for white text to reach 4.5:1 against that bright tail (never below 0.12, never above 0.85). The veil is strongest at the top and fades out by 68% of the height, so the photo's subject stays bright. While typing, the photo dims to 16% brightness over 160 ms so results read as a list, as in comp 3.

## Results

- **Top result:** the sentence, up to four lines, matched words in `--hit` and underlined; then the section heading, site and "read Tuesday for 11 minutes"; "Enter to open" (or "Enter to switch to it" when the page is open) on the right.
- **Other results:** title, then "read Tuesday" or "Open in a tab" on the right, and the matching sentence on one line, starting near its first match.
- **Last row:** "Search the web for …" with a globe. An address adds "Go to …" first.
- **Selection:** a white 8% fill with a 6 px radius that runs 16 px past the column on each side; the text stays on the column edge.
- **Dividers:** 1 px white at 22%, inset to start and end with the search rule; none under the selected row.
- **Keys** are listed in the settings panel, not under the results, so typing shows nothing the comp doesn't.
- **No match:** "Nothing you've read matches "…"", then the web row.

## Motion

The photo fades in over 240 ms once decoded, dims over 160 ms when you start typing, and the settings panel slides 24 px in 220 ms. Nothing else moves; results appear without animation so typing never waits on motion. `prefers-reduced-motion` removes both.

## Accessibility

- The field is a combobox controlling a listbox; arrow keys move `aria-activedescendant`.
- A polite live region announces how many pages matched.
- Settings is a modal `<dialog>` with labelled sections; Esc closes it and focus returns to the field.
- White text keeps 4.5:1 over every photo through the measured veil (`tests/photos.test.ts`).
- Focus rings are 2 px `--hit` with a 3 px offset.
