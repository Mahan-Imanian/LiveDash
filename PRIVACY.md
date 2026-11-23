# Privacy policy

LiveDash runs entirely in your browser. There is no LiveDash account, server, analytics, advertising, AI model or remote code, and LiveDash makes no network requests of its own.

## Permissions

| Permission | Why | When |
|---|---|---|
| Storage | Save your settings | Always |
| Scripting | Add the page reader to sites once you turn remembering on, and remove it when you turn it off | Only while remembering is on |
| Search | Send a web search to Chrome's default engine | When you search the web |
| Read `https` sites (optional) | Read the text of pages you visit so you can search them later, and see which pages are open in tabs | Only after you turn remembering on and Chrome asks you |

## What is kept

With remembering on, after a page has been open and visible for about eight seconds, LiveDash keeps:

- its address, title and site;
- the readable text of its paragraphs, lists, headings and quotes (up to about 120,000 characters);
- when you visited it (the last 30 visits) and how long it was visible.

This is stored in this browser's extension storage (IndexedDB) on this device. It is not synced and never sent anywhere. Settings, such as paused sites, use Chrome's sync storage, so they follow you only if Chrome Sync is on.

## What is never kept

- Anything in an incognito window.
- Pages that are not `https`.
- Banking, payment, brokerage, crypto, health, pharmacy, insurance and tax sites, recognised by their address.
- Webmail, chat, office and file-storage apps such as Gmail, Google Docs, Slack, Discord, WhatsApp Web and Dropbox.
- Sign-in, sign-up, account, billing, checkout, cart, password, settings, inbox and admin pages.
- Any page showing a password, card number or one-time code field.
- Sites you pause.

These checks run in the page before any text is read, and again in the service worker before anything is stored.

## What leaves your device

- **Web searches** go to the engine you chose (Chrome's default unless you picked another), the same as typing them into the address bar.

Nothing else.

## Your control

- The toolbar button shows what happens to the current page, pauses its site or forgets the page.
- Settings shows how many pages are kept and the space they use, pauses sites, and forgets the last hour, the last day, one site or everything.
- <kbd>Shift</kbd> <kbd>Delete</kbd> on a search result forgets that page.
- Turning remembering off stops reading pages and removes the site access. Pages already kept stay until you forget them.
- Uninstalling LiveDash removes everything it kept.

Questions: https://github.com/Mahan-Imanian/LiveDash/issues
