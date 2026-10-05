import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Dish, SessionMode } from "../lib/food-data";
import { shuffleDishes, shuffleRecipes } from "../lib/food-data";
import {
  fetchPopularDishes,
  menuGroundingEnabled,
  type GroundedMenu,
} from "./menu-grounding";
import { isExpoPushToken, sendMatchPush } from "./push";
import { CUISINE_DISHES } from "./cuisine-dishes";
import { examplePhotoFor } from "./dish-photos";
import { chainMenusEnabled, fetchChainDishes, type ChainDish } from "./chain-menus";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const PLACES_API_BASE = "https://places.googleapis.com/v1";
const EMPTY_SESSION_GRACE_MS = 30_000;

interface SessionMember {
  id: string;
  name: string;
  ws: WebSocket;
  swipes: Record<string, "like" | "pass">;
}

interface Session {
  code: string;
  hostId: string;
  members: Map<string, SessionMember>;
  dishes: Dish[];
  status: "lobby" | "swiping" | "matched";
  mode: SessionMode;
  matchedRestaurant?: string;
  matchedDish?: Dish;
  createdAt: number;
  // Pending deletion of an in-progress session that went empty; cleared on
  // rejoin and restarted on every new empty transition.
  emptyTimer?: ReturnType<typeof setTimeout>;
  // Expo push tokens by member id. Kept when a member disconnects, since the
  // members who left the app are the ones a match notification is for.
  pushTokens: Map<string, string>;
}

const sessions = new Map<string, Session>();

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastToSession(session: Session, message: object, excludeId?: string) {
  const payload = JSON.stringify(message);
  session.members.forEach((member) => {
    if (member.id !== excludeId && member.ws.readyState === WebSocket.OPEN) {
      member.ws.send(payload);
    }
  });
}

function getSessionState(session: Session) {
  return {
    code: session.code,
    hostId: session.hostId,
    status: session.status,
    mode: session.mode,
    members: Array.from(session.members.values()).map((m) => ({
      id: m.id,
      name: m.name,
    })),
    matchedRestaurant: session.matchedRestaurant,
    matchedDish: session.matchedDish,
  };
}

function checkForMatch(session: Session): boolean {
  const memberCount = session.members.size;
  // Strict majority: more than half, not half. Math.ceil(n / 2) let exactly
  // half decide on every even group size — in a 2-person session a single
  // like ended the game before the other person had voted at all.
  const majority = Math.floor(memberCount / 2) + 1;

  if (session.mode === "cook-in") {
    const dishLikes = new Map<string, { dish: Dish; likers: Set<string> }>();

    session.members.forEach((member) => {
      Object.entries(member.swipes).forEach(([dishId, vote]) => {
        if (vote === "like") {
          const dish = session.dishes.find((d) => d.id === dishId);
          if (!dish) return;
          if (!dishLikes.has(dishId)) {
            dishLikes.set(dishId, { dish, likers: new Set() });
          }
          dishLikes.get(dishId)!.likers.add(member.id);
        }
      });
    });

    for (const [, { dish, likers }] of dishLikes) {
      if (likers.size >= majority) {
        session.status = "matched";
        session.matchedRestaurant = dish.name;
        session.matchedDish = dish;
        return true;
      }
    }

    return false;
  }

  const restaurantLikes = new Map<string, Set<string>>();
  const dishMatches = new Map<string, { dish: Dish; likers: Set<string> }>();

  session.members.forEach((member) => {
    Object.entries(member.swipes).forEach(([dishId, vote]) => {
      if (vote === "like") {
        const dish = session.dishes.find((d) => d.id === dishId);
        if (!dish) return;

        if (!restaurantLikes.has(dish.restaurant)) {
          restaurantLikes.set(dish.restaurant, new Set());
        }
        restaurantLikes.get(dish.restaurant)!.add(member.id);

        if (!dishMatches.has(dishId)) {
          dishMatches.set(dishId, { dish, likers: new Set() });
        }
        dishMatches.get(dishId)!.likers.add(member.id);
      }
    });
  });

  for (const [restaurant, likers] of restaurantLikes) {
    if (likers.size >= majority) {
      let bestDish: Dish | undefined;
      let bestLikers = 0;

      dishMatches.forEach(({ dish, likers: dl }) => {
        if (dish.restaurant === restaurant && dl.size > bestLikers) {
          bestDish = dish;
          bestLikers = dl.size;
        }
      });

      if (bestDish) {
        session.status = "matched";
        session.matchedRestaurant = restaurant;
        session.matchedDish = bestDish;
        return true;
      }
    }
  }

  return false;
}

