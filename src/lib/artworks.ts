import { z } from "astro/zod";
import data from "../data/artworks.json";
import { field } from "./i18n";

export type Localised = Record<string, string>;

export interface Category {
  id: string;
  name: Localised;
  tagline: Localised;
}

export interface Artwork {
  slug: string;
  category: string;
  year?: string | number;
  featured?: boolean;
  availability?: string;
  size?: { cm: string; in: string };
  images?: { main?: string; gallery?: string[]; details?: string[] };
  /** YYYY-MM-DD — when this work was last edited; used for sitemap lastmod */
  updated?: string;
  title: Localised;
  medium?: Localised;
  description: Localised;
}

/**
 * artworks.json is edited by hand, so it is validated at build time: a missing
 * translation or a typo in a category id fails the build with the offending
 * path instead of quietly producing a broken page.
 */
const localised = z.object({ en: z.string().min(1), ru: z.string().min(1), hy: z.string().min(1) });

const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: localised,
  tagline: localised,
});

const artworkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  category: z.string(),
  year: z.union([z.string(), z.number()]).optional(),
  featured: z.boolean().optional(),
  availability: z.enum(["available", "sold", "commission"]).optional(),
  size: z.object({ cm: z.string(), in: z.string() }).optional(),
  images: z.object({
    main: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    details: z.array(z.string()).optional(),
  }).optional(),
  // optional YYYY-MM-DD; drives <lastmod> in the sitemap when present
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: localised,
  medium: localised.optional(),
  description: localised,
});

function parse<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const lines = result.error.issues
      .map((i) => `  ${what}[${i.path.join(".")}]: ${i.message}`).join("\n");
    throw new Error(`src/data/artworks.json is not valid:\n${lines}`);
  }
  return result.data;
}

export const CATEGORIES = parse(
  z.array(categorySchema), data.categories, "categories") as Category[];
export const ITEMS = parse(z.array(artworkSchema), data.items, "items") as Artwork[];

const ids = new Set(CATEGORIES.map((c) => c.id));
for (const a of ITEMS) {
  if (!ids.has(a.category)) {
    throw new Error(`artworks.json: "${a.slug}" uses unknown category "${a.category}" ` +
      `(known: ${[...ids].join(", ")})`);
  }
}
if (new Set(ITEMS.map((a) => a.slug)).size !== ITEMS.length) {
  throw new Error("artworks.json: two works share a slug");
}

export function category(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? { id, name: {}, tagline: {} };
}

/** Featured first, then in the order the categories are declared, then by slug. */
export function itemsSorted(): Artwork[] {
  const order = new Map(CATEGORIES.map((c, i) => [c.id, i]));
  return [...ITEMS].sort((a, b) => {
    const f = Number(!a.featured) - Number(!b.featured);
    if (f) return f;
    const c = (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99);
    if (c) return c;
    return a.slug.localeCompare(b.slug);
  });
}

export function featured(limit = 5): Artwork[] {
  const picked = itemsSorted().filter((a) => a.featured).slice(0, limit);
  return picked.length ? picked : itemsSorted().slice(0, limit);
}

/** Three neighbours: same category first, topped up from the rest. */
export function related(item: Artwork, limit = 3): Artwork[] {
  const all = itemsSorted();
  const out = all.filter((a) => a.category === item.category && a.slug !== item.slug).slice(0, limit);
  for (const a of all) {
    if (out.length >= limit) break;
    if (a.slug !== item.slug && !out.includes(a)) out.push(a);
  }
  return out;
}

export function countIn(categoryId: string): number {
  return ITEMS.filter((a) => a.category === categoryId).length;
}

export const title = (item: Artwork, locale: string) => field(item.title, locale);
