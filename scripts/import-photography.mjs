/**
 * Prepare Mariam's photography portfolio images.
 * Usage: node scripts/import-photography.mjs "C:/path/to/photography"
 * Files are consumed in filename order. Existing catalog records group the
 * views for each photograph; update both this manifest and artworks.json when
 * the photo set changes.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = process.argv[2];
if (!source) throw new Error("Pass a folder containing the photography JPG files.");

const files = (await fs.readdir(source))
  .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (files.length !== 10) {
  throw new Error(
    `Expected 10 source images for the approved 4-card grouping; found ${files.length}.`,
  );
}

const groups = [[0], [1], [2], [3, 4, 5, 6, 7, 8, 9]];
const output = path.join(ROOT, "public", "assets", "artworks");
await fs.mkdir(output, { recursive: true });

for (const [index, sourceIndexes] of groups.entries()) {
  const main = files[sourceIndexes[0]];
  const stem = `photography-${String(index + 1).padStart(2, "0")}`;
  for (const [viewIndex, fileIndex] of sourceIndexes.entries()) {
    const name = viewIndex === 0 ? `${stem}.webp` : `${stem}-detail-${viewIndex}.webp`;
    await sharp(path.join(source, files[fileIndex]))
      .rotate()
      .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 5 })
      .toFile(path.join(output, name));
  }
  console.log(`${stem}: ${sourceIndexes.length} view(s), main ${main}`);
}
