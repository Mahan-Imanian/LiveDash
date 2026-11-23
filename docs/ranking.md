# Ranking

Everything runs locally on the text LiveDash has kept. Nothing is sent anywhere and no model is involved.

## Finding candidates

The query is split into words the same way pages are: folded to lower case without accents, split on anything that isn't a letter or digit, and common English stop words dropped (`src/memory/text.ts`). A query made only of stop words keeps its last word, so typing never shows nothing.

The index (`src/memory/db.ts`) maps each word to the pages that contain it. A page is a candidate when it holds every query word; the last word may be a prefix, since you're usually still typing it. If no page holds every word and the query has more than two, pages holding all but one are tried. At most the 400 newest candidates are scored (2,000 when a time phrase narrows the window).

A time phrase (`src/lib/since.ts`) limits candidates to pages with a visit inside its window. A time phrase with no other words lists the pages read in that window, longest read first.

## The sentence

`bestPassage()` scores every sentence of a candidate page:

```
sentence = 10 × distinct query words + 3 × query words side by side + exact words + words in query order + length fit
```

Length fit is −1 for sentences over 400 characters and −0.5 for under 30. The highest-scoring sentence is shown, with the nearest heading above it.

## The page

`scoreHit()` in `src/memory/rank.ts`:

```
score = 60 × share of query words in the sentence
      + 20 × share of query words in the title
      + 15 × 0.5 ^ (days since last visit / 14)
      + min(8, 3 × log2(1 + visits))
      + min(10, 4 × log2(1 + minutes read))
```

Ties go to the more recent visit. The top 20 are shown.

## The resurfaced sentence

From pages last visited two days to two months ago and read for at least a minute, one is chosen by a hash of the current hour, so the same sentence stays for about an hour. Its sentences must be 70 to 150 characters, start with a capital, end with punctuation, and contain no links, code or cookie-banner phrases (`isQuotable`).

## How the values were chosen

By hand, when this version was written. They have not been fitted or measured against anyone's reading. `tests/memory-rank.test.ts` and `tests/memory-text.test.ts` pin the orderings they are meant to produce: a sentence holding every word beats a title match, recent and long reads beat old and short ones at equal text, and exact words side by side beat scattered prefixes.
