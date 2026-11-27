import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as StoreReviewModule from "expo-store-review";

// Loaded defensively like expo-notifications in push.ts: builds made before
// this native module was added just never ask.
let StoreReview: typeof StoreReviewModule | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    StoreReview = require("expo-store-review");
  } catch {
    StoreReview = null;
  }
}

const MATCHED_ROOMS_KEY = "reviewMatchedRooms";
const ASKED_KEY = "reviewAsked";
const MATCHES_BEFORE_ASKING = 2;
// Lets the match sink in (confetti, hero) before anything covers it.
const ASK_DELAY_MS = 5000;

// Notes that this room matched and says whether it's time to ask. Counts
// rooms, so reopening one match from its notification doesn't count twice.
async function recordMatch(code: string): Promise<boolean> {
  if (await AsyncStorage.getItem(ASKED_KEY)) return false;
  const rooms: string[] = JSON.parse((await AsyncStorage.getItem(MATCHED_ROOMS_KEY)) ?? "[]");
  if (rooms.length < MATCHES_BEFORE_ASKING && !rooms.includes(code)) {
    rooms.push(code);
    await AsyncStorage.setItem(MATCHED_ROOMS_KEY, JSON.stringify(rooms));
  }
  return rooms.length >= MATCHES_BEFORE_ASKING;
}

// Shows the store's own rating card. Both stores require theirs: Apple rejects
// custom review prompts (guideline 5.6.1), and Google forbids asking anything
// first ("Would you rate this app 5 stars"). Neither lets an app fill in the
// stars, says whether the card appeared, or shows it on every request.
async function askForReview() {
  // False on TestFlight and without the Play Store. Not marked as asked, so
  // those installs are asked once they move to a store build.
  if (!StoreReview || !(await StoreReview.isAvailableAsync())) return;
  await StoreReview.requestReview();
  await AsyncStorage.setItem(ASKED_KEY, "1");
}

// Asks for a store review once per install, on the match screen of the second
// room to match. Leaving the screen or the app first (Directions, Call, ...)
// puts it off until the next match.
export function useReviewPrompt(code: string | undefined) {
  useEffect(() => {
    if (!StoreReview || !code) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
      cancelled = true;
      clearTimeout(timer);
    };
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") cancel();
    });
    recordMatch(code.toUpperCase())
      .then((due) => {
        if (due && !cancelled) timer = setTimeout(() => askForReview().catch(() => {}), ASK_DELAY_MS);
      })
      .catch(() => {});
    return () => {
      cancel();
      sub.remove();
    };
  }, [code]);
}