function cleanupStaleSessions() {
  const now = Date.now();
  sessions.forEach((session, code) => {
    if (now - session.createdAt > 3600000) {
      sessions.delete(code);
    }
  });
}

const PRICE_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

const TYPE_TO_CUISINE: Record<string, string> = {
  italian_restaurant: "Italian",
  chinese_restaurant: "Chinese",
  japanese_restaurant: "Japanese",
  mexican_restaurant: "Mexican",
  taco_restaurant: "Mexican",
  burrito_restaurant: "Mexican",
  indian_restaurant: "Indian",
  thai_restaurant: "Thai",
  french_restaurant: "French",
  korean_restaurant: "Korean",
  vietnamese_restaurant: "Vietnamese",
  greek_restaurant: "Greek",
  mediterranean_restaurant: "Mediterranean",
  middle_eastern_restaurant: "Mediterranean",
  lebanese_restaurant: "Mediterranean",
  turkish_restaurant: "Turkish",
  american_restaurant: "American",
  hamburger_restaurant: "Burgers",
  pizza_restaurant: "Pizza",
  seafood_restaurant: "Seafood",
  steak_house: "Steakhouse",
  sushi_restaurant: "Sushi",
  ramen_restaurant: "Ramen",
  barbecue_restaurant: "BBQ",
  breakfast_restaurant: "Breakfast",
  brunch_restaurant: "Brunch",
  cafe: "Cafe",
  coffee_shop: "Coffee",
  bakery: "Bakery",
  ice_cream_shop: "Ice Cream",
  sandwich_shop: "Sandwiches",
  vegetarian_restaurant: "Vegetarian",
  vegan_restaurant: "Vegan",
};

function extractCuisine(types: string[]): string {
  for (const type of types) {
    if (TYPE_TO_CUISINE[type]) return TYPE_TO_CUISINE[type];
  }
  return "Restaurant";
}


// Dishes worth suggesting for a place, or null when any guess would be a
// reach. Fast-food chains have their own fixed menus ("House Appetizer
// Sampler" at McDonald's), and places with no known cuisine get nothing:
// those become restaurant-only cards instead of invented dishes.
// Places formats US addresses as "..., City, ST 12345, USA".
const isUsAddress = (address?: string) => /,\s*(USA|United States)\s*$/i.test(address || "");

