// Builds the tester guides (docs/testers-guide.html for TestFlight,
// docs/android-testers-guide.html for the Play closed test) into single
// self-contained pages. Artifact hosting blocks external images, so the logo
// and splash SVGs are inlined as data URIs in place of __ICON__ / __SPLASH__.
const fs = require("fs");
const path = require("path");

// Run from the repo root (npm run guide:build).
const root = process.cwd();
const guides = ["testers-guide.html", "android-testers-guide.html"];

function dataUri(file) {
  const svg = fs.readFileSync(path.join(root, "assets", "images", file));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

for (const name of guides) {
  const out = path.join(root, "dist", name);
  const html = fs
    .readFileSync(path.join(root, "docs", name), "utf8")
    .replaceAll("__ICON__", dataUri("icon.svg"))
    .replaceAll("__SPLASH__", dataUri("splash-icon.svg"));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Wrote ${path.relative(root, out)}`);
}
