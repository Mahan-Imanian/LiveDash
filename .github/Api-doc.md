# LiveDash API notes

The extension talks to the LiveDash backend at:

```text
https://livedash.codersays.com
```

Core endpoints used by the extension:

```text
GET  /extension
GET  /contents
GET  /market
GET  /wallpapers
GET  /wallpapers/categories
GET  /extension/@me
POST /auth/oauth/google
POST /auth/refresh
POST /market/purchase
GET  /auth/google/start.php
GET  /auth/google/callback.php
```

The PHP starter backend lives in `server/`. Configure private credentials in `server/.env`; never commit production secrets.
