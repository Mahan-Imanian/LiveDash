# LiveDash v18

LiveDash is a Manifest V3 Chrome extension that turns the new tab page into a polished personalized dashboard with search, bookmarks, widgets, tasks, notes, focus timer, and optional LiveDash Cloud sync.

## Install

1. Unzip this folder.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Choose **Load unpacked**.
5. Select this folder.
6. Open a new tab.

## Cloud sync

The extension points to `https://livedash.codersays.com` in `scripts/backend-config.js`.

Google sign-in uses Chrome Identity and the website backend. After sign-in, the extension loads `/api/me.php` to hydrate profile, avatar, dashboard state, and sync metadata.

## Validate

```bash
npm run build
npm run package
```
