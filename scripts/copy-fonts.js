const fs = require('fs');
const path = require('path');

// Script to copy PDFKit fonts to Next.js expected location
// This prevents ENOENT errors when generating PDFs

const sourceDir = path.join(__dirname, '..', 'node_modules', 'pdfkit', 'js', 'data');
const nextServerDir = path.join(__dirname, '..', '.next', 'server');
const targetDirs = [
  path.join(nextServerDir, 'vendor-chunks', 'data'),
  path.join(nextServerDir, 'chunks', 'data'), // Vercel path variant
];

// In dev, avoid creating the .next folder prematurely; skip if .next/server not ready yet
if (!fs.existsSync(nextServerDir)) {
  console.log('copy-fonts: .next/server not found yet. Skipping; runtime will ensure fonts.');
  process.exit(0);
}

// Create target directories if they exist under .next/server
for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created font directory:', dir);
  }
}

// Copy all .afm font files
try {
  if (!fs.existsSync(sourceDir)) {
    console.log('copy-fonts: pdfkit data folder not found, skipping.');
    process.exit(0);
  }

  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.afm'));
  let copied = 0;
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    for (const dir of targetDirs) {
      const targetPath = path.join(dir, file);
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        copied++;
        console.log(`Copied ${file} -> ${dir}`);
      }
    }
  }
  console.log(`copy-fonts: ensured ${files.length} files (${copied} new across ${targetDirs.length} dirs)`);
} catch (error) {
  console.error('Error copying font files:', error.message);
}