#!/bin/bash
# Installs (or with --uninstall removes) a macOS launchd agent that runs
# scripts/sync-local.sh against this repo's main checkout every 15 minutes and
# at login. Log: ~/Library/Logs/forkit-sync.log
#
#   scripts/install-sync-agent.sh [--uninstall]

set -eu

LABEL=com.forkit.sync-local
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/forkit-sync.log"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$PLIST"
  echo "Removed $LABEL"
  exit 0
fi

# The main checkout, even when this is run from a linked worktree.
REPO=$(git -C "$(dirname "$0")" worktree list --porcelain | awk '/^worktree /{print $2; exit}')
SCRIPT="$REPO/scripts/sync-local.sh"
if [ ! -f "$SCRIPT" ]; then
  echo "$SCRIPT not found; pull main first" >&2
  exit 1
fi

# launchd starts with a bare PATH; give it the one node, npm and git are on.
AGENT_PATH="$(dirname "$(command -v node)"):$(dirname "$(command -v git)"):/usr/bin:/bin:/usr/sbin:/sbin"

mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SCRIPT</string>
    <string>$REPO</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$AGENT_PATH</string>
  </dict>
  <key>StartInterval</key>
  <integer>900</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>LowPriorityIO</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootstrap "$DOMAIN" "$PLIST"
echo "Installed $LABEL for $REPO (every 15 min). Log: $LOG"
