import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as ApplicationModule from "expo-application";
import type * as UpdatesModule from "expo-updates";

// Build numbers come from EAS (appVersionSource "remote", autoIncrement), so
// they are only in the native binary, never in app.json. expo-application
// reads them; load it defensively like expo-notifications in lib/push.ts so a
// binary without its native side still shows the JS-side version. Same for
// expo-updates: builds older than it have no native side.
let Application: typeof ApplicationModule | null = null;
let Updates: typeof UpdatesModule | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Application = require("expo-application");
  } catch {
    Application = null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Updates = require("expo-updates");
  } catch {
    Updates = null;
  }
}

function read(): string {
  let version: string | null = null;
  let build: string | null = null;
  let update: string | null = null;
  try {
    version = Application?.nativeApplicationVersion ?? null;
    build = Application?.nativeBuildVersion ?? null;
  } catch {
    // Importable but missing its native side.
  }
  try {
    // Only set when running an over-the-air update rather than the JS that
    // shipped inside the binary.
    if (Updates && !Updates.isEmbeddedLaunch && Updates.updateId) {
      update = Updates.updateId.slice(0, 8);
    }
  } catch {
    // Importable but missing its native side.
  }
  version ??= Constants.expoConfig?.version ?? null;
  let label = version ? `v${version}` : "";
  if (build) label += ` (${build})`;
  if (update) label += ` · ${update}`;
  if (__DEV__) label += " dev";
  return label.trim();
}

// e.g. "v1.0.0 (14)" or "v1.0.0 (14) · 3f2a1b9c": marketing version, store
// build number and, after an over-the-air update, the start of its update ID,
// so a screenshot says exactly which code someone is running.
export const appVersionLabel = read();
