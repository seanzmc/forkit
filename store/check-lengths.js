#!/usr/bin/env node
// Checks store listing fields against their character limits.
//
// A field is a line like `**Subtitle** [21 / 30]` followed by a fenced block.
// The script reports each field's real length, fails if any is over its
// limit, and with --fix rewrites the `[n / max]` counts in place.
const fs = require("fs");
const path = require("path");

const fix = process.argv.includes("--fix");
const files = ["app-store.md", "google-play.md"].map((f) => path.join(path.dirname(process.argv[1]), f));
let over = false;

for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\*\*.+?\*\*) \[\s*\d*\s*\/\s*(\d+)\]/);
    if (!m) continue;
    const start = lines.indexOf("```", i + 1);
    const end = lines.indexOf("```", start + 1);
    if (start < 0 || end < 0) continue;
    const text = lines.slice(start + 1, end).join("\n");
    // App Store Connect and Play Console count characters, not bytes.
    const len = [...text].length;
    const max = Number(m[2]);
    const flag = len > max ? "  OVER" : "";
    if (flag) over = true;
    console.log(`${path.basename(file)}  ${m[1].replace(/\*/g, "")}: ${len} / ${max}${flag}`);
    if (fix) lines[i] = lines[i].replace(/\[\s*\d*\s*\/\s*\d+\]/, `[${len} / ${max}]`);
  }
  if (fix) fs.writeFileSync(file, lines.join("\n"));
}

process.exit(over ? 1 : 0);
