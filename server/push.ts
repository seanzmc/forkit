// Match notifications through Expo's push service, so members who left the
// app (or went back to Home) still hear the result. Tokens live only in the
// session's memory and are dropped with it; nothing is persisted.
//
// EXPO_ACCESS_TOKEN is optional: set it only if "enhanced push security" is
// turned on for the Expo project, which then requires it on every send.

import type { Dish } from "../lib/food-data";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN || "";
// APNs rejects payloads over 4 KB; leave room for title, body and envelope.
const MAX_DATA_BYTES = 3000;

const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$/;

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

function matchText(dish: Dish): { title: string; body: string } {
  if (dish.mode === "cook-in") {
    return { title: "It's a match!", body: `Tonight's recipe: ${dish.name}` };
  }
  return {
    title: "Dinner is decided!",
    body: dish.restaurantOnly ? dish.restaurant : `${dish.name} at ${dish.restaurant}`,
  };
}

// The tapped notification opens the match screen from this copy of the dish,
// since the session itself may already be gone by then. Trimming never drops
// attribution: grounded dishes keep their Google Maps sources, and the photo
// goes only together with its author credit.
function dishForPayload(dish: Dish): Partial<Dish> {
  const fits = (d: Partial<Dish>) => JSON.stringify(d).length <= MAX_DATA_BYTES;
  if (fits(dish)) return dish;
  const { phone: _phone, website: _website, ...rest } = dish;
  const trimmed: Partial<Dish> = { ...rest, description: dish.description.slice(0, 140) };
  if (fits(trimmed)) return trimmed;
  const { image: _image, photoAuthors: _authors, ...noPhoto } = trimmed;
  return { ...noPhoto, image: "" };
}

export async function sendMatchPush(
  tokens: Iterable<string>,
  code: string,
  dish: Dish
): Promise<void> {
  const to = [...new Set(tokens)];
  if (to.length === 0) return;
  const { title, body } = matchText(dish);
  const messages = to.map((token) => ({
    to: token,
    title,
    body,
    sound: "default",
    data: { type: "match", code, dish: dishForPayload(dish) },
  }));
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await res.json().catch(() => null);
    // Per-message tickets say whether each one was accepted. Log counts and
    // error codes only, never the tokens.
    const tickets: { status?: string; details?: { error?: string } }[] = result?.data || [];
    const failed = tickets.filter((t) => t.status !== "ok");
    if (!res.ok || failed.length) {
      console.warn(
        `Match push: HTTP ${res.status}, ${failed.length}/${to.length} failed` +
          (failed.length ? ` (${[...new Set(failed.map((t) => t.details?.error || "unknown"))].join(", ")})` : "")
      );
    }
  } catch (error) {
    console.warn("Match push failed:", error instanceof Error ? error.message : error);
  }
}
