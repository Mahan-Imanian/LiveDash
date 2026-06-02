# LiveDash

LiveDash is a browser extension that turns the new tab page into a smart personal dashboard for European users, with support for US users as well.

Repository: https://github.com/Mahan-Imanian/LiveDash

## Features

- Weather
- Currency and crypto prices
- Gregorian calendar
- To-do lists
- Notes
- Bookmarks
- Search tools
- Dashboard widgets
- Animated visual elements

## Development

```bash
git clone https://github.com/Mahan-Imanian/LiveDash.git
cd LiveDash
npm install --legacy-peer-deps
npm run dev
```

## Build

```bash
npm run build
```

The Chrome MV3 build is generated in:

```bash
.output/chrome-mv3
```

Load that folder in the browser as an unpacked extension.

## Analytics and privacy

LiveDash uses Google Analytics 4 for anonymous usage statistics and product improvement. It does not collect note contents or personal content entered into widgets.

Users can disable analytics in the extension settings.

## Feedback and issues

Use GitHub issues:

https://github.com/Mahan-Imanian/LiveDash/issues

## License

See [LICENSE](LICENSE).
