const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const src = path.join(outDir, 'file_0000000079b881f6ad1f91cd03cad0db.png');

if (!fs.existsSync(src)) {
  console.error('Source icon not found:', src);
  process.exit(1);
}

const targets = [
  'icon-192x192.png',
  'icon-512x512.png',
  'icon-maskable-512x512.png',
  'apple-touch-icon.png',
];

targets.forEach((fname) => {
  const dest = path.join(outDir, fname);
  fs.copyFileSync(src, dest);
  console.log(`Copied taxi icon -> ${fname}`);
});

// Also update favicon
const faviconDest = path.join(process.cwd(), 'public', 'favicon.png');
fs.copyFileSync(src, faviconDest);
console.log('Copied taxi icon -> favicon.png');
