import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import pruneSourceImages from "./integrations/prune-source-images.mjs";

const cfg = JSON.parse(readFileSync(new URL("./site.config.json", import.meta.url), "utf-8"));
const base = cfg.site.basePath.replace(/\/$/, "");

// https://astro.build/config
export default defineConfig({
  site: cfg.site.domain.replace(/\/$/, ""),
  base: base || "/",
  trailingSlash: "always",
  build: { format: "directory", assets: "assets/_a" },
  compressHTML: true,
  image: {
    // one place to cap what the pipeline will emit
    service: { entrypoint: "astro/assets/services/sharp" },
  },
  integrations: [pruneSourceImages()],
  devToolbar: { enabled: false },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
