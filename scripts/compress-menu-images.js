/**
 * compress-menu-images.js
 * One-shot script: compresses all images in public/menu/ to WebP @ 80% quality,
 * max 800px wide (menus don't need more), and replaces originals with .webp files.
 * Run: node scripts/compress-menu-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../public/menu');
const QUALITY = 80;       // WebP quality (0-100)
const MAX_WIDTH = 800;    // max width in px; height auto-scales

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function compress(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED.has(ext)) return;

  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ext);
  const outPath = path.join(dir, `${base}.webp`);

  const statBefore = fs.statSync(filePath);

  await sharp(filePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath + '.tmp');

  // Replace original with compressed output
  fs.renameSync(outPath + '.tmp', outPath);

  // Remove original if it had a different extension
  if (filePath !== outPath) {
    fs.unlinkSync(filePath);
  }

  const statAfter = fs.statSync(outPath);
  const saved = ((1 - statAfter.size / statBefore.size) * 100).toFixed(1);
  console.log(
    `✓ ${path.basename(filePath).padEnd(40)} ${(statBefore.size / 1024).toFixed(0).padStart(6)} KB → ${(statAfter.size / 1024).toFixed(0).padStart(5)} KB  (${saved}% smaller)`
  );
}

async function run() {
  const files = fs.readdirSync(INPUT_DIR).map(f => path.join(INPUT_DIR, f));
  console.log(`\nCompressing ${files.length} images in public/menu/ ...\n`);
  for (const file of files) {
    try {
      await compress(file);
    } catch (err) {
      console.error(`✗ ${path.basename(file)}: ${err.message}`);
    }
  }
  console.log('\nDone. All images converted to WebP.\n');
}

run();
