import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const KEY = "memberId";
let cached: Promise<string> | null = null;

function newWebMemberId(): string {
  if (typeof globalThis.crypto.randomUUID === "function") return Crypto.randomUUID();
  // A phone reaching a dev server over Wi-Fi has getRandomValues but no
  // randomUUID. Set the UUID v4 version and variant bits on 16 random bytes.
  const bytes = Crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

// The id this device joins rooms with. It survives the app being killed in
// the background, so reopening it and rejoining a room picks up the same
// member (and their swipes) instead of adding a stranger who never votes.
// On the web each page load gets its own, so two tabs can still play
// against each other.
export function getMemberId(): Promise<string> {
  if (!cached) {
    cached =
      Platform.OS === "web"
        ? Promise.resolve(newWebMemberId())
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
