import raw from "../../site.config.json";

export const CFG = raw;
export const SITE = raw.site;
export const CONTACT = raw.contact;
export const SOCIAL = raw.social as Record<string, string>;
export const FORMS = raw.forms;
export const ANALYTICS = raw.analytics;
export const SEO = raw.seo;

export const LOCALES = SITE.locales as readonly string[];
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE = SITE.defaultLocale;

// Astro's build base changes automatically for GitHub Pages project sites;
// on Cloudflare Pages it remains `/`, so these helpers work in both hosts.
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const DOMAIN = (import.meta.env.SITE || SITE.domain).replace(/\/$/, "");

export const YEAR = new Date().getFullYear();
export const TODAY = new Date().toISOString().slice(0, 10);

export const PAGES = ["home", "gallery", "about", "contact"] as const;
export const PAGE_SEG: Record<string, string> = {
  home: "", gallery: "gallery", about: "about", contact: "contact",
};

/** Site-absolute URL for a locale + path segments, always with a trailing slash. */
export function url(locale: string, ...parts: (string | undefined)[]): string {
  const segs = parts.filter(Boolean) as string[];
  return segs.length ? [BASE, locale, ...segs].join("/") + "/" : `${BASE}/${locale}/`;
}

/** Site-absolute URL for something under /assets/. */
export function asset(path: string): string {
  return `${BASE}/assets/${path.replace(/^\//, "")}`;
}

/** Turn a site-absolute URL into a fully qualified one. */
export function absolute(u: string): string {
  return DOMAIN + u;
}

export function artworkUrl(locale: string, slug: string): string {
  return url(locale, "gallery", slug);
}
