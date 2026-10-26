#!/usr/bin/env node
// Reports whether every place ForkIt's code lives is on the latest main:
// the local main checkout and its node_modules, the live server, and the
// newest iOS/Android code (store build or over-the-air update).
//
//   npm run sync:status
//
// Needs git and network access; the server check uses the public health
// endpoint, the app checks use eas-cli (logged in as the project owner).

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const HEALTH_URL = "https://forkit-server-production.up.railway.app/api/health";
// Everything that goes into the app binary or its JS bundle. A change outside
// these (server/, store/, docs/) doesn't leave the apps behind.
const CLIENT_PATHS = [
  "app", "components", "constants", "lib", "assets", "app.json",
  "app.config.js", "eas.json", "package.json", "package-lock.json",
  "babel.config.js", "metro.config.js", "tsconfig.json",
];

const sh = (cmd, opts = {}) =>
  execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts }).trim();
const tryJson = (cmd) => {
  try {
    return JSON.parse(sh(cmd, { timeout: 120000 }));
  } catch {
    return null;
  }
};
const short = (sha) => (sha ? sha.slice(0, 7) : "?");
let behindAny = false;
const line = (ok, label, detail) => {
  if (!ok) behindAny = true;
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(16)} ${detail}`);
};

sh("git fetch --quiet origin main");
const main = sh("git rev-parse origin/main");
console.log(`origin/main is ${short(main)} ${sh("git log -1 --format=%s origin/main")}\n`);

// How far a commit is from main, counting only client-affecting changes when
// clientOnly is set.
function lag(sha, clientOnly) {
  if (!sha) return "unknown";
  try {
    sh(`git cat-file -e ${sha}^{commit}`);
  } catch {
    return `${short(sha)} (not in this clone)`;
  }
  const behind = Number(sh(`git rev-list --count ${sha}..${main}`));
  if (!behind) return null;
  if (!clientOnly) return `${behind} commit(s) behind`;
  const files = sh(`git diff --name-only ${sha} ${main} -- ${CLIENT_PATHS.join(" ")}`);
  return files ? `${behind} commit(s) behind, app code changed` : null;
}

// Local main checkout (the first worktree), even when run from a linked one.
const repo = sh("git worktree list --porcelain").match(/^worktree (.+)$/m)[1];
const local = sh(`git -C "${repo}" rev-parse HEAD`);
const branch = sh(`git -C "${repo}" symbolic-ref --short -q HEAD || true`);
const localLag = branch === "main" ? lag(local, false) : `on '${branch}', not main`;
line(!localLag, "local main", localLag ? `${short(local)}: ${localLag}` : short(local));

const lockSha = createHash("sha1")
  .update(readFileSync(path.join(repo, "package-lock.json")))
  .digest("hex");
const stampPath = path.join(repo, "node_modules/.forkit-lock-sha");
const stamp = existsSync(stampPath) ? readFileSync(stampPath, "utf8").trim() : null;
line(
  stamp === lockSha,
  "local deps",
  stamp === lockSha
    ? "node_modules matches package-lock.json"
    : stamp
      ? "package-lock.json changed since sync-local.sh last installed"
      : "unknown (no stamp; scripts/sync-local.sh writes one when it installs)",
);

let health = null;
try {
  health = await (await fetch(HEALTH_URL, { signal: AbortSignal.timeout(15000) })).json();
} catch {}
if (health?.commit) {
  const serverLag = lag(health.commit, false);
  line(!serverLag, "server (Railway)", serverLag ? `${short(health.commit)}: ${serverLag}` : short(health.commit));
} else {
  line(false, "server (Railway)", health ? "unknown (no commit in /api/health)" : "unreachable");
}

// Apps: the newest production code a device can get is the later of the
// newest store build and the newest update on the production channel.
// update:list gives group summaries without commits; update:view gives each
// platform's update in a group, with its gitCommitHash.
const groups =
  tryJson("npx --yes eas-cli@latest update:list --branch production --limit 10 --json --non-interactive")
    ?.currentPage ?? [];
function latestUpdate(platform) {
  const group = groups.find((g) => (g.platforms ?? "").split(", ").includes(platform));
  if (!group) return null;
  const updates = tryJson(`npx --yes eas-cli@latest update:view ${group.group} --json`) ?? [];
  return updates.find((u) => u.platform === platform) ?? null;
}

for (const platform of ["ios", "android"]) {
  const builds = tryJson(
    `npx --yes eas-cli@latest build:list --platform ${platform} --build-profile production --status finished --limit 1 --json --non-interactive`,
  );
  const build = builds?.[0];
  const update = latestUpdate(platform);
  const candidates = [build?.gitCommitHash, update?.gitCommitHash].filter(Boolean);
  // Whichever is closer to main.
  const best = candidates
    .map((sha) => ({ sha, lag: lag(sha, true) }))
    .sort((a, b) => (a.lag === null ? -1 : b.lag === null ? 1 : 0))[0];
  const what = [
    build ? `build ${build.appBuildVersion} @ ${short(build.gitCommitHash)}` : "no build",
    update ? `update @ ${short(update.gitCommitHash)}` : "no update",
  ].join(", ");
  line(best && !best.lag, `${platform} app`, best?.lag ? `${what}: ${best.lag}` : what);
}

console.log(
  behindAny
    ? "\nSomething is behind. See \"Keeping every part current\" in CLAUDE.md."
    : "\nEverything is on main.",
);
process.exitCode = behindAny ? 1 : 0;
