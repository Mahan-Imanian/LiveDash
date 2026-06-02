# DashLive v32

DashLive is a Chrome MV3 new-tab dashboard based on the MIT-licensed Widgetify extension source, localized for English/global usage and connected to the LiveDash Cloud backend.

## Load unpacked

1. Unzip this package.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select this folder.
6. Open a new tab.

## Google sign-in

The extension starts Google sign-in through:

`https://livedash.codersays.com/auth/google/start.php`

Google Cloud only needs this redirect URI registered:

`https://livedash.codersays.com/auth/google/callback.php`

The backend returns the LiveDash token to Chrome through `chrome.identity.getRedirectURL('google')`.

## Notes

- Runtime UI is English/LTR.
- API endpoint is `https://livedash.codersays.com/api`.
- Widgetify source and MIT license are included under `source-widgetify-mit/`.
