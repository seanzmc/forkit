// Downloads one example photo per suggested dish from Wikimedia Commons into
// assets/dishes/<slug>.jpg and records author and license in
// server/dish-photos.json. Run once, and again to replace a bad pick; the app
// never calls Wikimedia. No API key needed.
//
//   npx tsx scripts/fetch-dish-photos.ts                        # missing dishes only
//   npx tsx scripts/fetch-dish-photos.ts --only pad-thai         # refetch one
//   npx tsx scripts/fetch-dish-photos.ts --source "pad-thai=search:pad thai plate" --pick pad-thai=1
//
// Each dish's source is "wiki:<English Wikipedia title>" (the article's lead
// photo, usually exactly the dish) or "search:<words>" (a Commons file search).
// Only freely licensed Commons files are used (CC0, public domain, CC BY,
// CC BY-SA); photos are resized but not cropped.
//
// --only <slug,...>     (re)fetch just these dishes
// --source <slug>=<src> use a different source for this run
// --pick <slug>=<n>     take the nth acceptable search result (0-based)

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CUISINE_DISHES } from "../server/cuisine-dishes";
import { slugify, type DishPhoto } from "../server/dish-photos";

// Wikimedia asks API clients to identify themselves.
const UA = "ForkIt/1.0 (https://github.com/seanzmc/forkit)";
const ROOT = process.cwd(); // run from the repo root
const OUT_DIR = path.join(ROOT, "assets", "dishes");
const MANIFEST = path.join(ROOT, "server", "dish-photos.json");
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

