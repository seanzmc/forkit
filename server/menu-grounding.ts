// Popular dishes for a restaurant via Gemini's "Grounding with Google Maps".
//
// Google's terms forbid building content from Places data ourselves (e.g. our
// own LLM pass over reviews). Maps grounding is the sanctioned route, with two
// obligations the client must honor:
//   - the Google Maps source links are shown immediately after the generated
//     dishes, reachable within one tap (see components/GroundedSource.tsx);
//   - output is served for the life of a session only, never persisted.
//
// Disabled unless GEMINI_API_KEY is set. Any failure returns null and the
// caller falls back to cuisine-based "suggested" dishes.

import type { GroundedSource } from "../lib/food-data";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
// gemini-2.5-* only serves projects that used it before (404 for new keys);
// 3.5 Flash-Lite is a current GA model with Maps grounding, cheap and fast
// enough for ~20 parallel calls per session.
const GEMINI_MODEL = process.env.GEMINI_MAPS_MODEL || "gemini-3.5-flash-lite";
const TIMEOUT_MS = 10_000;
const MAX_DISHES = 3;

export interface GroundedDish {
  name: string;
  desc: string;
}

export interface GroundedMenu {
  dishes: GroundedDish[];
  sources: GroundedSource[];
}

export const menuGroundingEnabled = () => !!GEMINI_API_KEY;

interface MapsChunk {
  maps?: { uri?: string; title?: string; placeId?: string };
}

function parseDishes(text: string): GroundedDish[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const dishes: GroundedDish[] = [];
  for (const item of raw) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const desc = typeof item?.desc === "string" ? item.desc.trim() : "";
    if (!name || name.length > 60 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    dishes.push({ name, desc: desc.slice(0, 120) });
    if (dishes.length === MAX_DISHES) break;
  }
  return dishes;
}

// Places API ids come back as "ChIJ..."; grounding chunks may prefix "places/".
const samePlace = (a?: string, b?: string) =>
  !!a && !!b && a.replace(/^places\//, "") === b.replace(/^places\//, "");

export async function fetchPopularDishes(place: {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}): Promise<GroundedMenu | null> {
  if (!GEMINI_API_KEY) return null;

  const prompt =
    `Using Google Maps, list up to ${MAX_DISHES} specific dishes that reviewers ` +
    `mention or recommend at the restaurant "${place.name}" located at ` +
    `${place.address}. Only include dishes this restaurant actually serves. ` +
    `Reply with only a JSON array, no prose: ` +
    `[{"name": "dish name", "desc": "description under 12 words"}]. ` +
    `If you are not sure, reply [].`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude: place.lat, longitude: place.lng },
            },
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (!res.ok) {
      // Google's error message says why (model not found, quota, permission).
      const detail = await res
        .json()
        .then((b) => String(b?.error?.message || "").slice(0, 200))
        .catch(() => "");
      console.warn(
        `Gemini maps grounding ${res.status} (${GEMINI_MODEL}) for ${place.name}${detail ? `: ${detail}` : ""}`
      );
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const text: string = (candidate?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("");
    const chunks: MapsChunk[] = candidate?.groundingMetadata?.groundingChunks || [];
    // Answers we can't use are dropped silently otherwise; log why. Only the
    // reply's shape is logged, never its text: grounded output must not be
    // persisted (Google's terms), and logs outlive the session.
    const drop = (why: string) => {
      console.warn(
        `Gemini maps grounding dropped (${GEMINI_MODEL}) for ${place.name}: ${why}; ` +
          `finish=${candidate?.finishReason ?? "none"} chunks=${chunks.length} ` +
          `textLen=${text.length} hasBracket=${text.includes("[")} fenced=${text.includes("```")}`
      );
      return null;
    };

    const dishes = parseDishes(text);
    if (dishes.length === 0) return drop("no parseable dishes");

    const maps = chunks
      .map((c) => c.maps)
      .filter((m): m is NonNullable<MapsChunk["maps"]> => !!m?.uri);
    // Prefer the chunk for this exact place; otherwise keep every source the
    // model used, since each one supports the generated text.
    const matched = maps.filter((m) => samePlace(m.placeId, place.id));
    const sources = [
      ...new Map(
        (matched.length ? matched : maps).map((m) => [
          m.uri!,
          { title: m.title || place.name, uri: m.uri! },
        ])
      ).values(),
    ];
    // No Google Maps source means the answer isn't grounded and can't be
    // attributed, so it can't be shown.
    if (sources.length === 0) return drop("no Google Maps sources");

    return { dishes, sources };
  } catch (error) {
    console.warn(`Gemini maps grounding failed for ${place.name}:`, error);
    return null;
  }
}
