#!/bin/bash
set -e
npm install
npm run db:push

# Sync latest commits to GitHub automatically
bash "$(dirname "$0")/github-push.sh"
