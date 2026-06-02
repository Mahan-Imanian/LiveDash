# LiveDash v19

LiveDash is a Manifest V3 Chrome extension new tab dashboard. This build adapts Widgetify's MIT-licensed UI mechanics and visual language while keeping LiveDash's English-first cloud sync flow.

## Install

1. Unzip this folder.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select this folder.

## Cloud configuration

Edit `scripts/backend-config.js` if your API endpoint changes.

## Attribution

Widgetify reference assets/styles are MIT licensed. See `third_party/widgetify/LICENSE`.

## Validate

```bash
npm run build
npm run package
```