// Default is "wiki:<dish name>". Generic names map to the closest article or
// a Commons search.
const SOURCES: Record<string, string> = {
  "acai-bowl": "search:acai bowl granola banana",
  "artisan-bread-board": "search:sliced sourdough bread loaf",
  "bacon-bbq-burger": "search:bacon cheeseburger onion rings",
  "banh-mi": "wiki:Bánh mì",
  "bbq-ribs": "search:barbecue pork ribs plate",
  "bibimbap": "search:dolsot bibimbap",
  "birria-tacos": "search:birria tacos consomme",
  "breakfast-sandwich": "search:egg bacon breakfast sandwich",
  "buddha-bowl": "search:quinoa bowl avocado",
  "buffalo-wings": "search:buffalo wings blue cheese celery",
  "bun-bo-hue": "wiki:Bún bò Huế",
  "carne-asada-burrito": "wiki:Burrito",
  "cauliflower-steak": "search:roasted cauliflower",
  "chicken-fried-steak": "wiki:Chicken fried steak",
  "chicken-katsu-curry": "search:katsu curry rice",
  "chicken-tenders": "wiki:Chicken fingers",
  "classic-cheeseburger": "wiki:Cheeseburger",
  "cobb-salad": "wiki:Cobb salad",
  "cold-brew-float": "search:coffee ice cream float",
  "crab-cakes": "wiki:Crab cake",
  "creme-brulee": "wiki:Crème brûlée",
  "dan-dan-noodles": "wiki:Dandan noodles",
  "dim-sum-platter": "search:dim sum steamer basket",
  "dragon-roll": "search:dragon roll sushi",
  "duck-confit": "wiki:Duck confit",
  "eggs-benedict": "search:eggs benedict hollandaise",
  "enchiladas-suizas": "wiki:Enchilada",
  "falafel-platter": "search:falafel plate hummus",
  "filet-mignon": "search:filet mignon steak plate",
  "fish-tacos": "wiki:Fish taco",
  "fresh-croissant-plate": "wiki:Croissant",
  "green-curry": "wiki:Green curry",
  "grilled-cheese-deluxe": "search:grilled cheese sandwich tomato soup",
  "reuben-sandwich": "wiki:Reuben sandwich",
  "grilled-salmon": "search:grilled salmon fillet plate",
  "grilled-sea-bass": "search:grilled sea bass plate",
  "impossible-burger": "wiki:Veggie burger",
  "iskender-kebab": "wiki:İskender kebap",
  "italian-sub": "wiki:Submarine sandwich",
  "jackfruit-tacos": "search:vegan tacos",
  "kebab-platter": "search:kebab plate rice",
  "korean-bbq-platter": "search:samgyeopsal grill",
  "lamb-biryani": "wiki:Biryani",
  "lamb-gyro": "wiki:Gyros",
  "lamb-shawarma": "search:shawarma plate",
  "latte-and-pastry": "search:cappuccino croissant",
  "mac-and-cheese": "wiki:Macaroni and cheese",
  "mango-sticky-rice": "wiki:Mango sticky rice",
  "margherita-pizza": "wiki:Pizza Margherita",
  "meat-lovers-pizza": "search:pepperoni sausage pizza",
  "meatloaf": "wiki:Meatloaf",
  "mezze-board": "wiki:Meze",
  "miso-ramen": "search:miso ramen bowl",
  "mixed-grill-platter": "wiki:Mixed grill",
  "mushroom-swiss-burger": "search:mushroom swiss burger",
  "nashville-hot-chicken": "wiki:Hot chicken",
  "omakase-selection": "search:nigiri sushi platter",
  "osso-buco": "wiki:Ossobuco",
  "pancake-stack": "search:stack of pancakes syrup",
  "pasta-carbonara": "wiki:Carbonara",
  "pepperoni-pizza": "search:pepperoni pizza slice",
  "philly-cheesesteak": "wiki:Cheesesteak",
  "pho-bo": "wiki:Phở",
  "pot-roast": "wiki:Pot roast",
  "pulled-pork-sandwich": "search:pulled pork sandwich",
  "quiche-lorraine": "wiki:Quiche",
  "rainbow-roll": "search:rainbow roll sushi",
  "ribeye-steak": "wiki:Rib eye steak",
  "risotto-ai-funghi": "search:risotto ai funghi",
  "salmon-sashimi": "search:salmon sashimi",
  "shakshuka": "wiki:Shakshouka",
  "shrimp-scampi": "search:shrimp scampi linguine",
  "smash-burger": "search:double cheeseburger",
  "smoked-brisket": "search:smoked beef brisket barbecue",
  "smoked-wings": "wiki:Buffalo wing",
  "souvlaki-platter": "wiki:Souvlaki",
  "spicy-tantanmen": "search:tantanmen ramen",
  "spicy-tuna-roll": "search:tuna maki sushi",
  "spring-rolls": "wiki:Gỏi cuốn",
  "stuffed-bell-peppers": "search:stuffed bell peppers baked",
  "sundae-supreme": "search:hot fudge sundae",
  "tandoori-platter": "wiki:Tandoori chicken",
  "tom-yum-soup": "wiki:Tom yum",
  "tomahawk-steak": "search:grilled ribeye steak bone",
  "tteokbokki": "search:tteokbokki rice cakes",
  "waffle-cone-duo": "wiki:Ice cream cone",
  "wagyu-beef-don": "search:gyudon beef bowl",
};

const FREE_LICENSE = /^(cc0|public domain|pd\b|cc[ -]by(-sa)?[ -][\d.]+)/i;

interface CommonsFile {
  title: string;
  thumbUrl: string;
  pageUrl: string;
  mime: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const only = new Set<string>();
  const pick: Record<string, number> = {};
  const source: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const [flag, value] = [args[i], args[i + 1] ?? ""];
    const [slug, ...rest] = value.split("=");
    if (flag === "--only") value.split(",").forEach((s) => only.add(s.trim()));
    else if (flag === "--pick") (pick[slug] = Number(rest[0])), only.add(slug);
    else if (flag === "--source") (source[slug] = rest.join("=")), only.add(slug);
  }
  return { only, pick, source };
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// Flickr imports read "Name from City, Country"; bot-filled ones read "No
// machine-readable author provided. Name assumed (...)". Keep just the name.
function cleanAuthor(raw: string): string {
  const assumed = /^No machine-readable author provided\. (.+?) assumed/.exec(raw);
  const name = (assumed ? assumed[1] : raw)
    .replace(/ from [^,]+(,.*)?$/, "")
    .split(" / ")[0]
    .trim();
  return name.slice(0, 60);
}

