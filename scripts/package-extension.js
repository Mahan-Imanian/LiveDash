const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const folder = path.basename(root);
const output = path.resolve(root, "..", "updated-premium-project-v6.zip");
if(fs.existsSync(output)) fs.unlinkSync(output);
execFileSync("zip", ["-qr", output, folder, "-x", "*/node_modules/*", "*/.git/*", "*/.DS_Store", "*/dist/*", "*/coverage/*", "*.log"], { cwd: path.dirname(root), stdio: "inherit" });
console.log(output);
