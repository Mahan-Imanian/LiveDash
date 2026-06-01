# LiveDash v14.0.1

LiveDash is a Manifest V3 Chrome extension that transforms the new tab page into a polished, interactive, personalized dashboard for search, bookmarks, tasks, focus sessions, calendar context, notes, and quick links.

## Load unpacked

1. Unzip the project.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Choose **Load unpacked**.
5. Select the unzipped LiveDash folder.
6. Open a new tab.

## Included surfaces

- New tab dashboard
- Popup quick actions
- Options/settings page
- Side panel workflow
- Background service worker
- Local-first storage via `chrome.storage.local`

## Validation

Run:

```bash
npm run build
npm run package
```

The validator checks Manifest V3 structure, required extension pages, CSP, runtime files, local assets, and packaged ZIP integrity.
