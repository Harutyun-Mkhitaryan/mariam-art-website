import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

/**
 * The masters in src/images/ are already cropped to their slot's aspect
 * (scripts/prepare-images.mjs). Here we only ask Astro for the responsive
 * widths and the two formats.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../images/*.{jpg,png}", { eager: true });

const MASTERS: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split("/").pop()!.replace(/\.(jpg|png)$/, "");
  MASTERS[name] = mod.default;
}

/** Widths served per slot — the same ladder as the plain-HTML variant. */
const WIDTHS: Record<string, number[]> = {
  "hero-dark": [1920, 1280, 800],
  "hero-light": [1920, 1280, 800],
  "gallery-hero-dark": [1920, 1280, 800],
  "gallery-hero-light": [1920, 1280, 800],
  "contact-hero-dark": [1920, 1280, 800],
  "contact-hero-light": [1920, 1280, 800],
  "about-hero-dark": [1600, 1000, 640],
  "about-hero-light": [1600, 1000, 640],
  "banner-dark": [1600, 1000, 640],
  "banner-light": [1600, 1000, 640],
  "about-portrait": [1200, 800, 520],
};
const DEFAULT_WIDTHS = [900, 560, 380];

export interface Responsive {
  src: string;
  webp: string;
  jpg: string;
  width: number;
  height: number;
}

export function hasSlot(slot: string): boolean {
  return slot in MASTERS;
}

export function master(slot: string): ImageMetadata | undefined {
  return MASTERS[slot];
}

/** Build the WebP + JPEG srcsets for a slot, widest first. */
export async function responsive(slot: string): Promise<Responsive | null> {
  const src = MASTERS[slot];
  if (!src) return null;

  // clamp rather than drop: a rung wider than the master collapses onto the
  // master's own width so the largest size on offer is still the sharpest one
  const ladder = (WIDTHS[slot] ?? DEFAULT_WIDTHS).map((w) => Math.min(w, src.width));
  const widths = [...new Set(ladder)].sort((a, b) => b - a);

  const make = async (format: "webp" | "jpeg") =>
    Promise.all(widths.map(async (width) => {
      const img = await getImage({ src, width, format, quality: format === "webp" ? 76 : 78 });
      return `${img.src} ${width}w`;
    }));

  const [webp, jpg] = await Promise.all([make("webp"), make("jpeg")]);
  const widest = await getImage({ src, width: widths[0], format: "jpeg", quality: 78 });

  return {
    src: widest.src,
    webp: webp.join(", "),
    jpg: jpg.join(", "),
    width: widths[0],
    height: Math.round((widths[0] / src.width) * src.height),
  };
}
