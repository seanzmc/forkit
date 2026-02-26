import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Dish } from "../lib/food-data";
import { shuffleDishes } from "../lib/food-data";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const PLACES_API_BASE = "https://places.googleapis.com/v1";

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
  matchedRestaurant?: string;
  matchedDish?: Dish;
  createdAt: number;
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
  const majority = Math.ceil(memberCount / 2);

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

function extractCuisine(types: string[]): string {
  const cuisineMap: Record<string, string> = {
    italian_restaurant: "Italian",
    chinese_restaurant: "Chinese",
    japanese_restaurant: "Japanese",
    mexican_restaurant: "Mexican",
    indian_restaurant: "Indian",
    thai_restaurant: "Thai",
    french_restaurant: "French",
    korean_restaurant: "Korean",
    vietnamese_restaurant: "Vietnamese",
    greek_restaurant: "Greek",
    mediterranean_restaurant: "Mediterranean",
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

  for (const type of types) {
    if (cuisineMap[type]) return cuisineMap[type];
  }
  return "Restaurant";
}

async function resolvePhotoUrl(photoName: string): Promise<string> {
  const url = `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=600&maxWidthPx=800&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const location = res.headers.get("location");
    if (location) return location;
    return url;
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
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.editorialSummary,places.primaryTypeDisplayName",
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

    for (const place of places) {
      const photos = place.photos || [];
      if (photos.length === 0) continue;

      const photoName = photos[0].name;
      const imageUrl = await resolvePhotoUrl(photoName);
      if (!imageUrl) continue;

      const types = place.types || [];
      const cuisine = place.primaryTypeDisplayName?.text || extractCuisine(types);
      const price = PRICE_MAP[place.priceLevel] || "$$";
      const name = place.displayName?.text || "Unknown";
      const summary =
        place.editorialSummary?.text || `${cuisine} dining with ${place.userRatingCount || 0} reviews`;

      dishes.push({
        id: place.id,
        name,
        restaurant: name,
        cuisine,
        description: summary,
        image: imageUrl,
        price,
        rating: place.rating || 0,
        address: place.formattedAddress || "",
        placeId: place.id,
      });

      if (photos.length > 1) {
        const secondPhotoUrl = await resolvePhotoUrl(photos[1].name);
        if (secondPhotoUrl) {
          dishes.push({
            id: `${place.id}_2`,
            name: `${name} - More`,
            restaurant: name,
            cuisine,
            description: summary,
            image: secondPhotoUrl,
            price,
            rating: place.rating || 0,
            address: place.formattedAddress || "",
            placeId: place.id,
          });
        }
      }
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
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  setInterval(cleanupStaleSessions, 300000);

  app.post("/api/sessions", async (req, res) => {
    let code = generateCode();
    while (sessions.has(code)) {
      code = generateCode();
    }

    const { lat, lng, radius } = req.body || {};
    let dishes: Dish[];

    if (lat && lng && radius) {
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
      createdAt: Date.now(),
    };

    sessions.set(code, session);
    res.json({ code, dishCount: dishes.length });
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

          memberId = msg.userId;
          sessionCode = session.code;

          if (!session.hostId) {
            session.hostId = memberId;
          }

          session.members.set(memberId, {
            id: memberId,
            name: msg.name,
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

          broadcastToSession(session, {
            type: "game_started",
            session: getSessionState(session),
            dishes: session.dishes,
          });

          ws.send(
            JSON.stringify({
              type: "game_started",
              session: getSessionState(session),
              dishes: session.dishes,
            })
          );
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
            broadcastToSession(session, matchMsg);
            ws.send(JSON.stringify(matchMsg));
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

      session.members.delete(memberId);

      if (session.members.size === 0) {
        sessions.delete(sessionCode);
        return;
      }

      if (session.hostId === memberId) {
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
