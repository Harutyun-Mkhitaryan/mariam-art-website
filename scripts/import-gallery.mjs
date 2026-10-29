/**
 * Import the prepared, numbered gallery photographs once:
 * node scripts/import-gallery.mjs "C:/path/to/WEB-SITE GALLERY FOTO"
 * The generated WebP files and the catalog are committed with the site. This
 * script is an import tool; ordinary site builds do not depend on its source.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = process.argv[2];
if (!SOURCE) throw new Error("Pass the folder containing the numbered JPEG photographs.");

const categories = [
  { id: "botanical", name: { en: "Botanical / Mixed Media", ru: "Ботаника / Смешанная техника", hy: "Բուսական / Խառը տեխնիկա" }, tagline: { en: "Nature in a new light", ru: "Природа в новом свете", hy: "Բնությունը նոր լույսի ներքո" } },
  { id: "cups", name: { en: "Hand-painted Cups", ru: "Расписные чашки", hy: "Ձեռքով նկարված բաժակներ" }, tagline: { en: "Art for everyday rituals", ru: "Искусство для повседневных ритуалов", hy: "Արվեստ՝ առօրյա ծեսերի համար" } },
  { id: "clothing", name: { en: "Hand-painted Clothing", ru: "Расписная одежда", hy: "Ձեռքով նկարված հագուստ" }, tagline: { en: "Art you can wear", ru: "Искусство, которое можно носить", hy: "Արվեստ, որը կարելի է կրել" } },
  { id: "portraits", name: { en: "Portraits", ru: "Портреты", hy: "Դիմանկարներ" }, tagline: { en: "People and studies", ru: "Люди и наброски", hy: "Մարդիկ և էսքիզներ" } },
  { id: "drawings", name: { en: "Drawings", ru: "Рисунки", hy: "Նկարներ" }, tagline: { en: "Studies in line and light", ru: "Линия, форма и свет", hy: "Գիծ, ձև և լույս" } },
  { id: "landscapes", name: { en: "Landscapes", ru: "Пейзажи", hy: "Բնանկարներ" }, tagline: { en: "Places and open skies", ru: "Места и простор", hy: "Վայրեր և բաց երկինք" } },
  { id: "oil", name: { en: "Paintings", ru: "Живопись", hy: "Գեղանկարներ" }, tagline: { en: "Colour and composition", ru: "Цвет и композиция", hy: "Գույն և հորինվածք" } },
];

// Each list is one work. Repeated entries are alternate photographs of that work.
const groups = {
  cups: [[1], [2], [3], [4], [6], [8], [9], [10], [11], [12], [13], [14, 15]],
  clothing: [[68], [76, 77]],
  portraits: [[17], [18], [20], [21], [22], [23], [24], [25], [26], [28], [29], [30], [32], [34], [36], [51], [63], [92]],
  drawings: [[16], [38], [39], [40, 41], [42], [43], [44], [45], [46, 47], [48], [49], [50], [52], [53], [54, 56], [55, 57], [59], [60], [61], [62], [64], [65], [66], [67], [69, 70], [71], [72], [73]],
  landscapes: [[31], [74], [75]],
  oil: [[27], [33], [84], [85], [86], [87], [89], [90]],
  botanical: [[37], [80], [81]],
};

const prefix = {
  botanical: { en: "Mixed Media", ru: "Смешанная техника", hy: "Խառը տեխնիկա" },
  cups: { en: "Cup", ru: "Чашка", hy: "Բաժակ" },
  clothing: { en: "Clothing", ru: "Одежда", hy: "Հագուստ" },
  portraits: { en: "Portrait", ru: "Портрет", hy: "Դիմանկար" },
  drawings: { en: "Drawing", ru: "Рисунок", hy: "Նկար" },
  landscapes: { en: "Landscape", ru: "Пейзаж", hy: "Բնանկար" },
  oil: { en: "Painting", ru: "Работа", hy: "Գեղանկար" },
};
const describe = (category, serial) => ({
  en: `This original artwork, ${prefix[category].en} ${serial}, is presented in the Mariam-Art portfolio gallery.`,
  ru: `Работа «${prefix[category].ru} ${serial}» представлена в галерее портфолио Mariam-Art.`,
  hy: `«${prefix[category].hy} ${serial}» աշխատանքը ներկայացված է Mariam-Art պորտֆոլիոյի պատկերասրահում։`,
});

const sourceFiles = await fs.readdir(SOURCE);
const fileByNumber = new Map(sourceFiles
  .map((file) => [Number(path.parse(file).name), file])
  .filter(([number, file]) => Number.isInteger(number) && /\.jpe?g$/i.test(file)));
const destination = path.join(ROOT, "public", "assets", "artworks");
await fs.mkdir(destination, { recursive: true });

const assigned = [];
const items = [];
const featured = new Set(["cups-01", "clothing-01", "portraits-01", "drawings-01", "oil-01"]);

for (const category of categories) {
  const sets = groups[category.id] ?? [];
  for (const [index, numbers] of sets.entries()) {
    const slug = `${category.id}-${String(index + 1).padStart(2, "0")}`;
    const outputNames = [];
    for (const [view, number] of numbers.entries()) {
      const original = fileByNumber.get(number);
      if (!original) throw new Error(`Photo ${number} is missing from ${SOURCE}`);
      if (assigned.includes(number)) throw new Error(`Photo ${number} is assigned more than once`);
      assigned.push(number);
      const filename = view === 0 ? `${slug}.webp` : `${slug}-detail-${view}.webp`;
      await sharp(path.join(SOURCE, original))
        .rotate()
        .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(path.join(destination, filename));
      outputNames.push(filename);
    }

    const serial = String(index + 1).padStart(2, "0");
    items.push({
      slug,
      category: category.id,
      ...(featured.has(slug) ? { featured: true } : {}),
      images: { main: outputNames[0], details: outputNames.slice(1) },
      updated: "2026-10-29",
      title: Object.fromEntries(Object.entries(prefix[category.id]).map(([locale, value]) => [locale, `${value} ${serial}`])),
      description: describe(category.id, serial),
    });
  }
}

const actualNumbers = [...fileByNumber.keys()].sort((a, b) => a - b);
const unassigned = actualNumbers.filter((number) => !assigned.includes(number));
if (unassigned.length) throw new Error(`Photos not assigned to a category: ${unassigned.join(", ")}`);

const howto = [
  "Каталог и обработанные изображения собраны скриптом scripts/import-gallery.mjs.",
  "Для следующего импорта передайте ему папку с нумерованными JPG/JPEG: node scripts/import-gallery.mjs \"путь/к/фото\".",
  "Скрипт проверяет, что каждое фото назначено ровно один раз, сжимает изображения в WebP и обновляет этот файл.",
  "После импорта запустите npm run build.",
  "Названия пока нейтральные и пронумерованы; можно заменить их на утверждённые названия работ.",
];
await fs.writeFile(path.join(ROOT, "src", "data", "artworks.json"), `${JSON.stringify({ _howto: howto, categories, items }, null, 2)}\n`, "utf8");
console.log(`Imported ${assigned.length} photographs into ${items.length} numbered artwork records.`);
