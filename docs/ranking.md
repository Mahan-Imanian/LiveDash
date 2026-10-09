# Ranking

LiveDash ranks pages in two places:

- **Home** (`rankHome` in `src/lib/rank.ts`): the history suggestions that fill empty shortcut slots and the cached list the search box uses before history has loaded.
- **Query** (`rankQuery`): the page results in the search box while you type. `src/features/search/model.ts` then decides which row becomes the top hit and mixes in tasks, notes, devices and commands.

Everything runs locally on data Chrome already has: `chrome.history.search` (last 60 days, at most 5,000 pages), `chrome.history.getVisits` for the 40 most-visited pages (hour-of-day counts, refreshed every 12 hours), open tabs, bookmarks matching the query, your shortcuts, and a log of the last 400 results you opened from LiveDash ("launches") with the letters you had typed.

All constants live in one block at the top of `src/lib/rank.ts`.

## How the values were chosen

The constants were picked by hand when the ranking was written (commit `c5cde8b`, 2026-10-04) and have not changed since. They were not fitted or measured against any dataset, including the author's own history; there is no offline evaluation. The "Intent" columns below describe what each value is meant to achieve, not a measured result. What backs them is a set of unit tests in `tests/rank.test.ts` that pin the orderings the constants are meant to produce. Change a value and those tests tell you which intended ordering you broke.

## Page identity

`normalize()` turns a URL into a key: lower-cased host without `www.`, the path without a trailing slash, and the query string without common tracking parameters (`utm_*`, `fbclid`, `gclid`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `mc_cid`, `mc_eid`, `igshid`, `yclid`, `_ga`, `_gl`, `si`, `ref_src`). The `#hash` is dropped. Only `http` and `https` URLs are ranked.

Up to 2.2.0 the query string was dropped too, which merged every `youtube.com/watch?v=…` into one entry. Pages that differ only in query and share a title (for example a GitHub repository with and without `?tab=readme-ov-file`) are still shown once because results are deduplicated by host and title.

`merge()` folds all sources for one key into a single entry. Visit counts take the maximum, not the sum, because the sources are the same Chrome pages seen through different APIs. History entries whose title looks like an HTTP error page are dropped unless the page is open or pinned. Search-result pages, sign-in and OAuth callback URLs are dropped (`JUNK` in `rank.ts`).

## Home score

```
score = frecency × hourWeight + launches × HOME_LAUNCH_WEIGHT
frecency = log2(2 + visits) × 0.5 ^ (ageDays / VISIT_HALF_LIFE_DAYS)
```

| Constant | Value | What it does | Intent |
| --- | --- | --- | --- |
| `VISIT_HALF_LIFE_DAYS` | 14 days | The visit term halves every two weeks since the last visit. | Long enough that a weekly site survives a week off, short enough that last month's project fades. With it, 8 visits yesterday outrank 120 visits three weeks ago (pinned in a test). |
| `log2(2 + visits)` | — | Diminishing returns on visit count. The `2 +` keeps a page with 0 or 1 visits above zero. | Without a log, a webmail tab with thousands of visits would hide everything else. |
| `UNKNOWN_VISIT_AGE_DAYS` | 30 days | Age assumed when a page has no last-visit time (a shortcut or launch that is not in history). | Treats it as stale but not gone. |
| `HOUR_MIN_SAMPLE_VISITS` | 6 visits | Below this many recorded visits the hour weight is 1 (neutral). | Avoids reading a pattern into two or three visits. |
| `HOUR_WEIGHT_FLOOR` | 0.6 | Lowest hour weight, for a page never visited near this hour. | Time of day nudges, it does not remove a page. |
| `HOUR_WEIGHT_MAX_BOOST` | 1.6 | Largest amount added to the floor, so the weight is at most 2.2. | Caps the boost so a narrow habit cannot dominate frequency. |
| `HOUR_SHARE_GAIN` | 4 | Multiplies the share of a page's visits that fall within one hour of now (previous, current and next hour). A share of 0.25 gives `0.6 + 1.0 = 1.6`. | A uniform spread over 24 hours has a 3-hour share of 0.125, which gives 1.1, close to neutral. |
| `HOME_LAUNCH_WEIGHT` | 1.5 per launch | Each time you opened the page from LiveDash adds 1.5, decayed by `LAUNCH_HALF_LIFE_DAYS`. | A pick made from the new tab is a direct signal of what you want there. A page visited 30 times today scores 5 from visits (`log2 32`), so about three fresh launches equal it. |
| `HOME_MIN_VISITS` | 2 visits | Pages visited once are not suggested unless you opened them from LiveDash. | A single visit is usually a link someone sent. |
| `HOME_PER_HOST` | 1 | At most one suggestion per host. Pins are counted. | Keeps nine slots from filling with one site's pages. |
| `HOME_LIMIT` | 9 | Number of ranked entries (pins plus suggestions). | Matches the nine numbered shortcut keys. |

## Query score

