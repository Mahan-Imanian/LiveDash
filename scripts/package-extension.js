const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const output = path.resolve(root, "..", "updated-premium-project-v7.zip");
if(fs.existsSync(output)) fs.rmSync(output);
execFileSync("zip", ["-r", output, ".", "-x", "node_modules/*", "*.zip", ".DS_Store", "npm-debug.log", "coverage/*", "dist/*"], { cwd: root, stdio: "inherit" });
console.log(output);
