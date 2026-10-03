# Contributing

Requirements: Node.js 22.6 or newer and Chrome 120 or newer.

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

## Ground rules

- Everything must work offline and without an account. Network features are opt-in and ask for their own permission.
- Never show invented data. If something can't be loaded, say so and show when it was last updated.
- Every interactive element needs an accessible name and must work from the keyboard.
- Use the tokens in `src/styles/tokens.css` instead of new colours, sizes or durations.
