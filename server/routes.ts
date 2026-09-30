import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Dish, SessionMode } from "../lib/food-data";
import { shuffleDishes, shuffleRecipes } from "../lib/food-data";

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
  mode: SessionMode;
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

const CUISINE_DISHES: Record<string, { name: string; desc: string }[]> = {
  Italian: [
    { name: "Margherita Pizza", desc: "Wood-fired crust, San Marzano tomato, fresh mozzarella, basil" },
    { name: "Pasta Carbonara", desc: "Spaghetti, guanciale, pecorino romano, egg yolk, black pepper" },
    { name: "Chicken Parmigiana", desc: "Breaded cutlet, marinara, melted mozzarella, fresh basil" },
    { name: "Risotto ai Funghi", desc: "Arborio rice, wild mushrooms, parmesan, white truffle oil" },
    { name: "Osso Buco", desc: "Braised veal shanks, gremolata, saffron risotto" },
  ],
  Chinese: [
    { name: "Kung Pao Chicken", desc: "Wok-tossed chicken, peanuts, dried chilis, Sichuan peppercorn" },
    { name: "Peking Duck", desc: "Crispy roasted duck, hoisin sauce, scallion, thin pancakes" },
    { name: "Mapo Tofu", desc: "Silken tofu, spicy chili bean paste, minced pork, Sichuan pepper" },
    { name: "Dim Sum Platter", desc: "Har gow, siu mai, char siu bao, steamed to order" },
    { name: "Dan Dan Noodles", desc: "Spicy sesame noodles, ground pork, chili oil, pickled mustard greens" },
  ],
  Japanese: [
    { name: "Salmon Sashimi", desc: "Premium fresh-cut salmon, soy, pickled ginger, wasabi" },
    { name: "Tonkotsu Ramen", desc: "Rich pork bone broth, chashu, soft-boiled egg, nori, scallions" },
    { name: "Chicken Katsu Curry", desc: "Crispy panko chicken, Japanese curry, steamed rice, pickles" },
    { name: "Dragon Roll", desc: "Shrimp tempura, avocado, eel sauce, spicy mayo, tobiko" },
    { name: "Wagyu Beef Don", desc: "Seared A5 wagyu slices, seasoned rice, onsen egg, truffle soy" },
  ],
  Mexican: [
    { name: "Birria Tacos", desc: "Slow-braised beef, consommé dip, cilantro, onion, corn tortilla" },
    { name: "Carne Asada Burrito", desc: "Grilled steak, guacamole, pico de gallo, rice, cheese, flour tortilla" },
    { name: "Enchiladas Suizas", desc: "Chicken enchiladas, tomatillo cream sauce, queso fresco, sour cream" },
    { name: "Fish Tacos", desc: "Beer-battered fish, chipotle slaw, lime crema, pickled onion" },
    { name: "Chile Relleno", desc: "Roasted poblano, melted cheese, ranchero sauce, rice and beans" },
  ],
  Indian: [
    { name: "Butter Chicken", desc: "Tender chicken in creamy tomato gravy, aromatic spices, naan" },
    { name: "Lamb Biryani", desc: "Fragrant basmati, slow-cooked lamb, saffron, fried onions, raita" },
    { name: "Palak Paneer", desc: "Creamy spinach curry, paneer cubes, cumin, garlic, garam masala" },
    { name: "Tandoori Platter", desc: "Tandoori chicken, seekh kebab, naan, mint chutney, onion salad" },
    { name: "Chana Masala", desc: "Spiced chickpea curry, tomato, ginger, cumin, cilantro, basmati rice" },
  ],
  Thai: [
    { name: "Pad Thai", desc: "Rice noodles, prawns, peanuts, bean sprouts, tamarind, lime" },
    { name: "Green Curry", desc: "Coconut milk, Thai basil, bamboo shoots, bell pepper, jasmine rice" },
    { name: "Tom Yum Soup", desc: "Hot & sour broth, shrimp, lemongrass, galangal, kaffir lime" },
    { name: "Mango Sticky Rice", desc: "Sweet coconut sticky rice, fresh mango, toasted sesame" },
    { name: "Massaman Curry", desc: "Rich peanut curry, tender beef, potato, roasted cashews" },
  ],
  French: [
    { name: "Duck Confit", desc: "Slow-cooked duck leg, cherry gastrique, pomme purée" },
    { name: "Coq au Vin", desc: "Braised chicken, red wine, pearl onions, mushrooms, lardons" },
    { name: "Steak Frites", desc: "Pan-seared bavette, shoestring fries, béarnaise, green salad" },
    { name: "French Onion Soup", desc: "Caramelized onion broth, gruyère crouton, fresh thyme" },
    { name: "Crème Brûlée", desc: "Vanilla bean custard, caramelized sugar crust, fresh berries" },
  ],
  Korean: [
    { name: "Korean BBQ Platter", desc: "Bulgogi, galbi, banchan, lettuce wraps, ssamjang" },
    { name: "Bibimbap", desc: "Mixed rice bowl, gochujang, fried egg, vegetables, sesame oil" },
    { name: "Tteokbokki", desc: "Spicy rice cakes, fish cakes, scallion, sweet chili glaze" },
    { name: "Kimchi Jjigae", desc: "Fermented kimchi stew, pork belly, tofu, scallion, steamed rice" },
    { name: "Japchae", desc: "Glass noodles, sesame, mixed vegetables, soy, toasted sesame" },
  ],
  American: [
    { name: "Smash Burger", desc: "Double smashed patties, American cheese, pickles, special sauce" },
    { name: "Nashville Hot Chicken", desc: "Spicy fried chicken, coleslaw, bread and butter pickles" },
    { name: "BBQ Ribs", desc: "St. Louis-style, house-smoked, tangy BBQ glaze, cornbread" },
    { name: "Mac & Cheese", desc: "Four-cheese blend, crispy breadcrumb crust, truffle oil" },
    { name: "Philly Cheesesteak", desc: "Shaved ribeye, melted provolone, peppers, onions, hoagie roll" },
  ],
  Mediterranean: [
    { name: "Lamb Shawarma", desc: "Slow-roasted lamb, tahini, pickled turnip, pita, hummus" },
    { name: "Falafel Platter", desc: "Crispy chickpea falafel, hummus, tabbouleh, pickles, pita" },
    { name: "Grilled Sea Bass", desc: "Mediterranean herbs, lemon, olive oil, roasted vegetables" },
    { name: "Mezze Board", desc: "Hummus, baba ganoush, labneh, olives, warm pita, feta" },
    { name: "Kebab Platter", desc: "Mixed grilled meats, saffron rice, grilled tomato, sumac onion" },
  ],
  Seafood: [
    { name: "Lobster Roll", desc: "Fresh Maine lobster, butter, lemon, toasted split-top bun" },
    { name: "Fish & Chips", desc: "Beer-battered cod, thick-cut fries, mushy peas, tartar sauce" },
    { name: "Grilled Salmon", desc: "Atlantic salmon, lemon dill sauce, asparagus, wild rice" },
    { name: "Shrimp Scampi", desc: "Garlic butter shrimp, white wine, linguine, fresh parsley" },
    { name: "Crab Cakes", desc: "Jumbo lump crab, Old Bay, remoulade, mixed greens" },
  ],
  Vietnamese: [
    { name: "Pho Bo", desc: "Rich beef broth, rice noodles, rare steak, herbs, bean sprouts" },
    { name: "Banh Mi", desc: "Crispy baguette, lemongrass pork, pickled daikon, cilantro, jalapeño" },
    { name: "Bun Bo Hue", desc: "Spicy beef noodle soup, lemongrass, shrimp paste, herbs" },
    { name: "Spring Rolls", desc: "Fresh rice paper, shrimp, vermicelli, herbs, peanut dipping sauce" },
  ],
  Greek: [
    { name: "Souvlaki Platter", desc: "Grilled pork skewers, tzatziki, pita, tomato, onion, fries" },
    { name: "Moussaka", desc: "Layered eggplant, spiced lamb, béchamel, baked golden" },
    { name: "Greek Salad", desc: "Tomato, cucumber, feta, kalamata olives, oregano, olive oil" },
    { name: "Lamb Gyro", desc: "Seasoned lamb, tzatziki, lettuce, tomato, warm pita" },
  ],
  Burgers: [
    { name: "Classic Cheeseburger", desc: "Beef patty, American cheese, lettuce, tomato, pickles, brioche" },
    { name: "Bacon BBQ Burger", desc: "Angus beef, crispy bacon, cheddar, onion ring, BBQ sauce" },
    { name: "Mushroom Swiss Burger", desc: "Sautéed mushrooms, melted Swiss, garlic aioli, toasted bun" },
  ],
  Pizza: [
    { name: "Pepperoni Pizza", desc: "Classic pepperoni, mozzarella, house marinara, crispy crust" },
    { name: "Margherita Pizza", desc: "San Marzano tomato, fresh mozzarella, basil, olive oil" },
    { name: "Meat Lovers Pizza", desc: "Pepperoni, sausage, bacon, ham, mozzarella, red sauce" },
  ],
  Sushi: [
    { name: "Omakase Selection", desc: "Chef's choice of premium nigiri, sashimi, and special rolls" },
    { name: "Spicy Tuna Roll", desc: "Fresh tuna, spicy mayo, cucumber, sesame, crispy tempura flakes" },
    { name: "Rainbow Roll", desc: "California roll topped with salmon, tuna, yellowtail, avocado" },
  ],
  BBQ: [
    { name: "Smoked Brisket", desc: "12-hour oak-smoked, pepper crust, house pickles, white bread" },
    { name: "Pulled Pork Sandwich", desc: "Slow-smoked pork, vinegar slaw, brioche bun, pickle chips" },
    { name: "Smoked Wings", desc: "Hickory-smoked, Alabama white sauce, celery, blue cheese" },
  ],
  Steakhouse: [
    { name: "Ribeye Steak", desc: "16oz bone-in ribeye, herb butter, roasted garlic, creamed spinach" },
    { name: "Filet Mignon", desc: "8oz center-cut, peppercorn sauce, truffle mashed potato" },
    { name: "Tomahawk Steak", desc: "32oz long-bone ribeye, charred, compound butter, roasted veg" },
  ],
  Cafe: [
    { name: "Avocado Toast", desc: "Sourdough, smashed avocado, poached eggs, chili flakes, microgreens" },
    { name: "Eggs Benedict", desc: "Poached eggs, Canadian bacon, hollandaise, English muffin" },
    { name: "Acai Bowl", desc: "Acai blend, granola, banana, berries, honey, coconut flakes" },
  ],
  Breakfast: [
    { name: "Pancake Stack", desc: "Fluffy buttermilk pancakes, maple syrup, butter, fresh berries" },
    { name: "Eggs Benedict", desc: "Poached eggs, hollandaise, Canadian bacon, English muffin, hash browns" },
    { name: "Breakfast Burrito", desc: "Scrambled eggs, chorizo, cheese, avocado, salsa, flour tortilla" },
  ],
  Brunch: [
    { name: "French Toast", desc: "Thick brioche, vanilla custard, berries, maple syrup, whipped cream" },
    { name: "Shakshuka", desc: "Poached eggs, spiced tomato sauce, feta, herbs, crusty bread" },
    { name: "Chicken & Waffles", desc: "Crispy fried chicken, Belgian waffle, hot honey, maple butter" },
  ],
  Turkish: [
    { name: "Iskender Kebab", desc: "Sliced doner, tomato sauce, yogurt, butter, warm pide bread" },
    { name: "Lahmacun", desc: "Crispy flatbread, spiced lamb, parsley, lemon, onion" },
    { name: "Mixed Grill Platter", desc: "Adana kebab, chicken shish, köfte, rice, grilled vegetables" },
  ],
  Ramen: [
    { name: "Tonkotsu Ramen", desc: "Rich pork bone broth, chashu pork, soft egg, nori, scallion" },
    { name: "Miso Ramen", desc: "Fermented soybean broth, corn, butter, bean sprouts, ground pork" },
    { name: "Spicy Tantanmen", desc: "Sesame chili broth, ground pork, bok choy, soft egg, chili oil" },
  ],
  Coffee: [
    { name: "Latte & Pastry", desc: "House espresso latte, fresh-baked croissant, seasonal jam" },
    { name: "Cold Brew Float", desc: "Nitro cold brew, vanilla bean ice cream, chocolate drizzle" },
    { name: "Breakfast Sandwich", desc: "Egg, bacon, cheddar, arugula, house-made aioli, ciabatta" },
  ],
  Bakery: [
    { name: "Fresh Croissant Plate", desc: "Butter croissant, jam trio, whipped butter, fresh fruit" },
    { name: "Artisan Bread Board", desc: "Sourdough, focaccia, olive oil, balsamic, whipped ricotta" },
    { name: "Quiche Lorraine", desc: "Flaky pastry, bacon, gruyère, caramelized onion, side salad" },
  ],
  "Ice Cream": [
    { name: "Sundae Supreme", desc: "Three scoops, hot fudge, caramel, whipped cream, cherry" },
    { name: "Waffle Cone Duo", desc: "Two premium scoops, fresh waffle cone, sprinkles" },
    { name: "Banana Split", desc: "Banana, three scoops, chocolate, strawberry, pineapple, nuts" },
  ],
  Sandwiches: [
    { name: "Club Sandwich", desc: "Turkey, bacon, lettuce, tomato, mayo, toasted sourdough" },
    { name: "Italian Sub", desc: "Prosciutto, salami, capicola, provolone, peppers, oil & vinegar" },
    { name: "Grilled Cheese Deluxe", desc: "Three-cheese blend, tomato soup, sourdough, truffle oil" },
  ],
  Vegetarian: [
    { name: "Buddha Bowl", desc: "Quinoa, roasted vegetables, tahini, avocado, pickled onion" },
    { name: "Veggie Burger", desc: "Black bean patty, avocado, sprouts, chipotle aioli, brioche" },
    { name: "Stuffed Bell Peppers", desc: "Rice, black beans, corn, cheese, tomato sauce, cilantro" },
  ],
  Vegan: [
    { name: "Impossible Burger", desc: "Plant-based patty, vegan cheese, lettuce, tomato, special sauce" },
    { name: "Cauliflower Steak", desc: "Roasted cauliflower, chimichurri, quinoa, roasted vegetables" },
    { name: "Jackfruit Tacos", desc: "Pulled jackfruit, slaw, avocado crema, pickled onion, corn tortilla" },
  ],
};

