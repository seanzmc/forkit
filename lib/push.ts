import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as NotificationsModule from "expo-notifications";
import type { Dish, Meal } from "./food-data";

// expo-notifications needs native code. Builds made before it was added (and
// the web build) don't have it, so load it defensively and treat push as
// unavailable rather than crashing on import.
let Notifications: typeof NotificationsModule | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

// In the foreground the WebSocket already moves everyone to the match screen,
// so a banner on top would just repeat it.
try {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Importable but missing its native side: push stays off.
  Notifications = null;
}

let tokenPromise: Promise<string | null> | null = null;

// Asks for notification permission the first time (iOS shows its prompt
// once), then returns this device's Expo push token, or null if push isn't
// available or allowed. Never throws.
export function getPushToken(): Promise<string | null> {
  if (!tokenPromise) {
    tokenPromise = (async () => {
      if (!Notifications) return null;
      try {
        // Android 13+ shows the permission prompt only once a channel
        // exists, and Expo needs one before it will issue a token.
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Matches",
            importance: Notifications.AndroidImportance.HIGH,
          });
        }
        let { status, canAskAgain } = await Notifications.getPermissionsAsync();
        if (status !== "granted" && canAskAgain) {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== "granted") return null;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
        return data;
      } catch {
        return null;
      }
    })();
    // A failure (offline, simulator) shouldn't stick for the whole app run.
    tokenPromise.then((t) => {
      if (!t) tokenPromise = null;
    });
  }
  return tokenPromise;
}

export interface MatchNotification {
  id: string;
  dish: Dish;
  meal?: Meal;
}

function toMatch(response: NotificationsModule.NotificationResponse | null): MatchNotification | null {
  const content = response?.notification.request.content;
  const data = content?.data as { type?: string; dish?: Dish; meal?: Meal } | undefined;
  if (data?.type !== "match" || !data.dish?.name) return null;
  return { id: response!.notification.request.identifier, dish: data.dish, meal: data.meal };
}

const handled = new Set<string>();

// Each tapped notification opens the match screen once, whether it arrives
// through the launch check or the listener.
function claim(match: MatchNotification | null): MatchNotification | null {
  if (!match || handled.has(match.id)) return null;
  handled.add(match.id);
  return match;
}

// The match notification that launched the app, if any.
export async function takeLaunchMatch(): Promise<MatchNotification | null> {
  if (!Notifications) return null;
  try {
    return claim(toMatch(await Notifications.getLastNotificationResponseAsync()));
  } catch {
    return null;
  }
}

// Taps on match notifications while the app is running or in the background.
export function onMatchTapped(cb: (match: MatchNotification) => void): () => void {
  if (!Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const match = claim(toMatch(response));
      if (match) cb(match);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
