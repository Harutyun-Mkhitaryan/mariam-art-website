/**
 * Vendors the web fonts so nothing is fetched from fonts.googleapis.com at
 * runtime: one less third-party domain in the critical path, no visitor IPs
 * handed to Google, and the files sit behind the site's own cache headers.
 *
 * Reads the @fontsource packages, keeps only the subsets the three locales
 * actually need, copies those .woff2 files and writes a single fonts.css whose
 * src urls are relative — so the same file works at any basePath and in both
 * builds (Astro and the plain-HTML variant).
 *
 *     node scripts/prepare-fonts.mjs
 *
 * The generated files are committed, so a normal build never needs this.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const MODULES = path.join(ROOT, "node_modules");

/** Where the generated bundle is written. The second path is the sibling
 *  plain-HTML project; it is skipped when that folder is not there. */
const TARGETS = [
  path.join(ROOT, "public", "assets", "fonts"),
  path.join(path.dirname(ROOT), "site-static", "src", "assets", "fonts"),
];

/**
 * family    — the name styles.css asks for, so the tokens stay unchanged
 * pkg       — the npm package holding the files
 * subsets   — latin for everything, cyrillic for Russian, armenian for Armenian;
 *             vietnamese is dropped, nothing on this site uses it
 * italic    — only the two serif faces are ever set in italic
 */
const FAMILIES = [
  {
    family: "Playfair Display",
    pkg: "@fontsource-variable/playfair-display",
    subsets: ["latin", "latin-ext", "cyrillic"],
    italic: true,
  },
  {
    family: "Cormorant Garamond",
    pkg: "@fontsource-variable/cormorant-garamond",
    subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
    italic: true,
  },
  {
    family: "Jost",
    pkg: "@fontsource-variable/jost",
    subsets: ["latin", "latin-ext", "cyrillic"],
    italic: false,
  },
  {
    family: "Parisienne",
    pkg: "@fontsource/parisienne",
    subsets: ["latin", "latin-ext"],
    italic: false,
  },
  {
    family: "Noto Serif Armenian",
    pkg: "@fontsource-variable/noto-serif-armenian",
    subsets: ["armenian", "latin"],
    italic: false,
    axis: "wght", // the packages also ship a wdth build we do not need
  },
  {
    family: "Noto Sans Armenian",
    pkg: "@fontsource-variable/noto-sans-armenian",
    subsets: ["armenian", "latin"],
    italic: false,
    axis: "wght",
  },
];

/** Split an index.css into its @font-face blocks with the fields we need. */
function parseFaces(css) {
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => {
    const get = (key) => (body.match(new RegExp(`${key}:\\s*([^;]+);`)) || [])[1]?.trim();
    const file = (body.match(/url\(\.\/files\/([^)]+)\)/) || [])[1];
    return {
      style: get("font-style"),
      weight: get("font-weight"),
      range: get("unicode-range"),
      format: (body.match(/format\('([^']+)'\)/) || [])[1] || "woff2",
      file,
    };
  }).filter((f) => f.file && f.file.endsWith(".woff2"));
}

/**
 * Does this file belong to the subset we want?
 * File names read <stem>-<subset>-<axis-or-weight>-<style>.woff2, and the
 * subset itself may contain a dash ("latin-ext"), so the subset only counts as
 * matched when what follows it is an axis or a numeric weight — otherwise
 * "latin" would also swallow "latin-ext".
 */
const NEXT = /^(wght|wdth|standard|\d{3})(-|$)/;

function inSubset(file, stem, subset, axis) {
  const rest = file.slice(stem.length + 1).replace(/\.woff2$/, "");
  if (!rest.startsWith(subset + "-")) return false;
  const tail = rest.slice(subset.length + 1);
  if (!NEXT.test(tail)) return false;
  return axis ? tail.startsWith(axis + "-") : true;
}

const out = [];
const files = new Map();

for (const { family, pkg, subsets, italic, axis } of FAMILIES) {
  const dir = path.join(MODULES, pkg);
  // index.css carries the upright faces only; the italics sit in a sibling file
  const sheets = ["index.css", "wght-italic.css", "italic.css"];
  let css = "";
  for (const name of sheets) {
    try { css += await fs.readFile(path.join(dir, name), "utf-8") + "\n"; } catch {}
  }
  const stem = pkg.split("/")[1];

  for (const subset of subsets) {
    for (const face of parseFaces(css)) {
      if (!inSubset(face.file, stem, subset, axis)) continue;
      if (!italic && face.style === "italic") continue;

      files.set(face.file, path.join(dir, "files", face.file));
      out.push(
        `/* ${family} · ${subset}${face.style === "italic" ? " · italic" : ""} */\n` +
        `@font-face {\n` +
        `  font-family: '${family}';\n` +
        `  font-style: ${face.style};\n` +
        `  font-weight: ${face.weight};\n` +
        `  font-display: swap;\n` +
        `  src: url(./${face.file}) format('${face.format}');\n` +
        `  unicode-range: ${face.range};\n` +
        `}`);
    }
  }
}

const header =
`/* Generated by scripts/prepare-fonts.mjs — do not edit by hand.
   Self-hosted so the site makes no request to fonts.googleapis.com.
   The src urls are relative, so this works at any basePath. */\n\n`;

for (const target of TARGETS) {
  try {
    await fs.access(path.dirname(path.dirname(target)));
  } catch {
    console.log(`skip ${target} (no such project)`);
    continue;
  }
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  for (const [name, src] of files) await fs.copyFile(src, path.join(target, name));
  await fs.writeFile(path.join(target, "fonts.css"), header + out.join("\n\n") + "\n");
  console.log(`fonts: ${files.size} files + fonts.css -> ${path.relative(path.dirname(ROOT), target)}`);
}