function toFile(page: any): CommonsFile | null {
  const info = page?.imageinfo?.[0];
  const meta = info?.extmetadata;
  if (!info || !meta) return null;
  return {
    title: page.title,
    thumbUrl: info.thumburl || info.url,
    pageUrl: info.descriptionurl,
    mime: info.mime,
    width: info.width,
    height: info.height,
    author: cleanAuthor(stripHtml(meta.Artist?.value || "")),
    license: stripHtml(meta.LicenseShortName?.value || ""),
    licenseUrl: meta.LicenseUrl?.value,
  };
}

function usable(f: CommonsFile | null): f is CommonsFile {
  return (
    !!f &&
    /jpe?g|png|webp/.test(f.mime) &&
    FREE_LICENSE.test(f.license) &&
    f.width >= 500 &&
    // CC BY licenses need a name to credit.
    !!f.author &&
    !/^unknown/i.test(f.author) &&
    // Very wide panoramas crop badly onto a portrait card.
    f.width / f.height < 2.2
  );
}

const IMAGEINFO = {
  prop: "imageinfo",
  iiprop: "url|mime|size|extmetadata",
  iiurlwidth: "900",
  iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
  format: "json",
};

async function fromWikipedia(title: string): Promise<CommonsFile[]> {
  const summary = await getJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`
  ).catch(() => null);
  const src: string | undefined = summary?.originalimage?.source;
  // Only files hosted on Commons are freely licensed; English Wikipedia's own
  // uploads can be non-free.
  if (!src || !src.includes("/wikipedia/commons/")) return [];
  // The URL carries tracking parameters; the file name is the last path part.
  const name = decodeURIComponent(new URL(src).pathname.split("/").pop()!);
  const data = await getJson(
    `${COMMONS_API}?${new URLSearchParams({ action: "query", titles: `File:${name}`, ...IMAGEINFO })}`
  );
  return Object.values<any>(data.query?.pages || {}).map(toFile).filter(usable);
}

async function fromSearch(query: string): Promise<CommonsFile[]> {
  const data = await getJson(
    `${COMMONS_API}?${new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: "6",
      gsrlimit: "15",
      ...IMAGEINFO,
    })}`
  );
  return Object.values<any>(data.query?.pages || {})
    .sort((a, b) => a.index - b.index)
    .map(toFile)
    .filter(usable);
}

async function main() {
  const { only, pick, source } = parseArgs();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest: Record<string, DishPhoto> = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf-8"))
    : {};

  const names = [...new Set(Object.values(CUISINE_DISHES).flat().map((d) => d.name))];
  const todo = names.filter((n) => (only.size ? only.has(slugify(n)) : !manifest[slugify(n)]));
  console.log(`${todo.length} dish(es) to fetch`);

  for (const name of todo) {
    const slug = slugify(name);
    const src = source[slug] ?? SOURCES[slug] ?? `wiki:${name}`;
    const [kind, ...rest] = src.split(":");
    const q = rest.join(":");
    let files = kind === "wiki" ? await fromWikipedia(q) : await fromSearch(q);
    // An article with no usable lead photo falls back to a search.
    if (!files.length && kind === "wiki") files = await fromSearch(`${name} food`);
    const taken = new Set(
      Object.entries(manifest).filter(([s]) => s !== slug).map(([, p]) => p.pageUrl)
    );
    const file = files.filter((f) => !taken.has(f.pageUrl))[pick[slug] ?? 0];
    if (!file) {
      console.warn(`  ${slug}: nothing usable for "${src}"`);
      continue;
    }
    const res = await fetch(file.thumbUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.warn(`  ${slug}: download failed (HTTP ${res.status})`);
      continue;
    }
    const out = path.join(OUT_DIR, `${slug}.jpg`);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    // Resize only (no crop) and strip metadata to keep the repo small.
    execFileSync("magick", [out, "-resize", "900x1200>", "-strip", "-quality", "75", `jpg:${out}`]);
    manifest[slug] = {
      file: `dishes/${slug}.jpg`,
      author: file.author,
      license: file.license,
      licenseUrl: file.licenseUrl,
      pageUrl: file.pageUrl,
      version: createHash("sha1").update(fs.readFileSync(out)).digest("hex").slice(0, 10),
    };
    console.log(`  ${slug}: ${file.title} (${file.license})`);
    // Be gentle with the API.
    await new Promise((r) => setTimeout(r, 300));
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Saved ${Object.keys(sorted).length} photos.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
