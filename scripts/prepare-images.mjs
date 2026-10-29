/**
 * Art-directed crops.
 *
 * Astro's image pipeline resizes and re-encodes, but it cannot crop to a slot's
 * aspect around a chosen focal point. So this script does the crop once with
 * sharp and writes a high-quality master per slot into src/images/; from there
 * `getImage()` produces the responsive widths and formats at build time.
 *
 * It skips slots whose master already exists, so it is cheap to re-run.
 * Pass --force to redo them.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "src", "images");
const SRC = process.env.PHOTO_SRC || path.join(ROOT, "photos");
const FORCE = process.argv.includes("--force");

/** original photograph -> file stem in the source folder */
const PHOTOS = {
  branch: "a3e85483",
  "portrait-desk": "0e8f2d80",
  cup: "d2cdf7cc",
  "jacket-easel": "929ae554",
  "brush-detail": "e8b34c1c",
  "artist-table": "13ce0fd3",
  "oil-easel": "f1a9af9b",
  "gold-leaf-dark": "9362202b",
  "artist-seated": "56884ff9",
  "light-texture": "ece1a464",
  "studio-canvas": "61a36cc9",
  "light-plaster": "46ec9cad",
  "jacket-hanger": "951a178c",
  "dark-leaves": "4a5cfe6f",
  "dark-texture": "4e53dc2a",
  landscape: "8c79002a",
};

/**
 * slot -> [source, aspect w/h, master width, focal point 0..1 from the top]
 *
 * Only slots the site actually renders. The light theme reuses the same
 * photographs and dims them in CSS, so there are no "-light" masters: an
 * unused master still ships in the build, which is pure weight.
 */
export const SLOTS = {
  "hero-dark": ["gold-leaf-dark", 16 / 9, 1920, 0.5],
  "gallery-hero-dark": ["dark-texture", 21 / 9, 1920, 0.5],
  "about-hero-dark": ["artist-seated", 4 / 3, 1600, 0.32],
  "contact-hero-dark": ["dark-texture", 21 / 9, 1920, 0.5],
  "about-portrait": ["artist-seated", 4 / 3, 1200, 0.3],
  "banner-dark": ["dark-leaves", 21 / 9, 1600, 0.5],
  "process-1": ["landscape", 4 / 3, 800, 0.45],
  "process-2": ["portrait-desk", 4 / 3, 800, 0.45],
  "process-3": ["artist-table", 4 / 3, 800, 0.45],
  "process-4": ["brush-detail", 4 / 3, 800, 0.45],
  "studio-1": ["artist-table", 4 / 3, 900, 0.45],
  "studio-2": ["brush-detail", 4 / 3, 900, 0.45],
  "studio-3": ["studio-canvas", 4 / 3, 900, 0.45],
};

function sourceFile(key) {
  return path.join(SRC, `${PHOTOS[key]}-image.png`);
}

/** Centre horizontally, focal point vertically — the same rule as variant A. */
function cropRect(width, height, aspect, focal) {
  if (width / height > aspect) {
    const w = Math.round(height * aspect);
    return { left: Math.floor((width - w) / 2), top: 0, width: w, height };
  }
  const h = Math.round(width / aspect);
  const top = Math.max(0, Math.min(Math.round((height - h) * focal), height - h));
  return { left: 0, top, width, height: h };
}

async function buildSlot(name, [src, aspect, maxWidth, focal]) {
  const out = path.join(OUT, `${name}.jpg`);
  if (!FORCE && existsSync(out)) return false;

  const file = sourceFile(src);
  if (!existsSync(file)) throw new Error(`source photograph missing: ${file}`);

  const img = sharp(file);
  const { width, height } = await img.metadata();
  const rect = cropRect(width, height, aspect, focal);
  const target = Math.min(maxWidth, rect.width);

  await img
    .extract(rect)
    .resize(target, Math.round(target / aspect), { fit: "cover" })
    .jpeg({ quality: 92, mozjpeg: true, progressive: true })
    .toFile(out);
  return true;
}

/**
 * Bounding box of everything that is not fully transparent.
 * sharp's own .trim() keys on the corner colour, which does not survive the
 * soft alpha edge on these cut-outs, so measure the alpha channel directly.
 */
