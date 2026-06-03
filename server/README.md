# LiveDash Cloud Backend v32

Upload these files to `https://livedash.codersays.com`.

## Required Google Cloud redirect URI

Register this URI in Google Cloud Console:

`https://livedash.codersays.com/auth/google/callback.php`

Do not register the Chrome extension `chromiumapp.org` URL for this backend-mediated flow.

## Health check

`https://livedash.codersays.com/api/health.php`

Expected:

`{"ok":true,"service":"LiveDash API","version":"17.0.0"}`
