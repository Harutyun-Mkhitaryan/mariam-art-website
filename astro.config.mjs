import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import pruneSourceImages from "./integrations/prune-source-images.mjs";

const cfg = JSON.parse(readFileSync(new URL("./site.config.json", import.meta.url), "utf-8"));
const repository = process.env.GITHUB_REPOSITORY;
const isGitHubPages = process.env.GITHUB_ACTIONS === "true" && Boolean(repository);
const [repositoryOwner, repositoryName] = (repository || "").split("/");
const isAccountPages = repositoryName?.toLowerCase() === `${repositoryOwner?.toLowerCase()}.github.io`;
const base = isGitHubPages
  ? (isAccountPages ? "" : `/${repositoryName}`)
  : cfg.site.basePath.replace(/\/$/, "");
const site = isGitHubPages
  ? `https://${repositoryOwner}.github.io`
  : cfg.site.domain.replace(/\/$/, "");

// https://astro.build/config
export default defineConfig({
  site,
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
