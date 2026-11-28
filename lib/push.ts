import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as NotificationsModule from "expo-notifications";
import { DISHES, RECIPES, matchPlaceReference, type Dish, type Meal, type SampleReason } from "./food-data";
import { BELL_CHANNEL, MATCH_SOUND_FILE, type MatchChannel } from "../shared/match-sound";
import { ringForMatch } from "./sounds";

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
    handleNotification: async ({ request }) => {
      const data = request.content.data;
      if (data?.type === "match" && typeof data.code === "string") ringForMatch(data.code);
      return { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
    },
  });
} catch {
  // Importable but missing its native side: push stays off.
  Notifications = null;
}

// Set once this install has created "default" with the bell, so a user who
// later picks the system sound for it isn't mistaken for an older install.
const BELL_DEFAULT_KEY = "matchChannelHasBell";

// Android fixes a channel's sound when it is created, so the bell needs a
// channel of its own on installs that made the stock "default" one before.
async function androidMatchChannel(n: typeof NotificationsModule): Promise<MatchChannel> {
  if (await n.getNotificationChannelAsync(BELL_CHANNEL)) return BELL_CHANNEL;
  const legacy = await n.getNotificationChannelAsync("default");
  const bell = { name: "Matches", importance: n.AndroidImportance.HIGH, sound: MATCH_SOUND_FILE };
  if (!legacy) {
    await n.setNotificationChannelAsync("default", bell);
    await AsyncStorage.setItem(BELL_DEFAULT_KEY, "1").catch(() => {});
    return "default";
  }
  // Leave a channel the user silenced, lowered or gave another sound alone.
  const stock = legacy.sound === "default" && legacy.importance === n.AndroidImportance.HIGH;
  if (!stock || (await AsyncStorage.getItem(BELL_DEFAULT_KEY).catch(() => null))) return "default";
  await n.setNotificationChannelAsync(BELL_CHANNEL, {
    ...bell,
    enableVibrate: legacy.enableVibrate,
    vibrationPattern: legacy.vibrationPattern,
    showBadge: legacy.showBadge,
    enableLights: legacy.enableLights,
    lightColor: legacy.lightColor,
    // UNKNOWN is "no override"; written back it would become PUBLIC and show
    // the match on a lock screen set to hide sensitive content.
    ...(legacy.lockscreenVisibility !== n.AndroidNotificationVisibility.UNKNOWN && {
      lockscreenVisibility: legacy.lockscreenVisibility,
    }),
  });
  // Otherwise settings list two "Matches" channels, one of which does nothing.
  await n.deleteNotificationChannelAsync("default").catch(() => {});
  return BELL_CHANNEL;
}

type Registration = { pushToken: string; matchChannel: MatchChannel };
let tokenPromise: Promise<Registration | null> | null = null;

// Register the token and the channel this installation can actually use.
// Permission denial and unavailable push both leave the swipe flow usable.
export function getMatchPushRegistration(): Promise<Registration | null> {
  if (!tokenPromise) {
    tokenPromise = (async () => {
      if (!Notifications) return null;
      try {
        // Android 13+ shows the permission prompt only once a channel
        // exists, and Expo needs one before it will issue a token.
        const matchChannel = Platform.OS === "android" ? await androidMatchChannel(Notifications) : "default";
        let { status, canAskAgain } = await Notifications.getPermissionsAsync();
        if (status !== "granted" && canAskAgain) {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== "granted") return null;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
        return { pushToken: data, matchChannel };
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
  code?: string;
  dish: Dish;
  meal?: Meal;
  sample?: SampleReason;
}

function toMatch(response: NotificationsModule.NotificationResponse | null): MatchNotification | null {
  const content = response?.notification.request.content;
  const data = content?.data as
    | { type?: string; code?: string; dish?: Dish; meal?: Meal; sample?: SampleReason }
    | undefined;
  if (data?.type !== "match" || !data.dish?.name) return null;
  // Historical notifications may still have the former provider's photo.
  const dish = data.dish.placeId
    ? matchPlaceReference(data.dish.placeId)
    : [...DISHES, ...RECIPES].find((item) => item.id === data.dish?.id) ?? data.dish;
  return {
    id: response!.notification.request.identifier,
    code: data.code,
    dish,
    meal: data.meal,
    sample: data.sample,
  };
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
