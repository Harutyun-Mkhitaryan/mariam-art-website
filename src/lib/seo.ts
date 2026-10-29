import {
  CONTACT, LOCALES, SITE, SOCIAL, absolute, artworkUrl, asset, url,
} from "./config";
import { field, tr, trRaw } from "./i18n";
import { category, type Artwork } from "./artworks";

type Ld = Record<string, unknown>;

const ARTIST_ID = () => absolute("/") + "#artist";

export function websiteLd(locale: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absolute(url(locale)) + "#website",
    name: SITE.name,
    inLanguage: locale,
    url: absolute(url(locale)),
    publisher: { "@id": ARTIST_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absolute(url(locale, "gallery")) + "?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function orgLd(locale: string, portrait: string): Ld {
  const sameAs = Object.entries(SOCIAL)
    .filter(([k, v]) => !k.startsWith("_") && v)
    .map(([, v]) => v);
  return {
    "@context": "https://schema.org",
    "@type": ["Person", "Organization"],
    "@id": ARTIST_ID(),
    name: SITE.artist,
    alternateName: SITE.name,
    jobTitle: "Visual artist",
    url: absolute(url(locale)),
    image: portrait,
    email: "mailto:" + CONTACT.email,
    telephone: CONTACT.phone,
    foundingDate: SITE.founded,
    address: {
      "@type": "PostalAddress",
      addressLocality: CONTACT.city,
      addressCountry: CONTACT.countryCode,
    },
    sameAs,
    knowsLanguage: LOCALES,
  };
}

export function breadcrumbLd(trail: [string, string][]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, u], i) => ({
      "@type": "ListItem", position: i + 1, name, item: absolute(u),
    })),
  };
}

export function artworkLd(locale: string, item: Artwork, fallbackImage: string): Ld {
  const cat = category(item.category);
  const main = item.images?.main;
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": absolute(artworkUrl(locale, item.slug)) + "#artwork",
    name: field(item.title, locale),
    description: field(item.description, locale),
    inLanguage: locale,
    url: absolute(artworkUrl(locale, item.slug)),
    image: main ? absolute(asset("artworks/" + main)) : fallbackImage,
    artform: field(cat.name, locale),
    creator: { "@id": ARTIST_ID() },
    isAccessibleForFree: true,
    ...(item.medium ? { artMedium: field(item.medium, locale) } : {}),
    ...(item.year ? { dateCreated: String(item.year) } : {}),
    ...(item.size ? {
      width: { "@type": "Distance", name: `${item.size.cm.split("×")[0].trim()} cm` },
      height: { "@type": "Distance", name: `${item.size.cm.split("×")[1]?.trim() ?? item.size.cm} cm` },
    } : {}),
    ...(item.availability ? {
      offers: {
        "@type": "Offer",
        availability: item.availability === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
        url: absolute(url(locale, "contact")),
        seller: { "@id": ARTIST_ID() },
      },
    } : {}),
  };
}

export function faqLd(locale: string): Ld {
  const faq = trRaw<{ q: string; a: string }[]>(locale, "contact.faq") ?? [];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({
      "@type": "Question", name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };
}

export function collectionLd(locale: string, works: Artwork[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: tr(locale, "gallery.title"),
    inLanguage: locale,
    url: absolute(url(locale, "gallery")),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: works.length,
      itemListElement: works.map((w, i) => ({
        "@type": "ListItem", position: i + 1,
        url: absolute(artworkUrl(locale, w.slug)),
        name: field(w.title, locale),
      })),
    },
  };
}

export function simpleLd(type: string, locale: string, seg: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": type,
    url: absolute(url(locale, seg)),
    inLanguage: locale,
    mainEntity: { "@id": ARTIST_ID() },
  };
}
