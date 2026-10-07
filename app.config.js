const fs = require("fs");
const path = require("path");

// app.json holds the config; this only adds the Firebase file Android needs
// for push tokens. The repo is public, so google-services.json is gitignored:
// EAS builds get it from the GOOGLE_SERVICES_JSON file env var, local builds
// from a copy at the repo root.
module.exports = ({ config }) => {
  const local = path.join(__dirname, "google-services.json");
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(local) ? "./google-services.json" : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
