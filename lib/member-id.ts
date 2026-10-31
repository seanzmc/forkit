import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const KEY = "memberId";
let cached: Promise<string> | null = null;

// The id this device joins rooms with. It survives the app being killed in
// the background, so reopening it and rejoining a room picks up the same
// member (and their swipes) instead of adding a stranger who never votes.
// On the web each page load gets its own, so two tabs can still play
// against each other.
export function getMemberId(): Promise<string> {
  if (!cached) {
    cached =
      Platform.OS === "web"
        ? Promise.resolve(Crypto.randomUUID())
        : AsyncStorage.getItem(KEY)
            .then(async (stored) => {
              if (stored) return stored;
              const id = Crypto.randomUUID();
              await AsyncStorage.setItem(KEY, id).catch(() => {});
              return id;
            })
            .catch(() => Crypto.randomUUID());
  }
  return cached;
}
