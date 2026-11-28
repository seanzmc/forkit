// Match notifications through Expo's push service, so members who left the
// app (or went back to Home) still hear the result. Tokens live only in the
// session's memory and are dropped with it; nothing is persisted.
//
// EXPO_ACCESS_TOKEN is optional: set it only if "enhanced push security" is
// turned on for the Expo project, which then requires it on every send.

import { matchPlaceReference, type Dish, type Meal, type SampleReason } from "../lib/food-data";
import { BELL_CHANNEL, MATCH_SOUND_FILE, type MatchChannel } from "../shared/match-sound";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN || "";
// APNs rejects payloads over 4 KB; leave room for title, body and envelope.
const MAX_DATA_BYTES = 3000;

const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$/;

export type PushTarget = { token: string; matchChannel?: MatchChannel };

export function matchPushTarget(token: unknown, channel: unknown): PushTarget | undefined {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return;
  return { token, matchChannel: channel === "default" || channel === BELL_CHANNEL ? channel : undefined };
}

const MEAL_TITLE: Record<Meal, string> = {
  breakfast: "Breakfast is decided!",
  lunch: "Lunch is decided!",
  dinner: "Dinner is decided!",
};

function matchText(dish: Dish, meal: Meal): { title: string; body: string } {
  if (dish.mode === "cook-in") {
    return { title: "It's a match!", body: `Tonight's recipe: ${dish.name}` };
  }
  return {
    title: MEAL_TITLE[meal],
    body: dish.placeId ? "Tap to see your group’s restaurant." : `${dish.name} at ${dish.restaurant}`,
  };
}

// Restaurant details and photos stay in the live room. The place ID can
// reopen Google Maps even after the room expires. Older app versions also
// understand the small dish object carried in the notification.
function dishForPayload(dish: Dish): Partial<Dish> {
  if (dish.placeId) return matchPlaceReference(dish.placeId);
  const fits = (d: Partial<Dish>) => JSON.stringify(d).length <= MAX_DATA_BYTES;
  if (fits(dish)) return dish;
  const { phone: _phone, website: _website, ...rest } = dish;
  const trimmed: Partial<Dish> = { ...rest, description: dish.description.slice(0, 140) };
  if (fits(trimmed)) return trimmed;
  const { image: _image, photoAuthors: _authors, photoCredit: _credit, placePhotoCredit: _placeCredit, ...noPhoto } = trimmed;
  return { ...noPhoto, image: "" };
}

export async function sendMatchPush(
  targets: Iterable<PushTarget>,
  code: string,
  dish: Dish,
  meal: Meal = "dinner",
  sample?: SampleReason
): Promise<void> {
  const recipients = new Map<string, PushTarget>();
  for (const target of targets) recipients.set(target.token, target);
  if (!recipients.size) return;
  const { title, body } = matchText(dish, meal);
  const messages = [...recipients.values()].map(({ token, matchChannel }) => ({
    to: token,
    title,
    body,
    // Older binaries have neither the sound file nor a versioned channel.
    sound: matchChannel ? MATCH_SOUND_FILE : "default",
    channelId: matchChannel ?? "default",
    // sample lets the match screen say why a sample room's places are made up.
    data: { type: "match", code, meal, sample, dish: dishForPayload(dish) },
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
        `Match push: HTTP ${res.status}, ${failed.length}/${messages.length} failed` +
          (failed.length ? ` (${[...new Set(failed.map((t) => t.details?.error || "unknown"))].join(", ")})` : "")
      );
    }
  } catch (error) {
    console.warn("Match push failed:", error instanceof Error ? error.message : error);
  }
}
