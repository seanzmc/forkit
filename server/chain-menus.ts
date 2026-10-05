// Real menu items for chain restaurants, from spoonacular's menu item search
// (115K+ items from 800+ US chains, each with a photo of that item). US menus
// only, so callers skip places outside the US.
//
// Terms: results may be cached for at most 1 hour, so lookups (including
// "not a chain we know") live in memory for an hour and are never written
// anywhere. Free plans must show a backlink to spoonacular's food API page;
// the app credits "spoonacular" with that link on every card from here.
//
// Disabled unless SPOONACULAR_API_KEY is set. Any failure returns null and
// the caller falls back to suggested dishes.

const API_KEY = (process.env.SPOONACULAR_API_KEY || "").trim();
const SEARCH_URL = "https://api.spoonacular.com/food/menuItems/search";
const CACHE_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 8_000;
// 1 point + 0.01 per result for each page of 10. A second page is fetched
// only when the first finds the chain but too few mains after filtering, so
// a non-chain costs ~1.1 points and a chain ~1.1-2.2.
const PAGE_SIZE = 10;
const DISHES_PER_PLACE = 3;

export const chainMenusEnabled = () => !!API_KEY;

export interface ChainDish {
  name: string;
  image: string;
}

interface Candidate {
  name: string;
  id: number;
  ext: string;
}

interface MenuItem {
  id: number;
  title: string;
  restaurantChain?: string;
  image?: string;
  imageType?: string;
}

const cache = new Map<string, { at: number; dishes: ChainDish[] | null }>();

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// "Chili's Grill & Bar" (Google) vs "Chili's" (spoonacular): equal, or one
// is the other plus more words. Sharing only a first word or two is not
// enough ("The Capital Grille" is not "The Capital Burger").
function sameChain(a: string, b: string): boolean {
  const [x, y] = [norm(a), norm(b)];
  if (!x || !y) return false;
  return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

// Items the group wouldn't pick dinner by: drinks, condiments, sides,
// breakfast dishes and desserts.
const NOT_A_MAIN =
  /\b(coke|cola|pepsi|sprite|soda|fanta|dr pepper|mountain dew|lemonade|tea|coffee|latte|cappuccino|espresso|mocha|frappe|juice|water|milk|smoothie|beverage|drink|dressing|sauce|dip|syrup|ketchup|mustard|mayo|gravy|condiment|creamer|side|fries|hash ?browns?|kids?|child|toddler|add on|add-on|extra|topping|cup|packet|ice|refill|vinegar|salt|granola|yogurt|parfait|fruit|oatmeal|sundae|mcflurry|blizzard|shake|malt|cone|cookie|brownie|pie|cake|dessert|frosty|ice cream|custard|concrete|mixer|breakfast|biscuits?|bagels?|croissants?|muffins?|mcmuffin|pancakes?|hotcakes|waffles?|eggs?|omelets?|omelettes?)\b/i;

// "Carrabba's Italian Grill Lunch - Fish Chowder" -> "Fish Chowder";
// "The Culver's Bacon Deluxe ButterBurger" -> "Bacon Deluxe ButterBurger".
function cleanTitle(title: string, chain: string, placeName: string): string {
  // spoonacular's chain may be just "Chili's" while titles carry the rest
  // ("Grill and Bar ..."), so strip words from Google's name too.
  const chainWords = new Set(
    `${norm(chain)} ${norm(placeName)}`.split(" ").filter(Boolean).concat("the", "and")
  );
  const words = title.split(/\s+/);
  // A word like "Chick-fil-A" normalizes to several tokens; drop it only if
  // every one belongs to the chain's name.
  const isChainWord = (w: string) => {
    const tokens = norm(w).split(" ").filter(Boolean);
    return tokens.length > 0 && tokens.every((t) => chainWords.has(t));
  };
  while (words.length > 1 && isChainWord(words[0])) words.shift();
  return words
    .join(" ")
    .replace(/^(lunch|dinner|breakfast|brunch|late night)\s*[-:]\s*/i, "")
    .replace(/\s*\((small|medium|large|regular|cup|bowl|lunch|dinner|\d[^)]*)\)\s*$/i, "")
    .replace(/,\s*for .*$/i, "")
    .replace(/\s+w\/o\s.*$/i, "")
    // Regional variants: "Turkey Club - FL".
    .replace(/\s+-\s+[A-Z]{2}$/, "")
    .trim();
}

async function searchPage(query: string, offset: number): Promise<MenuItem[]> {
  const url = `${SEARCH_URL}?${new URLSearchParams({
    query,
    number: String(PAGE_SIZE),
    offset: String(offset),
    apiKey: API_KEY,
  })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    // 402 = daily points used up. Never log the URL: it carries the key.
    const detail = await res.json().then((b) => String(b?.message || "")).catch(() => "");
    throw new Error(`spoonacular ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}`);
  }
  return ((await res.json()).menuItems || []) as MenuItem[];
}

// Many items list an image that was never uploaded (about two in three in a
// test near Tampa), so only items whose photo actually loads become cards.
// Prefer the sharper 636x393 size; both sizes exist or neither does.
async function workingImage(id: number, ext: string): Promise<string | null> {
  const url = `https://img.spoonacular.com/menu-items/${id}-636x393.${ext}`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4_000) });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

function pickRandom<T>(items: T[], count: number): T[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

export async function fetchChainDishes(placeName: string): Promise<ChainDish[] | null> {
  if (!API_KEY || !placeName) return null;
  const key = norm(placeName);
  // The whole filtered list is cached; each room gets its own random 3.
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.dishes ? pickRandom(hit.dishes, DISHES_PER_PLACE) : null;
  }

  try {
    const seen = new Set<string>();
    const candidates: Candidate[] = [];
    let chainFound = false;
    const take = (items: MenuItem[]) => {
      for (const item of items) {
        if (!item.restaurantChain || !sameChain(item.restaurantChain, placeName)) continue;
        chainFound = true;
        if (!item.image) continue;
        // Filter the cleaned name, not the raw title: titles can start with
        // the chain's own name ("Waffle House Patty Melt"), which would
        // otherwise reject every item from such chains.
        const name = cleanTitle(item.title, item.restaurantChain, placeName);
        if (NOT_A_MAIN.test(name)) continue;
        if (name.length < 3 || name.length > 60 || seen.has(norm(name))) continue;
        seen.add(norm(name));
        candidates.push({ name, id: item.id, ext: item.imageType || "png" });
      }
    };
    take(await searchPage(placeName, 0));
    if (chainFound && candidates.length < DISHES_PER_PLACE * 2) {
      take(await searchPage(placeName, PAGE_SIZE));
    }
    const images = await Promise.all(candidates.map((c) => workingImage(c.id, c.ext)));
    const dishes: ChainDish[] = candidates.flatMap((c, i) =>
      images[i] ? [{ name: c.name, image: images[i]! }] : []
    );
    cache.set(key, { at: Date.now(), dishes: dishes.length ? dishes : null });
    return dishes.length ? pickRandom(dishes, DISHES_PER_PLACE) : null;
  } catch (error) {
    console.warn(`Chain menu lookup failed for ${placeName}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// Drop expired entries so the cache never outlives the 1-hour limit.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at >= CACHE_TTL_MS) cache.delete(k);
}, 10 * 60 * 1000);
