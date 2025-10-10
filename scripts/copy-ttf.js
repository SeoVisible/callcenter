const fs = require('fs');
const path = require('path');

// Ensure a TTF font exists in public/fonts for serverless environments
// Copies DejaVuSans.ttf from node_modules to public/fonts if missing

try {
  const src = path.join(__dirname, '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf', 'DejaVuSans.ttf');
  const destDir = path.join(__dirname, '..', 'public', 'fonts');
  const dest = path.join(destDir, 'DejaVuSans.ttf');

  if (!fs.existsSync(src)) {
    console.log('copy-ttf: source TTF not found, skipping.');
    process.exit(0);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('copy-ttf: created', destDir);
  }

  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
    console.log('copy-ttf: copied DejaVuSans.ttf to public/fonts');
  } else {
    console.log('copy-ttf: TTF already exists, skipping');
  }
} catch (e) {
  console.log('copy-ttf: error', e && e.message);
}
