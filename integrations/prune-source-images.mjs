import fs from "node:fs/promises";
import path from "node:path";

/**
 * Astro emits every imported image twice: the responsive renditions that the
 * pages actually use, and the untouched source file, because the ESM module
 * for the image carries a URL to it. Nothing links to those sources here — the
 * masters in src/images/ exist only to be resized — so they are ~3 MB of dead
 * weight in every deploy.
 *
 * After the build, this walks the output, collects every asset name that any
 * html / css / js / json / xml file mentions, and deletes the rest. A file is
 * removed only when zero references were found, so an image that is used
 * somewhere is never touched.
 */
const TEXT = new Set([".html", ".css", ".js", ".mjs", ".json", ".xml", ".txt", ".webmanifest"]);
const PRUNABLE = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

export default function pruneSourceImages({ dir = "assets/_a" } = {}) {
  return {
    name: "prune-source-images",
    hooks: {
      "astro:build:done": async ({ dir: outDir, logger }) => {
        const root = new URL(outDir).pathname;
        const assetDir = path.join(root, dir);
        try {
          await fs.access(assetDir);
        } catch {
          return;
        }

        const all = await walk(root);
        const haystack = (await Promise.all(
          all.filter((f) => TEXT.has(path.extname(f)))
             .map((f) => fs.readFile(f, "utf-8")),
        )).join("\n");

        let removed = 0, bytes = 0;
        for (const file of await walk(assetDir)) {
          if (!PRUNABLE.has(path.extname(file))) continue;
          const name = path.basename(file);
          if (haystack.includes(name)) continue;
          bytes += (await fs.stat(file)).size;
          await fs.rm(file);
          removed++;
        }

        if (removed) {
          logger.info(`pruned ${removed} unreferenced image${removed === 1 ? "" : "s"} `
            + `(${(bytes / 1048576).toFixed(1)} MB)`);
        }
      },
    },
  };
}
