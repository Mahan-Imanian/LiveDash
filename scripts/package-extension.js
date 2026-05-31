const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const out = path.resolve(root, "..", "updated-premium-project-v9.zip");
if(fs.existsSync(out)) fs.rmSync(out);
const exclude = ["node_modules", ".git", ".DS_Store", "*.log", "dist", "coverage", "updated-premium-project-v9.zip"];
execFileSync("zip", ["-r", out, ".", ...exclude.flatMap((item) => ["-x", item])], { cwd: root, stdio: "inherit" });
console.log(out);
