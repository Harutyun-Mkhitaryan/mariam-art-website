# Mariam-Art — сайт-портфолио (вариант Б: Astro)

Тот же сайт, что и вариант A, собранный заново на Astro 7.
Три языка (HY / RU / EN), поиск по всему сайту, тёмная и светлая темы,
SEO-разметка, форма обратной связи без бэкенда.

Обе версии выдают одинаковые страницы — сравнение скриншотов показывает
расхождение меньше 0,4 % пикселей (разница только в пережатии JPEG).

---

## 1. Что внутри

```
site-astro/
├─ site.config.json        ← ЕДИНСТВЕННЫЙ файл, который надо отредактировать
├─ astro.config.mjs        ← читает site.config.json: домен и basePath
├─ scripts/
│  ├─ prepare-images.mjs   ← кадрирует фотографии под слоты (sharp)
│  ├─ import-gallery.mjs   ← импортирует каталог и оптимизирует фото работ
│  └─ prepare-fonts.mjs    ← собирает свои .woff2 вместо Google Fonts
├─ integrations/
│  └─ prune-source-images.mjs  ← убирает из сборки неиспользуемые оригиналы
├─ src/
│  ├─ data/
│  │  ├─ artworks.json     ← все работы (добавлять сюда)
│  │  └─ i18n/             ← переводы hy.json / ru.json / en.json
│  ├─ images/              ← кадрированные мастер-файлы (создаются скриптом)
│  ├─ lib/                 ← config, i18n, artworks, images, seo, search, icons
│  ├─ components/          ← Header, Footer, WorkCard, Picture, SearchOverlay…
│  ├─ layouts/Base.astro   ← <head>, SEO, JSON-LD, шапка, подвал
│  ├─ pages/               ← маршруты (см. ниже)
│  ├─ styles/styles.css    ← та же вёрстка, что и в варианте A
│  └─ scripts/             ← main.js (темы, меню, фильтры, форма), search.js
├─ public/                 ← .nojekyll, _headers, иконки, шрифты
├─ build/                  ← check.py и verify.py (те же проверки)
└─ dist/                   ← ГОТОВЫЙ САЙТ (то, что заливается на хостинг)
```

Маршруты:

| Файл | Адреса |
|---|---|
| `pages/index.astro` | `/` — выбор языка и редирект |
| `pages/[locale]/index.astro` | `/hy/`, `/ru/`, `/en/` |
| `pages/[locale]/gallery/index.astro` | `/…/gallery/` |
| `pages/[locale]/gallery/[slug].astro` | страница каждой работы (74 × 3) |
| `pages/[locale]/about.astro` | `/…/about/` |
| `pages/[locale]/contact.astro` | `/…/contact/` |
| `pages/404.astro` | `/404.html` |
| `pages/sitemap.xml.ts` | `/sitemap.xml` с hreflang |
| `pages/robots.txt.ts` | `/robots.txt` |
| `pages/site.webmanifest.ts` | манифест PWA |
| `pages/assets/icons.svg.ts` | спрайт иконок |
| `pages/assets/favicon.svg.ts` | фавикон |
| `pages/assets/search/[locale].json.ts` | поисковый индекс на каждый язык |

Всего 236 страниц, включая локализованные страницы работ.

---

## 2. Быстрый старт

```bash
cd site-astro
npm install
npm run dev        # http://localhost:4321
npm run build      # собирает в dist/
npm run preview    # посмотреть готовую сборку
```

`npm run build` сначала запускает `prepare-images.mjs`, потом `astro build`.

Отдельно, только когда нужно пересобрать ресурсы:

```bash
npm run prepare:images   # кадрирование фотографий
npm run prepare:fonts    # сборка .woff2 из пакетов @fontsource
```

---

## 3. Фотографии

Astro умеет менять размер и формат, но не умеет кадрировать под нужную
пропорцию с выбранной точкой фокуса. Поэтому кадрирование сделано один раз
скриптом `scripts/prepare-images.mjs` (sharp) — он кладёт мастер-файлы в
`src/images/`. Дальше Astro сам делает WebP и JPEG в трёх размерах с
`srcset` и хешированными именами.

Astro при этом кладёт в сборку и сам мастер-файл, хотя на него никто не
ссылается, — это ~3 МБ мёртвого веса. `integrations/prune-source-images.mjs`
после сборки проходит по `dist/`, собирает все упомянутые имена файлов и
удаляет то, на что нет ни одной ссылки.

Мастер-файлы уже лежат в `src/images/` — скрипт их не трогает. Чтобы
пересобрать с нуля, нужны исходные фотографии:

```bash
PHOTO_SRC=/путь/к/исходникам node scripts/prepare-images.mjs --force
```

Список слотов и точек фокуса — в начале скрипта, в константе `SLOTS`.

---

## 4. Шрифты

Ничего не грузится с `fonts.googleapis.com`. `scripts/prepare-fonts.mjs`
берёт файлы из пакетов `@fontsource`, оставляет только нужные подмножества
(латиница, кириллица, армянский — вьетнамский выброшен) и пишет
`public/assets/fonts/` + один `fonts.css` с относительными путями, поэтому он
одинаково работает при любом `basePath` и в обеих версиях проекта.

`unicode-range` не даёт браузеру скачать армянские начертания на русской
странице и наоборот, а два нужных файла для текущего языка стоят в `preload`.

Файлы сгенерированы и лежат в проекте — обычной сборке скрипт не нужен.

---

## 5. Перед публикацией — отредактировать `site.config.json`

Файл общий для обеих версий, поля те же.