const GENERIC_DISHES = [
  { name: "Chef's Special", desc: "House signature dish, seasonal ingredients, chef's preparation" },
  { name: "Grilled Entrée", desc: "Premium cut, house seasoning, seasonal vegetables, starch" },
  { name: "House Appetizer Sampler", desc: "Selection of house favorites, sharing-style, dipping sauces" },
];

function getDishesForCuisine(cuisine: string): { name: string; desc: string }[] {
  const dishes = CUISINE_DISHES[cuisine];
  if (dishes) return dishes;
  for (const [key, val] of Object.entries(CUISINE_DISHES)) {
    if (cuisine.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return GENERIC_DISHES;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
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
    const photoPromises: Promise<string>[] = [];
    const photoMeta: { placeIndex: number; photoIndex: number }[] = [];

    for (let pi = 0; pi < places.length; pi++) {
      const photos = places[pi].photos || [];
      const needed = Math.min(3, photos.length);
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

      const cuisineDishes = getDishesForCuisine(cuisine);
      const dishCount = Math.min(photos.length, 3);
      const selectedDishes = pickRandom(cuisineDishes, dishCount);

      selectedDishes.forEach((dish, di) => {
        dishes.push({
          id: `${place.id}_${di}`,
          name: dish.name,
          restaurant: restaurantName,
          cuisine,
          description: dish.desc,
          image: photos[di % photos.length].url,
          price,
          rating,
          address,
          placeId: place.id,
          photoAuthors: photos[di % photos.length].authors,
          suggested: true,
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
