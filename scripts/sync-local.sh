#!/bin/bash
# Keeps a local checkout of main caught up with origin/main, including
# node_modules. Run by the launchd agent from scripts/install-sync-agent.sh
# every 15 minutes; safe to run by hand.
#
#   scripts/sync-local.sh [path-to-main-checkout]
#
# It never discards work: it only fast-forwards, and only when the checkout is
# on main with no uncommitted changes to tracked files. It reinstalls
# node_modules (npm ci) whenever package-lock.json differs from the one last
# installed, unless something is running from that node_modules (Metro, the
# dev server), in which case it leaves a notification and retries next run.

set -u

REPO="${1:-$(cd "$(dirname "$0")/.." && pwd -P)}"
STAMP="$REPO/node_modules/.forkit-lock-sha"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }
notify() {
  log "notify: $1"
  osascript -e "display notification \"$1\" with title \"ForkIt sync\"" >/dev/null 2>&1 || true
}

cd "$REPO" 2>/dev/null || { log "no such checkout: $REPO"; exit 1; }

# Linked worktrees hold feature branches; only the main checkout is synced.
if [ "$(git rev-parse --git-dir 2>/dev/null)" != ".git" ]; then
  log "skip: $REPO is not a main checkout"
  exit 0
fi

branch=$(git symbolic-ref --short -q HEAD)
if [ "$branch" != "main" ]; then
  log "skip: on '$branch', not main"
  exit 0
fi

if ! git fetch --quiet --prune origin; then
  log "skip: fetch failed (offline?)"
  exit 0
fi

before=$(git rev-parse HEAD)
target=$(git rev-parse origin/main)

if [ "$before" != "$target" ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    log "skip pull: uncommitted changes; $(git rev-list --count HEAD..origin/main) commit(s) behind"
  elif git merge --ff-only --quiet origin/main; then
    count=$(git rev-list --count "$before..HEAD")
    notify "Pulled $count new commit(s) into main: $(git log -1 --format=%s | head -c 80)"
  else
    notify "Couldn't fast-forward main (diverged, or untracked files in the way); fix it by hand"
  fi
fi

# node_modules: reinstall when the lockfile changed since the last install.
# No stamp (first run, or node_modules installed by hand) counts as stale:
# npm ls only checks package.json ranges, not the locked versions, so the
# only way to know node_modules matches the lockfile is to install from it.
lock_sha=$(shasum package-lock.json | cut -d' ' -f1)
installed_sha=$(cat "$STAMP" 2>/dev/null || true)

if [ "$installed_sha" != "$lock_sha" ]; then
  if pgrep -f "$REPO/node_modules/" >/dev/null 2>&1; then
    log "deps stale but something is running from $REPO/node_modules; retrying next run"
    if [ "$(cat "$REPO/.git/forkit-sync-warned" 2>/dev/null)" != "$lock_sha" ]; then
      notify "Dependencies changed. Stop Metro/the server in $REPO so they can be reinstalled"
      echo "$lock_sha" > "$REPO/.git/forkit-sync-warned"
    fi
  else
    log "node_modules not installed from this lockfile; running npm ci"
    if npm ci --no-audit --no-fund >/dev/null 2>&1; then
      echo "$lock_sha" > "$STAMP"
      notify "Reinstalled node_modules for the new package-lock.json"
    else
      notify "npm ci failed in $REPO; run it by hand"
    fi
  fi
fi

log "ok: main at $(git rev-parse --short HEAD), origin/main at $(git rev-parse --short origin/main)"
