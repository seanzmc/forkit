// Builds the TestFlight tester guide (docs/testers-guide.html) into a single
// self-contained page. Artifact hosting blocks external images, so the logo
// and splash SVGs are inlined as data URIs in place of __ICON__ / __SPLASH__.
const fs = require("fs");
const path = require("path");

// Run from the repo root (npm run guide:build).
const root = process.cwd();
const out = process.argv[2] || path.join(root, "dist", "testers-guide.html");

function dataUri(file) {
  const svg = fs.readFileSync(path.join(root, "assets", "images", file));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

const html = fs
  .readFileSync(path.join(root, "docs", "testers-guide.html"), "utf8")
  .replaceAll("__ICON__", dataUri("icon.svg"))
  .replaceAll("__SPLASH__", dataUri("splash-icon.svg"));

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(root, out)}`);
