import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as ApplicationModule from "expo-application";

// Build numbers come from EAS (appVersionSource "remote", autoIncrement), so
// they are only in the native binary, never in app.json. expo-application
// reads them; load it defensively like expo-notifications in lib/push.ts so a
// binary without its native side still shows the JS-side version.
let Application: typeof ApplicationModule | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Application = require("expo-application");
  } catch {
    Application = null;
  }
}

function read(): string {
  let version: string | null = null;
  let build: string | null = null;
  try {
    version = Application?.nativeApplicationVersion ?? null;
    build = Application?.nativeBuildVersion ?? null;
  } catch {
    // Importable but missing its native side.
  }
  version ??= Constants.expoConfig?.version ?? null;
  let label = version ? `v${version}` : "";
  if (build) label += ` (${build})`;
  if (__DEV__) label += " dev";
  return label.trim();
}

// e.g. "v1.0.0 (14)": marketing version plus store build number, so a
// screenshot says exactly which build someone is on.
export const appVersionLabel = read();
