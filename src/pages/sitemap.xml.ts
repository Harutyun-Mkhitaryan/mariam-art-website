import type { APIRoute } from "astro";
import {
  DEFAULT_LOCALE, LOCALES, PAGES, PAGE_SEG, TODAY, absolute, artworkUrl, asset, url,
} from "../lib/config";
import { ITEMS, type Artwork } from "../lib/artworks";
import { responsive } from "../lib/images";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Absolute URL of the largest rendition of a photography slot. */
async function slotUrl(slot: string): Promise<string | null> {
  const img = await responsive(slot);
  return img ? absolute(img.src) : null;
}

/** Every real photograph of one work — placeholders contribute nothing. */
function artworkPhotos(item: Artwork): string[] {
  const i = item.images ?? {};
  return [i.main, ...(i.gallery ?? []), ...(i.details ?? [])]
    .filter(Boolean)
    .map((n) => absolute(asset("artworks/" + n)));
}

/** Photographs shown on each page type, for the image sitemap.
 *  Only images the page actually renders belong here. */
async function pageImages(key: string): Promise<string[]> {
  const slots =
    key === "home" ? ["hero-dark", "about-portrait", "banner-dark"]
    : key === "gallery" ? ["gallery-hero-dark"]
    : key === "about" ? ["about-hero-dark", "banner-dark",
                         "process-1", "process-2", "process-3", "process-4",
                         "studio-1", "studio-2", "studio-3"]
    : ["contact-hero-dark"];

  const out = (await Promise.all(slots.map(slotUrl))).filter(Boolean) as string[];
  if (key === "gallery") for (const a of ITEMS) out.push(...artworkPhotos(a));
  return out;
}

/** An artwork's own `updated` date when it has one, else the build date. */
function lastmod(item?: Artwork): string {
  return (item as unknown as { updated?: string })?.updated || TODAY;
}

function entry(
  loc: string, priority: string, changefreq: string,
  alts: Record<string, string>, images: string[] = [], when = TODAY,
) {
  const links = Object.entries(alts)
    .map(([l, a]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absolute(a)}"/>`)
    .join("")
    + `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(alts[DEFAULT_LOCALE])}"/>`;
  // Google reads only <image:loc>; the other image tags were retired in 2022.
  const pics = images
    .map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`).join("");
  return `<url><loc>${absolute(loc)}</loc><lastmod>${when}</lastmod>`
    + `<changefreq>${changefreq}</changefreq><priority>${priority}</priority>${links}${pics}</url>`;
}

export const GET: APIRoute = async () => {
  const urls: string[] = [];

  for (const key of PAGES) {
    const seg = PAGE_SEG[key];
    const alts = Object.fromEntries(LOCALES.map((l) => [l, url(l, seg)]));
    const priority = key === "home" ? "1.0" : key === "gallery" ? "0.9" : "0.7";
    const freq = key === "gallery" ? "weekly" : "monthly";
    const pics = await pageImages(key);
    for (const l of LOCALES) urls.push(entry(url(l, seg), priority, freq, alts, pics));
  }

  for (const a of ITEMS) {
    const alts = Object.fromEntries(LOCALES.map((l) => [l, artworkUrl(l, a.slug)]));
    const pics = artworkPhotos(a);
    for (const l of LOCALES) {
      urls.push(entry(artworkUrl(l, a.slug), "0.8", "monthly", alts, pics, lastmod(a)));
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" `
    + `xmlns:xhtml="http://www.w3.org/1999/xhtml" `
    + `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`
    + `${urls.join("\n")}\n</urlset>\n`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
