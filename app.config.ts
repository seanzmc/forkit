import fs from "fs";
import type { ConfigContext, ExpoConfig } from "expo/config";

// app.json holds the config; this only wires in the Firebase file Android
// push needs. On EAS it comes from the GOOGLE_SERVICES_JSON file env var;
// locally from ./google-services.json (gitignored). Without either the build
// still works, it just gets no Android push tokens.
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (fs.existsSync("./google-services.json") ? "./google-services.json" : undefined);

  return {
    ...config,
    name: config.name ?? "ForkIt",
    slug: config.slug ?? "forkit",
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
