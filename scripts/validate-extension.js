const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const required = ["manifest.json", "newtab.html", "popup.html", "options.html", "sidepanel.html", "background.js", "styles/main.css", "scripts/default-state.js", "scripts/storage.js", "scripts/app.js", "scripts/popup.js", "scripts/sidepanel.js", "scripts/options.js", "README.md", "CHANGELOG.md", "assets/icons/icon16.png", "assets/icons/icon32.png", "assets/icons/icon48.png", "assets/icons/icon128.png"];
for(const file of required){ if(!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
if(manifest.manifest_version !== 3) throw new Error("Manifest must use version 3");
if(manifest.version !== "10.0.0") throw new Error("Manifest version must be 10.0.0");
if(manifest.chrome_url_overrides?.newtab !== "newtab.html") throw new Error("New tab override is missing");
if(manifest.action?.default_popup !== "popup.html") throw new Error("Popup is missing");
if(manifest.options_page !== "options.html") throw new Error("Options page is missing");
if(manifest.side_panel?.default_path !== "sidepanel.html") throw new Error("Side panel is missing");
if(manifest.background?.service_worker !== "background.js") throw new Error("Background service worker is missing");
if(manifest.permissions.some((permission) => ["<all_urls>", "tabs", "scripting", "debugger", "notifications", "history", "downloads"].includes(permission))) throw new Error("Manifest contains excessive permissions");
const csp = manifest.content_security_policy?.extension_pages;
if(!csp || csp.includes("unsafe-eval") || csp.includes("unsafe-inline")) throw new Error("CSP is unsafe");
const runtimeFiles = ["newtab.html", "popup.html", "options.html", "sidepanel.html", "background.js", "styles/main.css", "scripts/default-state.js", "scripts/storage.js", "scripts/app.js", "scripts/popup.js", "scripts/sidepanel.js", "scripts/options.js"];
for(const file of runtimeFiles){
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if(/[\u0600-\u06FF]/.test(text)) throw new Error(`Regional Persian/Arabic script found in ${file}`);
  if(/https:\/\/cdn\.|https:\/\/widgetify\.ir|\.ttf|\.woff|@font-face/.test(text)) throw new Error(`Remote or font dependency found in ${file}`);
  if(file.endsWith(".html") && /<script(?![^>]+src=)/i.test(text)) throw new Error(`Inline script found in ${file}`);
  if(/TODO|FIXME|console\.log/.test(text)) throw new Error(`Placeholder or console logging found in ${file}`);
}
for(const file of ["newtab.html", "popup.html", "options.html", "sidepanel.html"]){
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((ref) => !ref.startsWith("http") && !ref.startsWith("#") && !ref.startsWith("chrome:"));
  for(const ref of refs){ if(!fs.existsSync(path.join(root, ref))) throw new Error(`Broken asset path ${ref} in ${file}`); }
}
const app = fs.readFileSync(path.join(root, "scripts/app.js"), "utf8");
for(const phrase of ["Capture current tab", "Customize layout", "Module library", "Activity", "Alerts", "Reports", "source-level"]){
  if(!app.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Missing expected app behavior marker: ${phrase}`);
}
console.log("LiveDash v10 extension validation passed");
