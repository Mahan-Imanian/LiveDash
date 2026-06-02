const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'manifest.json',
  'newtab.html',
  'popup.html',
  'options.html',
  'sidepanel.html',
  'background.js',
  'styles/main.css',
  'scripts/default-state.js',
  'scripts/storage.js',
  'scripts/app.js',
  'scripts/popup.js',
  'scripts/options.js',
  'scripts/sidepanel.js',
  'assets/icons/icon16.png',
  'assets/icons/icon32.png',
  'assets/icons/icon48.png',
  'assets/icons/icon128.png',
  'README.md',
  'CHANGELOG.md'
];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${file}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest must use MV3.');
if (!manifest.chrome_url_overrides || manifest.chrome_url_overrides.newtab !== 'newtab.html') throw new Error('New tab override missing.');
if (!manifest.action || manifest.action.default_popup !== 'popup.html') throw new Error('Popup missing.');
if (manifest.options_page !== 'options.html') throw new Error('Options page missing.');
if (!manifest.side_panel || manifest.side_panel.default_path !== 'sidepanel.html') throw new Error('Side panel missing.');
const csp = manifest.content_security_policy && manifest.content_security_policy.extension_pages;
if (!csp || csp.includes('unsafe-eval') || csp.includes('unsafe-inline')) throw new Error('Unsafe CSP directive present.');
if (manifest.host_permissions && manifest.host_permissions.some((permission) => permission !== 'https://livedash.codersays.com/*')) throw new Error('Unexpected host permission present.');

const textFiles = required.filter((file) => /\.(js|css|html|md|json)$/.test(file));
for (const file of textFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (/https:\/\/cdn\.|unpkg\.com|jsdelivr\.net/.test(text)) throw new Error(`Remote CDN dependency found in ${file}`);
  if (/<script(?![^>]+src=)/i.test(text)) throw new Error(`Inline script found in ${file}`);
  if (/[\u0600-\u06FF]/.test(text)) throw new Error(`Persian/Arabic runtime text found in ${file}`);
  if (/TODO|FIXME/.test(text)) throw new Error(`Placeholder marker found in ${file}`);
}

console.log('LiveDash extension validation passed.');
