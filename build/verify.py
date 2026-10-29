#!/usr/bin/env python3
"""Drive the built site in a real browser: screenshots per page/theme/viewport,
plus functional checks for search, theme, filters, drawer and the form."""
import asyncio, http.server, functools, json, os, socketserver, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
SHOTS = os.path.join(ROOT, "shots")
PORT = 8322
CFG = json.load(open(os.path.join(ROOT, "site.config.json"), encoding="utf-8"))
BASE = CFG["site"]["basePath"].rstrip("/")


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves dist/ as if it sat at basePath, the way GitHub Pages does."""

    def translate_path(self, path):
        if BASE and (path == BASE or path.startswith(BASE + "/")):
            path = path[len(BASE):] or "/"
        return super().translate_path(path)


def serve():
    handler = functools.partial(Handler, directory=DIST)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


async def main():
    from playwright.async_api import async_playwright
    os.makedirs(SHOTS, exist_ok=True)
    origin = f"http://127.0.0.1:{PORT}{BASE}"
    problems, log = [], []

    async with async_playwright() as pw:
        exe = next(iter(sorted(__import__("glob").glob("/opt/pw-browsers/chromium*/chrome-linux/chrome"))), "")
        browser = await pw.chromium.launch(executable_path=exe if os.path.exists(exe) else None)

        async def new_page(width, height, theme=None):
            ctx = await browser.new_context(viewport={"width": width, "height": height},
                                            device_scale_factor=1,
                                            color_scheme="dark" if theme != "light" else "light")
            pg = await ctx.new_page()
            pg.on("console", lambda m: problems.append(f"console {m.type}: {m.text}")
                  if m.type == "error" else None)
            pg.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
            # ERR_ABORTED just means the script navigated away mid-request
            pg.on("requestfailed", lambda r: None if "ERR_ABORTED" in (r.failure or "")
                  else problems.append(f"request failed: {r.url.replace(origin, '')} — {r.failure}"))
            return ctx, pg

        # ---------------------------------------------------- screenshots
        targets = [("home", "/en/"), ("gallery", "/en/gallery/"),
                   ("artwork", "/en/gallery/whispers-of-nature/"),
                   ("about", "/en/about/"), ("contact", "/en/contact/")]

        for theme in ("dark", "light"):
            for name, path in targets:
                ctx, pg = await new_page(1440, 1000, theme)
                await pg.goto(origin + path, wait_until="networkidle")
                if theme == "light":
                    await pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
                else:
                    await pg.evaluate("document.documentElement.setAttribute('data-theme','dark')")
                await pg.wait_for_timeout(500)
                await pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in'))")
                # walk the page so every lazy image starts loading, then settle
                await pg.evaluate("""async () => {
                  // a full-page shot renders everything, so nothing should stay lazy
                  document.querySelectorAll('img[loading="lazy"]')
                    .forEach(i => { i.loading = "eager"; });
                  for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
                    window.scrollTo(0, y);
                    await new Promise(r => setTimeout(r, 120));
                  }
                  window.scrollTo(0, 0);
                  // bounded: a lazy image that never enters the viewport never fires
                  await Promise.race([
                    Promise.all([...document.images].filter(i => !i.complete)
                      .map(i => new Promise(r => { i.onload = i.onerror = r; }))),
                    new Promise(r => setTimeout(r, 2500)),
                  ]);
                  await Promise.race([
                    Promise.all([...document.images].map(i => i.decode().catch(() => {}))),
                    new Promise(r => setTimeout(r, 2500)),
                  ]);
                }""")
                await pg.wait_for_timeout(350)
                await pg.screenshot(path=f"{SHOTS}/{name}-{theme}.png", full_page=True)
                await ctx.close()
            log.append(f"desktop {theme}: {len(targets)} shots")

        # mobile
        for name, path in targets:
            ctx, pg = await new_page(390, 844, "dark")
            await pg.goto(origin + path, wait_until="networkidle")
            await pg.wait_for_timeout(400)
            await pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in'))")
            await pg.evaluate("""async () => {
              document.querySelectorAll('img[loading="lazy"]')
                .forEach(i => { i.loading = "eager"; });
              for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
                window.scrollTo(0, y);
                await new Promise(r => setTimeout(r, 100));
              }
              window.scrollTo(0, 0);
              await Promise.race([
                Promise.all([...document.images].filter(i => !i.complete)
                  .map(i => new Promise(r => { i.onload = i.onerror = r; }))),
                new Promise(r => setTimeout(r, 2500)),
              ]);
              await Promise.race([
                Promise.all([...document.images].map(i => i.decode().catch(() => {}))),
                new Promise(r => setTimeout(r, 2500)),
              ]);
            }""")
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"{SHOTS}/m-{name}-dark.png", full_page=True)
            await ctx.close()
        log.append(f"mobile dark: {len(targets)} shots")

        # other locales, above the fold only
        for loc in ("ru", "hy"):
            ctx, pg = await new_page(1440, 1000, "dark")
            await pg.goto(f"{origin}/{loc}/", wait_until="networkidle")
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f"{SHOTS}/home-{loc}.png")
            await ctx.close()

        # ------------------------------------------------------ behaviour
        ctx, pg = await new_page(1440, 1000, "dark")

        # search: keyboard shortcut, results, keyboard nav, navigation
        await pg.goto(origin + "/en/", wait_until="networkidle")
        await pg.keyboard.press("Control+k")
        await pg.wait_for_selector("[data-search][data-open='true']", timeout=3000)
        await pg.fill("[data-search-input]", "golden")
        await pg.wait_for_timeout(500)
        hits = await pg.locator(".search__item").count()
        log.append(f"search 'golden': {hits} hits")
        if hits == 0:
            problems.append("search returned nothing for 'golden'")
        await pg.screenshot(path=f"{SHOTS}/search-overlay.png")

        # typo tolerance
        await pg.fill("[data-search-input]", "botanicl")
        await pg.wait_for_timeout(500)
        fuzzy = await pg.locator(".search__item").count()
        log.append(f"search typo 'botanicl': {fuzzy} hits")
        if fuzzy == 0:
            problems.append("fuzzy search failed on 'botanicl'")

        # Russian query on the Russian page
        await pg.keyboard.press("Escape")
        await pg.goto(origin + "/ru/", wait_until="networkidle")
        await pg.keyboard.press("Control+k")
        await pg.fill("[data-search-input]", "золот")
        await pg.wait_for_timeout(600)
        ru_hits = await pg.locator(".search__item").count()
        log.append(f"search ru 'золот': {ru_hits} hits")
        if ru_hits == 0:
            problems.append("Russian search returned nothing")

        # Armenian query
        await pg.keyboard.press("Escape")
        await pg.goto(origin + "/hy/", wait_until="networkidle")
        await pg.keyboard.press("Control+k")
        await pg.fill("[data-search-input]", "ոսկե")
        await pg.wait_for_timeout(600)
        hy_hits = await pg.locator(".search__item").count()
        log.append(f"search hy 'ոսկե': {hy_hits} hits")
        if hy_hits == 0:
            problems.append("Armenian search returned nothing")

        # arrow + enter navigates
        await pg.keyboard.press("ArrowDown")
        await pg.keyboard.press("Enter")
        await pg.wait_for_load_state("networkidle")
        if "/hy/" not in pg.url:
            problems.append(f"search enter went somewhere odd: {pg.url}")
        log.append(f"search enter → {pg.url.replace(origin, '')}")

        # theme toggle persists across navigation
        await pg.goto(origin + "/en/", wait_until="networkidle")
        await pg.click("[data-theme-toggle]")
        await pg.wait_for_timeout(200)
        t1 = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
        await pg.goto(origin + "/en/gallery/", wait_until="networkidle")
        t2 = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
        log.append(f"theme toggle: {t1} → persists as {t2}")
        if t1 != t2:
            problems.append("theme did not persist across pages")

        # gallery filter + sort + url state
        await pg.goto(origin + "/en/gallery/", wait_until="networkidle")
        total = await pg.locator("[data-card]:visible").count()
        await pg.click("[data-filter='cups']")
        await pg.wait_for_timeout(300)
        filtered = await pg.locator("[data-card]:visible").count()
        url_now = pg.url
        log.append(f"filter cups: {total} → {filtered} cards, url={url_now.replace(origin, '')}")
        if filtered == 0 or filtered >= total:
            problems.append("gallery filter did not narrow the grid")
        if "c=cups" not in url_now:
            problems.append("gallery filter did not write the URL")

        await pg.select_option("[data-gallery-sort]", "title")
        await pg.wait_for_timeout(300)
        await pg.click("[data-filter='all']")
        await pg.wait_for_timeout(300)
        first = await pg.locator("[data-card]:visible").first.get_attribute("data-title")
        log.append(f"sort by title → first card: {first}")

        # deep link with a filter in the URL
        await pg.goto(origin + "/en/gallery/?c=portraits", wait_until="networkidle")
        await pg.wait_for_timeout(300)
        deep = await pg.locator("[data-card]:visible").count()
        log.append(f"deep link ?c=portraits: {deep} cards")
        if deep == 0:
            problems.append("deep-linked filter showed nothing")

        # contact form validation + subject prefill
        await pg.goto(origin + "/en/gallery/whispers-of-nature/", wait_until="networkidle")
        await pg.click("a.btn")
        await pg.wait_for_load_state("networkidle")
        subj = await pg.input_value("[data-subject-field]")
        log.append(f"inquiry prefill: {subj!r}")
        if "Whispers" not in subj:
            problems.append("inquiry subject was not carried to the contact form")
        await pg.click("[data-form-submit]")
        await pg.wait_for_timeout(300)
        invalid = await pg.locator(".field[data-invalid='true']").count()
        log.append(f"empty submit flagged {invalid} fields")
        if invalid < 2:
            problems.append("form validation did not flag the empty required fields")
        await pg.screenshot(path=f"{SHOTS}/form-validation.png")

        await ctx.close()

        # mobile drawer
        ctx, pg = await new_page(390, 844, "dark")
        await pg.goto(origin + "/en/", wait_until="networkidle")
        await pg.click("[data-drawer-open]")
        await pg.wait_for_timeout(500)
        open_state = await pg.get_attribute("[data-drawer]", "data-open")
        log.append(f"mobile drawer opens: {open_state}")
        if open_state != "true":
            problems.append("mobile drawer did not open")
        await pg.screenshot(path=f"{SHOTS}/m-drawer.png")
        await ctx.close()

        await browser.close()

    print("\n=== BEHAVIOUR ===")
    for l in log:
        print("  ·", l)
    uniq = sorted(set(problems))
    print(f"\n=== PROBLEMS ({len(uniq)}) ===")
    print("\n".join("  ✗ " + p for p in uniq) or "  none")
    return 1 if uniq else 0


if __name__ == "__main__":
    httpd = serve()
    try:
        sys.exit(asyncio.run(main()))
    finally:
        httpd.shutdown()
