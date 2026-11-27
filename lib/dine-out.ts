import { Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mealForTime, type Deck, type Meal } from "./food-data";

// Set once someone says "No thanks" to Android's Location Accuracy dialog,
// so it isn't shown again on every tap for the rest of the app run.
let accuracyDeclined = false;

// On Android, a Balanced fix needs Google's network location. With it off,
// expo-location shows the Location Accuracy dialog first and fails if it is
// declined, though GPS alone would do for a restaurant search. So after a
// failure fall back to a recent known fix, then to GPS without the dialog.
async function currentCoords(): Promise<{ lat: number; lng: number } | null> {
  const toCoords = (loc: Location.LocationObject) => ({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
  });
  try {
    return toCoords(
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: !accuracyDeclined,
      })
    );
  } catch {
    if (Platform.OS !== "android") return null;
    accuracyDeclined = true;
  }
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
    if (last) return toCoords(last);
    return await gpsFix(15000);
  } catch {
    return null;
  }
}

// One GPS fix, or null after `ms`. A subscription rather than
// getCurrentPositionAsync, so the GPS request stops when the time runs out
// instead of running on after the promise is abandoned.
async function gpsFix(ms: number): Promise<{ lat: number; lng: number } | null> {
  let sub: Location.LocationSubscription | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => resolve(null), ms);
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false },
        (loc) => resolve({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      ).then((s) => {
        // Settled before the subscription arrived: stop it right away.
        if (done) s.remove();
        else sub = s;
      }, reject);
    });
  } finally {
    done = true;
    clearTimeout(timer);
    sub?.remove();
  }
}

export const RADII = [
  { miles: 1, meters: 1609 },
  { miles: 3, meters: 4828 },
  { miles: 5, meters: 8047 },
  { miles: 10, meters: 16093 },
  { miles: 25, meters: 40234 },
];
export type DineSettings = { meal: Meal; radius: number; deck: Deck };

export async function preferredDineSettings(): Promise<DineSettings> {
  const values = await AsyncStorage.multiGet(["selectedRadius", "deckStyle"]).catch(() => []);
  const prefs = Object.fromEntries(values);
  const radius = RADII[Number(prefs.selectedRadius ?? 2)] ?? RADII[2];
  return {
    meal: mealForTime(new Date()),
    radius: radius.meters,
    deck: prefs.deckStyle === "dishes" ? "dishes" : "places",
  };
}

export async function dineRequest(settings: DineSettings) {
  let coords: { lat: number; lng: number } | null = null;
  if (Platform.OS === "web") {
    if (navigator.geolocation) {
      coords = await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 15000, maximumAge: 300000 }
        )
      );
    }
  } else {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.granted) coords = await currentCoords();
  }
  const now = new Date();
  return {
    mode: "dine-out",
    ...settings,
    ...coords,
    day: now.getDay(),
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
}

export function rememberDineSettings(settings: DineSettings) {
  const index = RADII.findIndex((r) => r.meters === settings.radius);
  return AsyncStorage.multiSet([
    ["selectedRadius", String(index < 0 ? 2 : index)],
    ["deckStyle", settings.deck],
  ]).catch(() => {});
}
