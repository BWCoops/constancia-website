#!/bin/bash
# Automatically called by scripts/post-merge.sh on every Replit merge.
# Requires GITHUB_PAT to be set in Replit Secrets (Settings > Secrets).
# If GITHUB_PAT is absent the script warns and exits cleanly — it does
# not block npm install or db:push from succeeding.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)
CREDS_FILE=$(mktemp)

cleanup() {
  rm -f "$CREDS_FILE"
}
trap cleanup EXIT

if [ -z "${GITHUB_PAT:-}" ]; then
  echo "[github-push] WARNING: GITHUB_PAT secret is not set — skipping push" >&2
  echo "[github-push] Add GITHUB_PAT to Replit Secrets to enable automatic sync." >&2
  exit 0
fi

printf 'https://x-access-token:%s@github.com\n' "$GITHUB_PAT" > "$CREDS_FILE"
chmod 600 "$CREDS_FILE"

echo "[github-push] fetching remote state for branch '${BRANCH}'..."
git -c "credential.helper=store --file ${CREDS_FILE}" fetch origin "${BRANCH}" \
  || echo "[github-push] WARNING: fetch failed (network/auth issue) — attempting push anyway" >&2

echo "[github-push] pushing branch '${BRANCH}' to GitHub..."
git -c "credential.helper=store --file ${CREDS_FILE}" \
  push origin "${BRANCH}:${BRANCH}" --force-with-lease
echo "[github-push] push complete"
