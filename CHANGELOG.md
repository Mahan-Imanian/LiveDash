# Changelog

## v32.0.0

- Fixed OAuth mismatch by routing Google sign-in through the LiveDash backend web callback before returning to the Chrome identity redirect.
- Replaced direct Google implicit-flow login inside the extension with the backend-mediated extension flow.
- Added runtime language cleanup for Persian/Jalali text rendered by upstream Widgetify components.
- Replaced runtime API targets with `https://livedash.codersays.com/api`.
- Removed Iranian service/API host permissions from the extension manifest.
- Kept the upstream Widgetify visual system and bundled source while applying English/global runtime localization.
