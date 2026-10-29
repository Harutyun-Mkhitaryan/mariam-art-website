import type { APIRoute } from "astro";
import { BASE, DEFAULT_LOCALE, SEO, SITE } from "../lib/config";

export const GET: APIRoute = () =>
  new Response(JSON.stringify({
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.shortName,
    start_url: `${BASE}/${DEFAULT_LOCALE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: SEO.themeColorDark,
    theme_color: SEO.themeColorDark,
    lang: DEFAULT_LOCALE,
    icons: [
      { src: `${BASE}/assets/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/assets/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, null, 2), { headers: { "Content-Type": "application/manifest+json; charset=utf-8" } });
