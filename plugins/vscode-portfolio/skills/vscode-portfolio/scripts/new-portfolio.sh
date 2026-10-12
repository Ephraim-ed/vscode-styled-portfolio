#!/usr/bin/env bash
# Copies the VS Code portfolio starter into a new project directory.
#
# Usage: new-portfolio.sh <target-dir>
#
# The target must not exist yet, or be an empty directory. Nothing is installed or committed: run
# `npm install` in the target afterwards.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $(basename "$0") <target-dir>" >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
starter="$here/../assets/starter"
target="$1"

if [[ -e "$target" && -n "$(ls -A "$target" 2>/dev/null)" ]]; then
  echo "error: $target exists and isn't empty; pick a new directory" >&2
  exit 1
fi

mkdir -p "$target"
# Everything but build output and dependencies (the starter shouldn't have them, but be safe).
rsync -a --exclude node_modules --exclude .next --exclude '*.tsbuildinfo' --exclude next-env.d.ts "$starter/" "$target/"
mkdir -p "$target/assets"

echo "Created $target from the starter."
echo "Node: $(node --version 2>/dev/null || echo 'not found') (npm run banners needs 22.18+ or 23.6+, which run .ts imports natively)"
echo "Next: cd \"$target\" && npm install"
