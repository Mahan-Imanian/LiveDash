# LiveDash v21

LiveDash is a Manifest V3 Chrome new tab extension with a Widgetify-style personalized dashboard, cloud profile sync, bookmarks, widgets, tasks, notes, and a companion pet surface.

## Install

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select this folder.
5. Open a new tab.

## Cloud profile

The extension connects to `https://livedash.codersays.com` through the backend configured in `scripts/backend-config.js`. Google sign-in uses Chrome identity web auth flow.

## v21 changes

- Added TypeScript source model in `src/ts/livedash-model.ts` with `tsconfig.json` typechecking.
- Improved cloud profile UI after sign-in.
- Replaced the dead sign-in reopening behavior with a profile modal for signed-in users.
- Improved bookmark cards with real favicon loading, readable footer text, and Widgetify-style hover motion.
- Improved tasks readability.
- Added Akita companion interactions with play/feed state, energy, hearts, and score.
- Added additional Widgetify pet assets.

## Validate

Run:

```bash
npm run build
npm run package
```