async function alphaBox(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[row + x * channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { left: 0, top: 0, width, height };
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** The logo mark: trim the transparent margin, stand the branch upright. */
async function buildBranch() {
  const out = path.join(OUT, "branch.png");
  if (!FORCE && existsSync(out)) return false;

  const file = sourceFile("branch");
  const first = await sharp(file)
    .ensureAlpha()
    .extract(await alphaBox(file))
    // sharp turns clockwise where PIL turns the other way — hence the sign
    .rotate(-38, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(first)
    .extract(await alphaBox(first))
    .resize({ width: 560, height: 560, fit: "inside" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(out);
  return true;
}

/** 1200×630 social card per theme: photograph, scrim, wordmark, headline. */
async function buildOg(theme) {
  const out = path.join(OUT, `og-${theme}.jpg`);
  if (!FORCE && existsSync(out)) return false;

  const src = theme === "dark" ? "gold-leaf-dark" : "light-texture";
  const ink = theme === "dark" ? "#F0EAE0" : "#221D17";
  const gold = theme === "dark" ? "#C9A271" : "#96652D";
  const wash = theme === "dark" ? "13,12,10" : "245,239,229";

  const base = sharp(sourceFile(src));
  const { width, height } = await base.metadata();
  const rect = cropRect(width, height, 1200 / 630, 0.5);

  const overlay = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="rgb(${wash})" stop-opacity="1"/>
      <stop offset="46%"  stop-color="rgb(${wash})" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="rgb(${wash})" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="118" fill="${gold}" font-family="Jost, Helvetica, Arial, sans-serif"
        font-size="22" letter-spacing="7">MARIAM-ART</text>
  <text x="80" y="300" fill="${ink}" font-family="Playfair Display, Georgia, serif"
        font-size="92">Art</text>
  <text x="80" y="392" fill="${ink}" font-family="Playfair Display, Georgia, serif"
        font-size="92">in every detail</text>
  <text x="80" y="486" fill="${ink}" font-family="Cormorant Garamond, Georgia, serif"
        font-size="30" opacity="0.78">Art Studio · Yerevan</text>
  <rect x="80" y="530" width="120" height="1" fill="${gold}"/>
</svg>`);

  await base
    .extract(rect)
    .resize(1200, 630, { fit: "cover" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out);
  return true;
}

await fs.mkdir(OUT, { recursive: true });

let made = 0;
for (const [name, spec] of Object.entries(SLOTS)) if (await buildSlot(name, spec)) made++;
if (await buildBranch()) made++;
if (await buildOg("dark")) made++;

console.log(made ? `images: prepared ${made} masters in src/images/` : "images: masters already present");

/* ---------------------------------------------------------------- app icons
 * Fixed paths in the manifest, so these go straight into public/assets/.
 */
const PUB = path.join(ROOT, "public", "assets");
await fs.mkdir(PUB, { recursive: true });

for (const size of [180, 192, 512]) {
  const out = path.join(PUB, `icon-${size}.png`);
  if (!FORCE && existsSync(out)) continue;
  const k = size / 32;
  const mark = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0D0C0A"/>
  <path d="M6 27 C 11 21, 15 15, 19 6" stroke="#C9A271" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M11 19 c 4 -3, 7 -1, 8 1 c -3 2 -6 1 -8 -1Z" fill="#C9A271"/>
  <path d="M13 15 c -4 -2, -5 -5, -4 -7 c 3 1 5 4 4 7Z" fill="#C9A271"/>
  <path d="M16 11 c 4 -2, 5 -5, 4 -7 c -3 1 -5 4 -4 7Z" fill="#C9A271"/>
  <path d="M17 13 c -4 -1, -6 -4, -6 -6 c 3 0 6 3 6 6Z" fill="#C9A271" opacity=".85"/>
  <circle cx="20" cy="4.5" r="1.5" fill="#C9A271"/>
</svg>`);
  await sharp(mark, { density: 96 * k }).png({ compressionLevel: 9 }).toFile(out);
  console.log(`icon: ${path.basename(out)}`);
}
