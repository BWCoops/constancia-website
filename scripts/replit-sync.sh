#!/usr/bin/env bash
# replit-sync.sh — pull latest from GitHub into the Replit workspace, on a loop.
# ─────────────────────────────────────────────────────────────────────────────
# Usage (run ONCE in the Replit shell, leave it running in background):
#
#   bash scripts/replit-sync.sh &
#
# To stop it later:
#
#   pkill -f replit-sync.sh
#
# What it does:
#   - Sets up the GitHub remote if missing
#   - Every POLL_SECONDS, fetches origin/$BRANCH and hard-resets the workspace
#     to match (preserves .replit, .env, node_modules, .config — they're
#     gitignored so reset doesn't touch them)
#   - If new commits arrive AND package.json changed, runs npm install
#   - Logs to scripts/replit-sync.log
#
# Why this exists:
#   Replit's built-in GitHub Integration UI is buried. This is a 60-line
#   alternative: trigger setup once, every git push from anyone auto-flows
#   to the dev URL within POLL_SECONDS.

set -uo pipefail

REPO_URL="${REPO_URL:-https://github.com/BWCoops/constancia-website.git}"
BRANCH="${BRANCH:-rebrand/constancia}"
POLL_SECONDS="${POLL_SECONDS:-30}"
WORKSPACE="${WORKSPACE:-$HOME/workspace}"
LOG_FILE="${LOG_FILE:-$WORKSPACE/scripts/replit-sync.log}"

cd "$WORKSPACE" || { echo "ERROR: workspace dir $WORKSPACE not found" >&2; exit 1; }

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  printf "[%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG_FILE"
}

# One-time git setup
if [ ! -d .git ]; then
  log "git init (no .git found)"
  git init -b "$BRANCH" >/dev/null 2>&1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  log "adding origin -> $REPO_URL"
  git remote add origin "$REPO_URL"
else
  CURRENT_URL="$(git remote get-url origin)"
  if [ "$CURRENT_URL" != "$REPO_URL" ]; then
    log "updating origin from $CURRENT_URL -> $REPO_URL"
    git remote set-url origin "$REPO_URL"
  fi
fi

git config user.email "replit-sync@constancia.io"
git config user.name "Replit Auto-Sync"

LAST_SHA=""

log "starting sync loop: branch=$BRANCH poll=${POLL_SECONDS}s repo=$REPO_URL"

while true; do
  # Fetch quietly. Failures (network, repo-private) are logged but don't kill the loop.
  if git fetch origin "$BRANCH" --quiet 2>>"$LOG_FILE"; then
    NEW_SHA="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")"

    if [ -n "$NEW_SHA" ] && [ "$NEW_SHA" != "$LAST_SHA" ]; then
      OLD_PKG_HASH=""
      [ -f package.json ] && OLD_PKG_HASH="$(sha1sum package.json | cut -d' ' -f1)"

      log "new commit on $BRANCH: $NEW_SHA — resetting workspace"
      # --hard discards local edits, but .replit/.env/node_modules are gitignored
      git reset --hard "origin/$BRANCH" >>"$LOG_FILE" 2>&1

      NEW_PKG_HASH=""
      [ -f package.json ] && NEW_PKG_HASH="$(sha1sum package.json | cut -d' ' -f1)"

      if [ "$OLD_PKG_HASH" != "$NEW_PKG_HASH" ]; then
        log "package.json changed — running npm install (this may take a minute)"
        npm install --no-audit --no-fund >>"$LOG_FILE" 2>&1 \
          && log "npm install complete" \
          || log "WARN: npm install failed (see log)"
      fi

      LAST_SHA="$NEW_SHA"
      log "sync complete: $NEW_SHA"
    fi
  else
    log "fetch failed (network or repo private)"
  fi

  sleep "$POLL_SECONDS"
done