```
text  = max(fuzzy(title),
            fuzzy(host) + QUERY_HOST_BONUS_POINTS,
            fuzzy(site name) + QUERY_SITE_NAME_BONUS_POINTS,
            fuzzy(key) − QUERY_KEY_PENALTY_POINTS)
score = text
      + log2(2 + visits) × QUERY_VISIT_POINTS_PER_DOUBLING
      + QUERY_PINNED_BONUS_POINTS if pinned
      + QUERY_OPEN_TAB_BONUS_POINTS if open
      + launchWeight(query) × QUERY_LAUNCH_POINTS
```

Points are on the 0–100 scale of `fuzzy.ts` (below). Recency is deliberately not part of the query score: once you type, the text match and what you have picked for those letters matter more than when you last visited.

| Constant | Value | What it does | Intent |
| --- | --- | --- | --- |
| `QUERY_MIN_TEXT_POINTS` | 45 points | Pages whose best text match is below this are not shown. | Lets the short-subsequence tier (50) through and drops loose subsequences such as `git` in `grid-template-columns` (pinned in `tests/lib.test.ts`). |
| `QUERY_HOST_BONUS_POINTS` | +4 | Bonus when the host matches better than the title. | Typing a domain is a deliberate signal. |
| `QUERY_SITE_NAME_BONUS_POINTS` | +6 | Bonus for matching the first label of the host (`github` in `github.com`). | People type site names more than titles. |
| `QUERY_KEY_PENALTY_POINTS` | −10 | Penalty for matching only in the full key (host + path + query). | A hit deep in a path is weak evidence. |
| `QUERY_VISIT_POINTS_PER_DOUBLING` | 3 points | Each doubling of visits adds 3 points. | Frequency breaks ties between similar text matches but cannot lift a bad match over a good one: 1,000 visits add about 30 points. |
| `QUERY_PINNED_BONUS_POINTS` | +10 | Bonus for a page in your shortcuts. | A pin wins against an unpinned page whose text match is up to 10 points better, and loses beyond that (pinned in a test). |
| `QUERY_OPEN_TAB_BONUS_POINTS` | +6 | Bonus for a page that is open in a tab. | Switching to the open tab is usually what you want; an open tab beats a bookmark with the same match (pinned in a test). |
| `LAUNCH_HALF_LIFE_DAYS` | 21 days | Each launch's weight halves every three weeks. | Learned picks should outlast visit recency; a three-week-old pick still counts half. |
| `LAUNCH_SAME_QUERY_MULTIPLIER` | ×4 | A launch counts five times (1 + 4) when the letters typed then and now share a prefix. | Remembers that `g` meant GitLab for you, not GitHub. |
| `QUERY_LAUNCH_POINTS` | 12 points | Points per decayed launch. Three recent picks for the same letters add about 180 points. | Learned picks are meant to override frequency, which the `git` → GitLab test pins. |
| `QUERY_LIMIT` | 9 | Page results passed to the results list. | The value the search box already used before the constants were named. |

## Search box thresholds

Used by `src/features/search/model.ts`, also defined in `rank.ts`:

| Constant | Value | What it does |
| --- | --- | --- |
| `TOP_HIT_MIN_TEXT_POINTS` | 70 | The best page becomes the top hit only if its title, host or site name scores at least this; otherwise web search is the top hit. 70 is just below the initials tier (72). |
| `COMMAND_MIN_POINTS` | 62 | Commands mixed into ordinary search results need at least this score. |
| `COMMAND_TOP_HIT_MIN_POINTS` | 75 | A command becomes the top hit at the word-prefix tier or better. |
| `COMMAND_KEYWORD_PENALTY_POINTS` | 12 | Matching a command's hidden keywords counts 12 less than matching its label. |
| `ITEM_MIN_TEXT_POINTS` | 55 | Minimum match for tasks, notes and other-device tabs to appear. |

A question (text ending in `?` or starting with what, how, why and similar words) never gets a page or a command as its top hit; the top hit is web search, or the task if the text contains a date.

## Fuzzy text score (`src/lib/fuzzy.ts`)

| Match | Points |
| --- | --- |
| Exact, ignoring case | 100 |
| Text starts with the query | 90 minus half the extra length, at least 80 |
| Every word of a multi-word query starts a word in the text | 78 |
| A word in the text starts with the query | 75 |
| The query is a prefix of the words' initials (`hn` → Hacker News) | 72 |
| Substring elsewhere | 60 minus its position, at least 40 |
| Short subsequence (≤ 4 letters, same first letter, few gaps) | 50 |
| Any other subsequence | 40 minus gaps, at least 1 |
| No match | 0 |

The tiers order match kinds; the gaps between them are what the bonuses above are sized against.

## Known limits

- No evaluation set. The orderings in the tests are the specification; nobody has checked how often the top result is the page a user actually wanted.
- Visit counts come from Chrome's per-URL `visitCount`, which includes redirects and reloads.
- The hour histogram covers only the 40 most-visited pages and the last 45 days.
- Launch history is capped at 400 entries and stays on the device. Clearing it is under Settings → Data & privacy.
