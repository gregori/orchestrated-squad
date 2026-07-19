#!/usr/bin/env bash
# Compatibility wrapper for the portable `squad` installer.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <target-project-dir> [--target codex|claude|opencode|devin|vscode|all] [--force] [--no-init] [--dry-run]" >&2
  exit 1
fi

root_dir="$(cd "$(dirname "$0")" && pwd)"
target_dir="$1"
shift
exec node "$root_dir/scripts/squad.mjs" install --dir "$target_dir" --yes "$@"
