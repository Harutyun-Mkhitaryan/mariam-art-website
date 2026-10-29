import { PAGES, PAGE_SEG, TODAY, artworkUrl, asset, url } from "./config";
import { field, tr, trRaw } from "./i18n";
import { CATEGORIES, ITEMS, category, countIn, itemsSorted } from "./artworks";

export interface Entry {
  type: "work" | "category" | "page" | "faq";
  title: string;
  subtitle: string;
  text: string;
  tags: string[];
  url: string;
  image: string;
  weight: number;
}

/** Which copy from each page feeds the free-text field of its search entry. */
const PAGE_TEXT: Record<string, string[]> = {
  home: ["home.heroBody", "home.aboutBody", "home.valuesBody",
         "home.bannerQuote", "brand.tagline", "home.worksKicker"],
  gallery: ["gallery.body", "gallery.quote", "gallery.description"],
  about: ["about.body", "about.quote", "about.processBody", "about.studioBody",
          "about.step1Body", "about.step2Body", "about.step3Body", "about.step4Body"],
  contact: ["contact.body", "contact.detailsKicker", "contact.followQuote",
            "contact.description"],
};

export function buildIndex(locale: string) {
  const entries: Entry[] = [];

  for (const a of itemsSorted()) {
    const cat = category(a.category);
    entries.push({
      type: "work",
      title: field(a.title, locale),
      subtitle: [field(cat.name, locale), a.year].filter(Boolean).join(" · "),
      text: [field(a.description, locale), a.medium ? field(a.medium, locale) : "",
             a.size?.cm ?? "", a.year ? String(a.year) : ""].filter(Boolean).join(" "),
      tags: [field(cat.name, locale),
             ...(a.availability ? [tr(locale, "artwork." + (a.availability === "sold" ? "sold" : "available"))] : [])],
      url: artworkUrl(locale, a.slug),
      image: a.images?.main ? asset("artworks/" + a.images.main) : "",
      weight: a.featured ? 30 : 10,
    });
  }

  for (const c of CATEGORIES) {
    entries.push({
      type: "category",
      title: field(c.name, locale),
      subtitle: field(c.tagline, locale),
      text: ITEMS.filter((a) => a.category === c.id)
                 .map((a) => field(a.title, locale)).join(" "),
      tags: [String(countIn(c.id))],
      url: url(locale, "gallery") + "?c=" + c.id,
      image: "",
      weight: 18,
    });
  }

  for (const key of PAGES) {
    entries.push({
      type: "page",
      title: tr(locale, "nav." + key),
      subtitle: tr(locale, `${key}.title`),
      text: PAGE_TEXT[key].map((k) => tr(locale, k)).join(" "),
      tags: [],
      url: url(locale, PAGE_SEG[key]),
      image: "",
      weight: 24,
    });
  }

  for (const q of trRaw<{ q: string; a: string }[]>(locale, "contact.faq") ?? []) {
    entries.push({
      type: "faq",
      title: q.q,
      subtitle: tr(locale, "contact.faqTitle"),
      text: q.a,
      tags: [],
      url: url(locale, "contact") + "#main",
      image: "",
      weight: 6,
    });
  }

  return { locale, built: TODAY, entries };
}
