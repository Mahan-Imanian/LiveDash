const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const requiredFiles = [
  "newtab.html",
  "popup.html",
  "options.html",
  "background.js",
  "styles/main.css",
  "scripts/default-state.js",
  "scripts/storage.js",
  "scripts/app.js",
  "scripts/popup.js",
  "scripts/options.js",
  "README.md",
  "CHANGELOG.md",
  "assets/icons/icon16.png",
  "assets/icons/icon32.png",
  "assets/icons/icon48.png",
  "assets/icons/icon128.png"
];

function fail(message){
  console.error(message);
  process.exit(1);
}

if(manifest.manifest_version !== 3) fail("manifest_version must be 3");
if(!manifest.chrome_url_overrides || manifest.chrome_url_overrides.newtab !== "newtab.html") fail("new tab override missing");
if(!manifest.action || manifest.action.default_popup !== "popup.html") fail("popup missing");
if(manifest.options_page !== "options.html") fail("options page missing");
if(!manifest.background || manifest.background.service_worker !== "background.js") fail("service worker missing");
if(!manifest.permissions.includes("storage")) fail("storage permission missing");
if(!manifest.content_security_policy || !manifest.content_security_policy.extension_pages.includes("script-src 'self'")) fail("MV3 CSP missing self script policy");
const unsafeEval = "unsafe" + "-eval";
const unsafeInline = "unsafe" + "-inline";
if(manifest.content_security_policy.extension_pages.includes(unsafeEval) || manifest.content_security_policy.extension_pages.includes(unsafeInline)) fail("unsafe CSP directive present");
for(const file of requiredFiles){
  if(!fs.existsSync(path.join(root, file))) fail(`required file missing: ${file}`);
}
const textFiles = requiredFiles.filter((file) => !file.endsWith(".png"));
for(const file of textFiles){
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if(/TODO|lorem ipsum/i.test(text)) fail(`forbidden placeholder marker in ${file}`);
  if(/<script[^>]*>\s*[^<\s]/i.test(text)) fail(`inline script detected in ${file}`);
  if(/https:\/\/cdn\.|unpkg\.com|jsdelivr\.net/i.test(text)) fail(`remote CDN dependency detected in ${file}`);
}
console.log("Extension validation passed");