### 5.1 Форма обратной связи (Web3Forms)

Получить бесплатный ключ на <https://web3forms.com> и вставить:

```json
"forms": { "web3formsAccessKey": "ВАШ-КЛЮЧ" }
```

### 5.2 Контакты и аккаунты

```json
"contact": { "email": "…", "phone": "…", "phoneHref": "…", "whatsapp": "374XXXXXXXX" },
"social":  { "instagram": "…", "facebook": "…", "whatsapp": "…", "pinterest": "" }
```

Пустая строка в `social` убирает иконку со всего сайта.

### 5.3 Адрес сайта

```json
"site": { "domain": "https://mariam-art.pages.dev", "basePath": "" }
```

`astro.config.mjs` берёт `domain` как `site` и `basePath` как `base`, так что
одного места правки достаточно: от него зависят `canonical`, `hreflang`,
`sitemap.xml`, Open Graph, JSON-LD и все внутренние ссылки.

### 5.4 Google Search Console и Bing

```json
"seo": {
  "googleSiteVerification": "значение content из HTML-тега Search Console",
  "bingSiteVerification": "значение content из msvalidate.01"
}
```

Только значение `content`, без всего тега. Пустая строка — метатег не
выводится. После подтверждения отправьте в Search Console адрес
`<домен>/sitemap.xml`.

---

## 6. Публикация

### 6.1 GitHub Pages

```json
"site": { "domain": "https://ВАШ-ЛОГИН.github.io", "basePath": "/mariam-art" }
```

```bash
npm run build
```

Дальше либо залить содержимое `dist/` в репозиторий и включить
**Settings → Pages → Deploy from a branch**, либо использовать готовый
workflow `.github/workflows/deploy-pages.yml` (**Settings → Pages →
Source: GitHub Actions**) — он сам соберёт проект при каждом push.

`.nojekyll` уже лежит в `public/` и попадает в сборку.

Сборка с `basePath` проверена: `python3 build/check.py` и
`python3 build/verify.py` проходят и в этом режиме.

### 6.2 Cloudflare Pages

```json
"site": { "domain": "https://mariam-art.pages.dev", "basePath": "" }
```

Подключить репозиторий и указать:

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 20 или новее

Или без Git: **Workers & Pages → Create → Pages → Upload assets** и
перетащить папку `dist`.

Файл `public/_headers` задаёт заголовки безопасности, годовой кэш для
хешированных ресурсов, недельный кэш для фотографий каталога и повторную
проверку HTML перед использованием.

### 6.3 Когда домен купится

Поменять `domain` в `site.config.json`, пересобрать, залить.

---

## 7. Как добавить работу

Каталог `src/data/artworks.json` содержит все работы, а фотографии после
импорта лежат в `public/assets/artworks/`.

Для первоначального импорта подготовленной папки с нумерованными JPEG/JPG:

```bash
npm run import:gallery -- "C:/путь/к/WEB-SITE GALLERY FOTO"
npm run build
```

Импорт проверяет, что каждое исходное фото назначено одной работе, объединяет
альтернативные ракурсы, сохраняет оптимизированные WebP и генерирует нейтральные
названия с номерами на трёх языках. Группы фото и категорий заданы в
`scripts/import-gallery.mjs`. После импорта названия можно уточнить вручную.

Отличие Astro-версии: данные **проверяются при сборке**. Если пропущен
перевод, указана несуществующая категория или два slug совпали, сборка
падает с понятным сообщением:

```
artworks.json: "whispers-of-nature" uses unknown category "oops"
  (known: botanical, cups, clothing, portraits, oil, landscapes)
```

---

## 8. Проверка качества

```bash
npx astro check        # типы и шаблоны
 npm run build         # статическая сборка Astro
npm run check          # разметка, ссылки, SEO, доступность
npm run verify         # браузерное поведение + скриншоты
```

`npm run verify` использует Python Playwright. Установите его и браузер Chromium
перед запуском: `python -m pip install playwright` и
`python -m playwright install chromium`.

---

## 9. Чем отличается от варианта A

| | Вариант A (HTML/CSS/JS) | Вариант Б (Astro) |
|---|---|---|
| Сборка | `python3 build/build.py` (только Pillow) | `npm run build` |
| Шаблоны | f-строки в одном Python-файле | компоненты `.astro` |
| Картинки | Pillow, фиксированные имена | sharp (кадрирование) + Astro (размеры и форматы), хешированные имена, неиспользуемые оригиналы вырезаются из сборки |
| CSS и JS | отдаются как есть | собираются с хешем в имени — кэш сбрасывается сам |
| Проверка данных | нет | zod-схема, падает при сборке |
| Типы | нет | TypeScript, `astro check` |
| Зависимости | Python + Pillow | Node + 201 npm-пакет (плюс 76 для `astro check`) |
| Размер `dist/` | 8,6 МБ | 8,8 МБ |
| Результат | одинаковый | одинаковый |

Вариант A проще: ни Node, ни npm, ни обновлений зависимостей — нужен только
Python. Вариант Б удобнее, если сайт будет расти: компоненты вместо строк,
проверка типов и данных при сборке, хеши в именах файлов.

---

## 10. Заглушки, которые нужно заменить

| Где | Что |
|---|---|
| `site.config.json → forms.web3formsAccessKey` | ключ Web3Forms |
| `site.config.json → contact` | почта, телефон, WhatsApp |
| `site.config.json → social` | Instagram, Facebook, WhatsApp |
| `site.config.json → site.domain` | адрес после покупки домена |
| `public/assets/artworks/` | настоящие фотографии работ |
