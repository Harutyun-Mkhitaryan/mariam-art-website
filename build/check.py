#!/usr/bin/env python3
"""Static audit of dist/: markup sanity, links, SEO tags, hreflang reciprocity,
asset references, search index integrity, accessibility basics."""
import json, os, re, sys, glob
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
CFG = json.load(open(os.path.join(ROOT, "site.config.json"), encoding="utf-8"))
BASE = CFG["site"]["basePath"].rstrip("/")
DOMAIN = CFG["site"]["domain"].rstrip("/")
LOCALES = CFG["site"]["locales"]

errors, warnings, notes = [], [], []
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Doc(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.unclosed = []
        self.links, self.imgs, self.srcs = [], [], []
        self.meta, self.props = {}, {}
        self.alts, self.hreflang, self.canonical = [], {}, None
        self.title = None
        self.in_title = False
        self.h1 = 0
        self.ld = []
        self.in_ld = False
        self.labels = 0
        self.inputs = []
        self.lang = None
        self.buttons_no_text = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in VOID and tag not in ("html", "body"):
            self.stack.append((tag, self.getpos()))
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.h1 += 1
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
        if tag == "img":
            self.imgs.append(a)
            if a.get("src"):
                self.srcs.append(a["src"])
        if tag in ("source", "script", "use") and (a.get("src") or a.get("srcset") or a.get("href")):
            for v in (a.get("src"), a.get("href")):
                if v:
                    self.srcs.append(v)
            if a.get("srcset"):
                for part in a["srcset"].split(","):
                    u = part.strip().split(" ")[0]
                    if u:
                        self.srcs.append(u)
        if tag == "link":
            rel = (a.get("rel") or "").lower()
            if rel == "canonical":
                self.canonical = a.get("href")
            if rel == "alternate" and a.get("hreflang"):
                self.hreflang[a["hreflang"]] = a.get("href")
            if rel in ("stylesheet", "icon", "apple-touch-icon", "manifest") and a.get("href"):
                self.srcs.append(a["href"])
        if tag == "meta":
            if a.get("name"):
                self.meta[a["name"]] = a.get("content", "")
            if a.get("property"):
                self.props[a["property"]] = a.get("content", "")
        if tag == "script" and a.get("type") == "application/ld+json":
            self.in_ld = True
        if tag == "label":
            self.labels += 1
        if tag in ("input", "textarea", "select"):
            self.inputs.append(a)

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "script":
            self.in_ld = False
        if tag in VOID or tag in ("html", "body"):
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                if i != len(self.stack) - 1:
                    self.unclosed.extend(self.stack[i + 1:])
                del self.stack[i:]
                return
        self.unclosed.append((tag + " (stray close)", self.getpos()))

    def handle_data(self, data):
        if self.in_title:
            self.title = (self.title or "") + data
        if self.in_ld and data.strip():
            self.ld.append(data)


def local_path(href):
    """Map a site-absolute URL to a file in dist/, or None if external/anchor."""
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    p = urlparse(href)
    if p.scheme or p.netloc:
        return None
    path = unquote(p.path)
    if not path.startswith("/"):
        return None
    if BASE and path.startswith(BASE + "/"):
        path = path[len(BASE):]
    elif BASE and path == BASE:
        path = "/"
    f = os.path.join(DIST, path.lstrip("/"))
    if path.endswith("/"):
        f = os.path.join(f, "index.html")
    return f


def main():
    pages = sorted(glob.glob(os.path.join(DIST, "**", "*.html"), recursive=True))
    if not pages:
        print("no pages — run build.py first")
        return 1

    seen_titles, seen_desc = {}, {}
    for path in pages:
        rel = "/" + os.path.relpath(path, DIST).replace(os.sep, "/")
        src = open(path, encoding="utf-8").read()
        d = Doc()
        try:
            d.feed(src)
            d.close()
        except Exception as e:
            errors.append(f"{rel}: parser blew up — {e}")
            continue

        if d.stack:
            errors.append(f"{rel}: unclosed tags {[t for t, _ in d.stack][:6]}")
        if d.unclosed:
            errors.append(f"{rel}: mismatched tags {[t for t, _ in d.unclosed][:6]}")

        is_404 = rel.endswith("/404.html")
        is_root = rel == "/index.html"

        # --- SEO essentials
        if not d.title:
            errors.append(f"{rel}: no <title>")
        elif len(d.title) > 65 and not is_404:
            warnings.append(f"{rel}: title {len(d.title)} chars — over 65")
        desc = d.meta.get("description", "")
        if not is_root:
            if not desc:
                errors.append(f"{rel}: no meta description")
            elif not (60 <= len(desc) <= 175):
                warnings.append(f"{rel}: description {len(desc)} chars (aim 60–175)")
        if not d.canonical and not is_404:
            errors.append(f"{rel}: no canonical")
        if d.canonical and not d.canonical.startswith(DOMAIN):
            errors.append(f"{rel}: canonical is not absolute — {d.canonical}")
        if d.h1 == 0 and not is_root:
            errors.append(f"{rel}: no <h1>")
        elif d.h1 > 1:
            errors.append(f"{rel}: {d.h1} <h1> elements")
        if not d.lang:
            errors.append(f"{rel}: <html> has no lang")
        if not is_root and not is_404:
            for need in ("og:title", "og:description", "og:image", "og:url", "og:type"):
                if need not in d.props:
                    errors.append(f"{rel}: missing {need}")
            if "twitter:card" not in d.meta:
                warnings.append(f"{rel}: no twitter:card")

        # duplicate title / description across the same locale
        if d.title and not is_404 and not is_root:
            if d.title in seen_titles:
                warnings.append(f"{rel}: title duplicates {seen_titles[d.title]}")
            else:
                seen_titles[d.title] = rel
            if desc in seen_desc:
                warnings.append(f"{rel}: description duplicates {seen_desc[desc]}")
            else:
                seen_desc[desc] = rel

        # --- hreflang set
        if not is_404 and not is_root:
            for l in LOCALES:
                if l not in d.hreflang:
                    errors.append(f"{rel}: hreflang missing {l}")
            if "x-default" not in d.hreflang:
                errors.append(f"{rel}: hreflang missing x-default")
            for l, href in d.hreflang.items():
                f = local_path(href.replace(DOMAIN, ""))
                if f and not os.path.exists(f):
                    errors.append(f"{rel}: hreflang {l} points at a missing page — {href}")

        # --- JSON-LD parses
        for block in d.ld:
            try:
                json.loads(block)
            except Exception as e:
                errors.append(f"{rel}: JSON-LD is invalid — {e}")

        # --- links resolve
        for href in d.links:
            f = local_path(href)
            if f and not os.path.exists(f):
                errors.append(f"{rel}: dead link {href}")

        # --- assets resolve
        for s in d.srcs:
            if s.startswith(("http:", "https:", "data:")):
                continue
            f = local_path(s.split("#")[0])
            if f and not os.path.exists(f):
                errors.append(f"{rel}: missing asset {s}")

        # --- accessibility basics
        for img in d.imgs:
            if "alt" not in img:
                errors.append(f"{rel}: <img> without alt — {img.get('src', '?')}")
            if img.get("src") and (not img.get("width") or not img.get("height")):
                notes.append(f"{rel}: <img> without dimensions — {img.get('src', '?')[:60]}")
            # a zero width/height collapses the box through aspect-ratio
            for dim in ("width", "height"):
                v = img.get(dim)
                if v is not None and v.strip().isdigit() and int(v) == 0:
                    errors.append(f"{rel}: <img> {dim}=0 — {img.get('src', '?')[:60]}")
            st = img.get("style") or ""
            if re.search(r"aspect-ratio\s*:\s*[^;]*\b0\b", st):
                errors.append(f"{rel}: <img> has a zero aspect-ratio — {img.get('src', '?')[:60]}")
        for inp in d.inputs:
            typ = (inp.get("type") or "text").lower()
            if typ in ("hidden", "submit", "button", "checkbox"):
                continue
            if not (inp.get("aria-label") or inp.get("id") or inp.get("placeholder")):
                errors.append(f"{rel}: form control with no label — {inp.get('name')}")

    # --- search indexes
    for loc in LOCALES:
        p = os.path.join(DIST, "assets", "search", f"{loc}.json")
        if not os.path.exists(p):
            errors.append(f"search index missing for {loc}")
            continue
        data = json.load(open(p, encoding="utf-8"))
        entries = data.get("entries", [])
        if len(entries) < 10:
            warnings.append(f"search/{loc}: only {len(entries)} entries")
        for e in entries:
            f = local_path(e["url"].split("?")[0].split("#")[0])
            if f and not os.path.exists(f):
                errors.append(f"search/{loc}: entry points nowhere — {e['url']}")
            if not e.get("title"):
                errors.append(f"search/{loc}: entry with no title")
        notes.append(f"search/{loc}: {len(entries)} entries, "
                     f"{os.path.getsize(p) // 1024} KB")

    # --- no third-party font or script host sneaks back into the head
    for path in pages:
        rel = "/" + os.path.relpath(path, DIST).replace(os.sep, "/")
        head = open(path, encoding="utf-8").read().split("</head>")[0]
        for host in ("fonts.googleapis.com", "fonts.gstatic.com"):
            if host in head:
                errors.append(f"{rel}: still loads fonts from {host}")

    # --- sitemap
    sm = os.path.join(DIST, "sitemap.xml")
    if os.path.exists(sm):
        body = open(sm, encoding="utf-8").read()
        locs = re.findall(r"<loc>(.*?)</loc>", body)
        # image sitemap: every listed photograph must exist
        pics = re.findall(r"<image:loc>(.*?)</image:loc>", body)
        missing = 0
        for u in pics:
            f = local_path(u.replace(DOMAIN, "").replace("&amp;", "&"))
            if f and not os.path.exists(f):
                errors.append(f"sitemap: image not found — {u}")
                missing += 1
        notes.append(f"sitemap images: {len(pics)} listed, {missing} missing")
        for u in locs:
            f = local_path(u.replace(DOMAIN, ""))
            if f and not os.path.exists(f):
                errors.append(f"sitemap: {u} has no page")
        html_pages = [p for p in pages
                      if not p.endswith(("404.html",)) and os.path.relpath(p, DIST) != "index.html"]
        if len(locs) != len(html_pages):
            warnings.append(f"sitemap lists {len(locs)} URLs but dist has {len(html_pages)} pages")
        notes.append(f"sitemap: {len(locs)} URLs")
    else:
        errors.append("sitemap.xml missing")

    for need in ("robots.txt", "site.webmanifest", "assets/icons.svg",
                 ".nojekyll", "404.html"):
        if not os.path.exists(os.path.join(DIST, need)):
            errors.append(f"missing {need}")

    # the stylesheet and the two scripts may be hashed by a bundler, so look for
    # the kinds of file rather than for fixed names
    for label, pattern, least in (("stylesheet", "**/*.css", 1), ("script", "**/*.js", 2)):
        found = glob.glob(os.path.join(DIST, "assets", pattern), recursive=True)
        if len(found) < least:
            errors.append(f"expected at least {least} {label} file(s) under assets/")

    total = sum(os.path.getsize(os.path.join(dp, f))
                for dp, _, fs in os.walk(DIST) for f in fs)
    notes.append(f"dist: {len(pages)} pages, {total / 1048576:.1f} MB total")

    print("\n=== ERRORS ===")
    print("\n".join("  ✗ " + e for e in errors) or "  none")
    print(f"\n=== WARNINGS ({len(warnings)}) ===")
    print("\n".join("  ! " + w for w in warnings[:40]) or "  none")
    if len(warnings) > 40:
        print(f"  … and {len(warnings) - 40} more")
    print("\n=== NOTES ===")
    print("\n".join("  · " + n for n in notes[:14]))
    print(f"\n{len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
