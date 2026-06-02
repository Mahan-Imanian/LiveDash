# Changelog

## v18.0.0

- Added cloud profile hydration after Google sign-in so the new tab shows the signed-in name, email, avatar, cloud state, and sync status instead of only a toast.
- Added startup cloud profile restore through `/api/me.php`.
- Rebuilt bookmark cards with cleaner spacing, single-layer custom icons, editable hover controls, domain labels, and stronger Widgetify-style polish.
- Removed the double-square icon treatment.
- Added a profile/cloud status strip, manual sync action, and better dock restore behavior.
- Tightened card spacing, app tile motion, hover states, shadows, and responsive layout.

## v17.1.0

- Fixed Chrome extension OAuth by using `chrome.identity.launchWebAuthFlow`.
