const fs = require('fs');
const path = require('path');

// Script to copy PDFKit fonts to Next.js expected location
// This prevents ENOENT errors when generating PDFs

const sourceDir = path.join(__dirname, '..', 'node_modules', 'pdfkit', 'js', 'data');
const nextServerDir = path.join(__dirname, '..', '.next', 'server');
const targetDir = path.join(nextServerDir, 'vendor-chunks', 'data');

// In dev, avoid creating the .next folder prematurely; skip if .next/server not ready yet
if (!fs.existsSync(nextServerDir)) {
  console.log('copy-fonts: .next/server not found yet. Skipping; runtime will ensure fonts.');
  process.exit(0);
}

// Create target directory if it exists under .next/server
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('Created font directory:', targetDir);
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
    const targetPath = path.join(targetDir, file);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      copied++;
      console.log(`Copied ${file}`);
    }
  }
  console.log(`copy-fonts: ensured ${files.length} files (${copied} new)`);
} catch (error) {
  console.error('Error copying font files:', error.message);
}