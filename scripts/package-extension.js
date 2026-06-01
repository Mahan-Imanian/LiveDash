const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const out = '/mnt/data/updated-premium-project-v14.zip';
if (fs.existsSync(out)) fs.unlinkSync(out);
execFileSync('zip', ['-qr', out, '.'], { cwd: root, stdio: 'inherit' });
console.log(out);
