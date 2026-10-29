import type { APIRoute } from "astro";
import { BASE, DOMAIN } from "../lib/config";

export const GET: APIRoute = () =>
  new Response(`# Mariam-Art
User-agent: *
Allow: /
Disallow: /*?c=
Disallow: /*?s=
Disallow: /*?q=

Sitemap: ${DOMAIN}${BASE}/sitemap.xml
`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
