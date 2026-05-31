#!/usr/bin/env bash
#
# with-logs.sh — the harness logging primitive.
#
# Runs any command, tees combined stdout+stderr to a timestamped file AND a
# stable "<name>.latest.log" symlink, then writes a machine-parseable final
# line `EXIT_CODE=<n>`. Coding agents read <name>.latest.log and grep for
# EXIT_CODE / errors instead of asking a human what the terminal showed.
#
# Usage:  scripts/with-logs.sh <name> -- <command> [args...]
# Example: scripts/with-logs.sh build -- turbo run build
#
set -uo pipefail

if [ "$#" -lt 2 ]; then
  echo "ERROR: usage: with-logs.sh <name> -- <command> [args...]" >&2
  exit 2
fi

NAME="$1"
shift
if [ "${1:-}" = "--" ]; then
  shift
fi

if [ "$#" -lt 1 ]; then
  echo "ERROR: no command given to with-logs.sh" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/$NAME.$TS.log"
LATEST="$LOG_DIR/$NAME.latest.log"
ln -sf "$(basename "$LOG_FILE")" "$LATEST"

{
  echo "=== $NAME started $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "CMD: $*"
  echo "---"
} | tee "$LOG_FILE"

"$@" 2>&1 | tee -a "$LOG_FILE"
CODE="${PIPESTATUS[0]}"

echo "EXIT_CODE=$CODE" | tee -a "$LOG_FILE"
exit "$CODE"
