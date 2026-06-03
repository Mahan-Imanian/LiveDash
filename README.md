# LiveDash

LiveDash is a new-tab dashboard for people who work across search, notes, bookmarks, calendars, market data, weather, focus tools, and daily web workflows. It keeps the speed and visual character of the original project while replacing the legacy regional defaults with an English, LTR, Europe-ready product surface.

Repository: https://github.com/Mahan-Imanian/LiveDash

## What LiveDash includes

- Smart new-tab dashboard with animated widgets and glass-style panels
- Gregorian calendar, notes, todos, bookmarks, weather, news, translation, and currency tools
- Store and catalog surfaces with local fallback data, so the UI still renders when the backend is unavailable
- Google sign-in flow prepared for the LiveDash backend
- MySQL/PHP backend starter for cPanel-style hosting
- Chrome MV3 build through WXT, React, TypeScript, Tailwind, and Workbox
- Local extension assets for the LiveDash logo, LiveCoin, onboarding graphics, favicon fallbacks, and alarm sounds

## Project structure

```text
background/              Service worker modules and cache routing
entrypoints/newtab/      New-tab HTML entrypoint
public/icons/            Extension icon set
public/live-assets/      Bundled LiveDash brand and UI assets
server/                  PHP backend starter for auth, catalog, store, and user profile endpoints
src/                     React dashboard source
wxt.config.ts            Extension manifest and WXT build config
```

## Browser development

```bash
git clone https://github.com/Mahan-Imanian/LiveDash.git
cd LiveDash
npm install --legacy-peer-deps
npm run dev
```

## Chrome build

```bash
npm run build
```

The unpacked Chrome MV3 extension is generated at:

```text
.output/chrome-mv3
```

Load that folder through `chrome://extensions` with Developer Mode enabled.

## Backend deployment

The extension is configured to use:

```text
https://livedash.codersays.com
```

Deploy the contents of `server/` to that host, then create a private `server/.env` file from `server/.env.example`. Do not commit the private `.env` file.

Required backend variables:

```text
DB_HOST
DB_NAME
DB_USER
DB_PASS
APP_SECRET
APP_URL
ALLOWED_ORIGINS
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

Import the schema before enabling Google sign-in:

```bash
mysql -u <user> -p <database> < server/sql/install.sql
```

The backend currently provides the minimum endpoints needed by the extension shell: extension metadata, catalog data, market data, wallpapers, Google OAuth, profile lookup, refresh, and purchase acknowledgement. Replace or extend those handlers as the production product grows.

## Environment

Extension-side public variables live in `.env.example`:

```text
VITE_API=https://livedash.codersays.com
VITE_GOOGLE_OAUTH_CLIENT_ID=<public Google OAuth client id>
```

Only public client-side values belong in extension env files. Database credentials, app secrets, and Google client secrets belong only in the backend environment.

## Privacy and analytics

LiveDash can send anonymous Google Analytics 4 events for product quality, usage health, and error visibility. Widget content, notes, todos, and private user text are not analytics payloads. Analytics can be disabled from extension settings.

## Feedback and issues

Open issues at:

```text
https://github.com/Mahan-Imanian/LiveDash/issues
```

## License

See [LICENSE](LICENSE).
