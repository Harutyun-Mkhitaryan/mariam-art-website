import en from "../data/i18n/en.json";
import ru from "../data/i18n/ru.json";
import hy from "../data/i18n/hy.json";
import { DEFAULT_LOCALE, LOCALES } from "./config";

type Dict = Record<string, any>;

export const DICTS: Record<string, Dict> = { en, ru, hy };

function dig(source: Dict, path: string): unknown {
  let node: any = source;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in node) node = node[part];
    else return undefined;
  }
  return node;
}

/**
 * Look a dotted key up in the locale file, falling back to the default locale.
 * `vars` fills {placeholders}; a missing key returns the key itself so a typo
 * is loud on the page rather than silently empty.
 */
export function tr(locale: string, path: string, vars?: Record<string, string | number>): string {
  for (const source of [DICTS[locale], DICTS[DEFAULT_LOCALE]]) {
    if (!source) continue;
    const found = dig(source, path);
    if (found === undefined) continue;
    if (typeof found !== "string") return found as unknown as string;
    if (!vars) return found;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), found);
  }
  return path;
}

/** Same lookup, but for a node that is an object or array rather than a string. */
export function trRaw<T = any>(locale: string, path: string): T {
  for (const source of [DICTS[locale], DICTS[DEFAULT_LOCALE]]) {
    const found = dig(source, path);
    if (found !== undefined) return found as T;
  }
  return undefined as unknown as T;
}

/** Pick a localised value out of {en, ru, hy}. */
export function field(obj: unknown, locale: string): string {
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, string>;
    return o[locale] || o[DEFAULT_LOCALE] || Object.values(o)[0] || "";
  }
  return (obj as string) || "";
}

export const localeMeta = (locale: string) => DICTS[locale].meta;

/** Every locale, for getStaticPaths. */
export const localePaths = () => LOCALES.map((locale) => ({ params: { locale } }));