function suggestedDishesFor(
  types: string[],
  cuisineLabel: string
): { name: string; desc: string }[] | null {
  if (types.includes("fast_food_restaurant")) return null;
  for (const type of types) {
    const dishes = CUISINE_DISHES[TYPE_TO_CUISINE[type]];
    if (dishes) return dishes;
  }
  const label = cuisineLabel.toLowerCase();
  for (const [key, val] of Object.entries(CUISINE_DISHES)) {
    if (label.includes(key.toLowerCase())) return val;
  }
  return null;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function resolvePhotoUrl(photoName: string): Promise<string> {
  const url = `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=600&maxWidthPx=800&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    // Only the redirect target (a googleusercontent URL) is safe to hand to
    // clients. The request URL carries our API key, so never fall back to it;
    // an unresolved photo is skipped instead.
    const location = res.headers.get("location");
    if (location && !location.includes(GOOGLE_API_KEY)) return location;
    return "";
  } catch {
    return "";
  }
}

async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Dish[]> {
  if (!GOOGLE_API_KEY) {
    console.warn("No Google Places API key set, using fallback dishes");
    return shuffleDishes();
  }

  try {
    const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        // editorialSummary already bills this call at the Enterprise +
        // Atmosphere SKU, so the phone, website and Maps URL cost nothing extra.
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.editorialSummary,places.primaryTypeDisplayName,places.googleMapsUri,places.nationalPhoneNumber,places.websiteUri",
      },
      body: JSON.stringify({
        includedPrimaryTypes: ["restaurant"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        rankPreference: "POPULARITY",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Places API error:", response.status, errorText);
      return shuffleDishes();
    }

    const data = await response.json();
    const places = data.places || [];

    if (places.length === 0) {
      console.warn("No restaurants found, using fallback dishes");
      return shuffleDishes();
    }

    const dishes: Dish[] = [];
    const photoPromises: Promise<string>[] = [];
    const photoMeta: { placeIndex: number; photoIndex: number }[] = [];

    for (let pi = 0; pi < places.length; pi++) {
      const photos = places[pi].photos || [];
      // One is enough: suggested dishes show example photos, so a place's own
      // photo is only used for its restaurant-only card or as a fallback.
      // Each resolved photo is a billed Places Photo request.
      const needed = Math.min(1, photos.length);
      for (let j = 0; j < needed; j++) {
        photoPromises.push(resolvePhotoUrl(photos[j].name));
        photoMeta.push({ placeIndex: pi, photoIndex: j });
      }
    }

    const resolvedUrls = await Promise.all(photoPromises);

    const placePhotos = new Map<number, { url: string; authors: string[] }[]>();
    resolvedUrls.forEach((url, idx) => {
      if (!url) return;
      const { placeIndex, photoIndex } = photoMeta[idx];
      const authors: string[] = (
        places[placeIndex].photos?.[photoIndex]?.authorAttributions || []
      )
        .map((a: { displayName?: string }) => a.displayName)
        .filter((n: unknown): n is string => typeof n === "string" && !!n);
      if (!placePhotos.has(placeIndex)) placePhotos.set(placeIndex, []);
      placePhotos.get(placeIndex)!.push({ url, authors });
    });

    // Two locations of one chain (two Chick-fil-As nearby) would put the
    // same dishes in the deck twice, and matching is by restaurant name
    // anyway, so keep one per name: the first (most popular) that has a
    // usable photo. Done after photos resolve so a location without one
    // doesn't knock the chain out entirely.
    const seenNames = new Set<string>();
    for (let pi = 0; pi < places.length; pi++) {
      if (!placePhotos.has(pi)) continue;
      const key = (places[pi].displayName?.text || "").trim().toLowerCase();
      if (!key) continue;
      if (seenNames.has(key)) placePhotos.delete(pi);
      else seenNames.add(key);
    }

    // Ask Gemini (grounded in Google Maps) for real popular dishes at every
    // place that will produce cards, in parallel. Places it can't answer for
    // fall back to cuisine-based suggestions below.
    const grounded = new Map<number, GroundedMenu>();
    await Promise.all(
      [...placePhotos.keys()].map(async (pi) => {
        const place = places[pi];
        const menu = await fetchPopularDishes({
          id: place.id,
          name: place.displayName?.text || "",
          address: place.formattedAddress || "",
          lat,
          lng,
        });
        if (menu) grounded.set(pi, menu);
      })
    );
    if (grounded.size > 0) {
      console.log(`Grounded dishes for ${grounded.size}/${placePhotos.size} places`);
    }

    // Real menu items for chains (spoonacular), only where grounding found
    // nothing (lookups cost quota points) and only in the US (its data is
    // US chain menus; a UK McDonald's serves something else).
    const chainMenus = new Map<number, ChainDish[]>();
    await Promise.all(
      [...placePhotos.keys()]
        .filter((pi) => !grounded.has(pi) && isUsAddress(places[pi].formattedAddress))
        .map(async (pi) => {
          const items = await fetchChainDishes(places[pi].displayName?.text || "");
          if (items) chainMenus.set(pi, items);
        })
    );
    if (chainMenusEnabled()) {
      console.log(`Chain menu items for ${chainMenus.size}/${placePhotos.size} places`);
    }

    for (let pi = 0; pi < places.length; pi++) {
      const place = places[pi];
      const photos = placePhotos.get(pi);
      if (!photos || photos.length === 0) continue;

      const types = place.types || [];
      const cuisine = place.primaryTypeDisplayName?.text || extractCuisine(types);
      const price = PRICE_MAP[place.priceLevel] || "$$";
      const restaurantName = place.displayName?.text || "Unknown";
      const rating = place.rating || 0;
      const address = place.formattedAddress || "";

      const shared = {
        restaurant: restaurantName,
        cuisine,
        price,
        rating,
        ratingCount: place.userRatingCount || 0,
        address,
        placeId: place.id,
        mapsUrl: place.googleMapsUri || undefined,
        phone: place.nationalPhoneNumber || undefined,
        website: place.websiteUri || undefined,
      };

      const menu = grounded.get(pi);
      const chainItems = menu ? undefined : chainMenus.get(pi);

      if (chainItems) {
        // Real dishes from this chain's menu, each with its own photo.
        chainItems.forEach((item, di) => {
          dishes.push({
            ...shared,
            id: `${place.id}_${di}`,
            name: item.name,
            description: "",
            image: item.image,
            menuSource: "spoonacular",
          });
        });
        continue;
      }

      const suggestions = menu ? null : suggestedDishesFor(types, cuisine);

      if (!menu && !suggestions) {
        // One card for the restaurant itself rather than invented dishes.
        dishes.push({
          ...shared,
          id: `${place.id}_0`,
          name: restaurantName,
          description: place.editorialSummary?.text || "",
          image: photos[0].url,
          photoAuthors: photos[0].authors,
          restaurantOnly: true,
        });
        continue;
      }

      const selectedDishes = menu
        ? menu.dishes
        : pickRandom(suggestions!, 3);

      selectedDishes.forEach((dish, di) => {
        // A suggested dish shows an example photo of that dish; anything
        // else (or a dish with no example photo) shows the place's own.
        const example = menu ? undefined : examplePhotoFor(dish.name);
        const own = photos[di % photos.length];
        dishes.push({
          ...shared,
          id: `${place.id}_${di}`,
          name: dish.name,
          description: dish.desc || `Popular at ${restaurantName}`,
          ...(example
            ? {
                image: `/assets/${example.file}?v=${example.version}`,
                photoCredit: {
                  author: example.author,
                  license: example.license,
                  licenseUrl: example.licenseUrl,
                  pageUrl: example.pageUrl,
                },
              }
            : { image: own.url, photoAuthors: own.authors }),
          suggested: !menu,
          groundedSources: menu?.sources,
        });
      });
    }

    if (dishes.length === 0) {
      return shuffleDishes();
    }

    return dishes.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return shuffleDishes();
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Which optional integrations this process can see. Missing keys fall back
  // silently at request time, so this is the one place a misconfigured env
  // shows up in the logs. Never logs the keys themselves.
  console.log(
    `Integrations: Google Places ${GOOGLE_API_KEY ? "on" : "OFF (curated fallback)"}, ` +
      `Gemini menu grounding ${menuGroundingEnabled() ? "on" : "OFF (suggested dishes)"}, ` +
      `spoonacular chain menus ${chainMenusEnabled() ? "on" : "OFF (suggested dishes)"}`
  );

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  setInterval(cleanupStaleSessions, 300000);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      sessions: sessions.size,
      uptime: Math.round(process.uptime()),
    });
  });

  app.post("/api/sessions", async (req, res) => {
    let code = generateCode();
    while (sessions.has(code)) {
      code = generateCode();
    }

    const { lat, lng, radius, mode: reqMode } = req.body || {};
    const mode: SessionMode = reqMode === "cook-in" ? "cook-in" : "dine-out";
    let dishes: Dish[];

    if (mode === "cook-in") {
      dishes = shuffleRecipes();
      console.log(`Created cook-in session with ${dishes.length} recipes`);
    } else if (lat && lng && radius) {
      const radiusMeters = Math.min(Math.max(radius, 500), 50000);
      console.log(
        `Fetching restaurants near ${lat},${lng} within ${radiusMeters}m`
      );
      dishes = await fetchNearbyRestaurants(lat, lng, radiusMeters);
      console.log(`Found ${dishes.length} dishes from nearby restaurants`);
    } else {
      dishes = shuffleDishes();
    }

    const session: Session = {
      code,
      hostId: "",
      members: new Map(),
      dishes,
      status: "lobby",
      mode,
      createdAt: Date.now(),
      pushTokens: new Map(),
    };

    sessions.set(code, session);
    res.json({ code, mode, dishCount: dishes.length });
  });

  app.get("/api/sessions/:code", (req, res) => {
    const session = sessions.get(req.params.code.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(getSessionState(session));
  });

  wss.on("connection", (ws) => {
    let memberId = "";
    let sessionCode = "";

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const session = sessions.get(msg.code?.toUpperCase());
          if (!session) {
            ws.send(
              JSON.stringify({ type: "error", message: "Session not found" })
            );
            return;
          }

          if (session.status === "matched") {
            ws.send(
              JSON.stringify({
                type: "match",
                session: getSessionState(session),
                dish: session.matchedDish,
              })
            );
            return;
          }

          if (typeof msg.userId !== "string" || !msg.userId || msg.userId.length > 64) {
            ws.send(
              JSON.stringify({ type: "error", message: "Invalid user id" })
            );
            return;
          }
          const cleanName =
            typeof msg.name === "string"
              ? msg.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24)
              : "";

          memberId = msg.userId;
          sessionCode = session.code;
          if (isExpoPushToken(msg.pushToken)) {
            session.pushTokens.set(memberId, msg.pushToken);
          }

          if (session.emptyTimer) {
            clearTimeout(session.emptyTimer);
            session.emptyTimer = undefined;
          }

          if (!session.hostId) {
            session.hostId = memberId;
          }

          session.members.set(memberId, {
            id: memberId,
            name: cleanName || "Guest",
            ws,
            swipes: {},
          });

          ws.send(
            JSON.stringify({
              type: "joined",
              session: getSessionState(session),
              dishes: session.dishes,
              isHost: session.hostId === memberId,
            })
          );

          broadcastToSession(
            session,
            {
              type: "member_joined",
              session: getSessionState(session),
            },
            memberId
          );
        } else if (msg.type === "start") {
          const session = sessions.get(sessionCode);
          if (!session || session.hostId !== memberId) return;
          if (session.members.size < 1) return;

          session.status = "swiping";

          // No excludeId, so this already reaches the host who sent "start"
          broadcastToSession(session, {
            type: "game_started",
            session: getSessionState(session),
            dishes: session.dishes,
          });
        } else if (msg.type === "swipe") {
          const session = sessions.get(sessionCode);
          if (!session || session.status !== "swiping") return;

          const member = session.members.get(memberId);
          if (!member) return;

          member.swipes[msg.dishId] = msg.vote;

          broadcastToSession(
            session,
            {
              type: "swipe_update",
              memberId,
              dishId: msg.dishId,
              vote: msg.vote,
            },
            memberId
          );

          if (checkForMatch(session)) {
            const matchMsg = {
              type: "match",
              session: getSessionState(session),
              dish: session.matchedDish,
            };
            // No excludeId, so this already reaches the swiper who triggered it
            broadcastToSession(session, matchMsg);
            // Everyone with a token, including connected members: the app
            // hides the banner in the foreground, and a backgrounded phone's
            // socket can look open for a while after iOS suspends it.
            void sendMatchPush(session.pushTokens.values(), session.code, session.matchedDish!);
          }
        } else if (msg.type === "undo") {
          const session = sessions.get(sessionCode);
          if (!session || session.status !== "swiping") return;

          const member = session.members.get(memberId);
          if (!member) return;

          delete member.swipes[msg.dishId];

          broadcastToSession(
            session,
            {
              type: "swipe_update",
              memberId,
              dishId: msg.dishId,
              vote: "undo",
            },
            memberId
          );
        } else if (msg.type === "push_token") {
          // Sent after join, once the device has a token (it can take a
          // while on iOS, or wait on the permission prompt).
          const session = sessions.get(sessionCode);
          if (session && memberId && isExpoPushToken(msg.pushToken)) {
            session.pushTokens.set(memberId, msg.pushToken);
          }
        } else if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    ws.on("close", () => {
      if (!sessionCode || !memberId) return;
      const session = sessions.get(sessionCode);
      if (!session) return;

      // The lobby and swipe screens each open their own socket with the same
      // userId, and the swipe screen's join replaces the member's socket. When
      // the lobby socket closes afterwards it must not remove the member the
      // swipe screen is now using (that deleted the session and silently
      // dropped every swipe).
      if (session.members.get(memberId)?.ws !== ws) return;

      session.members.delete(memberId);

      if (session.members.size === 0) {
        // A game in progress can be momentarily empty while a member hops
        // between screens; give them a moment to rejoin before dropping it.
        if (session.status === "lobby") {
          sessions.delete(sessionCode);
        } else {
          // Restart the grace period on each empty transition so an earlier
          // timer can't cut a later disconnect's window short.
          if (session.emptyTimer) clearTimeout(session.emptyTimer);
          const code = sessionCode;
          session.emptyTimer = setTimeout(() => {
            const s = sessions.get(code);
            if (s === session && s.members.size === 0) sessions.delete(code);
          }, EMPTY_SESSION_GRACE_MS);
        }
        return;
      }

      // Hosting only matters in the lobby (only the host can start). Once the
      // game is on, the host's lobby socket closing just before their swipe
      // screen rejoins would otherwise hand the role to someone else.
      if (session.hostId === memberId && session.status === "lobby") {
        session.hostId = session.members.keys().next().value ?? "";
      }

      broadcastToSession(session, {
        type: "member_left",
        memberId,
        session: getSessionState(session),
      });
    });
  });

  return httpServer;
}
