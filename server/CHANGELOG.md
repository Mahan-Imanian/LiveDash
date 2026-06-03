# Changelog

## v32.0.0

- Fixed extension OAuth by returning a backend-issued LiveDash token through Chrome identity redirect.
- Added support for `LD_` backend tokens in `/api/auth/oauth/google`.
- Kept Google Cloud redirect fixed to the website callback URI.
- Added token lookup helper for extension auth handoff.
