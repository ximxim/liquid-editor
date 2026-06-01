#!/usr/bin/env bash
#
# check-bundle-sizes.sh — validate gzip sizes of built packages against budgets.
#
# Budgets:
#   @liquid-ai/renderer  < 50 KB gzipped
#   @liquid-ai/editor    < 500 KB gzipped
#
# Usage: bash scripts/check-bundle-sizes.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

check_size() {
  local label="$1"
  local file="$2"
  local budget_kb="$3"

  if [ ! -f "$file" ]; then
    echo "SKIP  $label — $file not found (run build first)"
    return
  fi

  local bytes
  bytes="$(gzip -9c "$file" | wc -c | tr -d ' ')"
  local kb
  kb=$(( bytes / 1024 ))
  local budget_bytes=$(( budget_kb * 1024 ))

  if [ "$bytes" -le "$budget_bytes" ]; then
    echo "PASS  $label: ${kb} KB gzipped (budget: ${budget_kb} KB)"
    PASS=$(( PASS + 1 ))
  else
    echo "FAIL  $label: ${kb} KB gzipped exceeds budget of ${budget_kb} KB"
    FAIL=$(( FAIL + 1 ))
  fi
}

echo "=== Bundle size check ==="
echo ""

check_size "@liquid-ai/renderer" \
  "$ROOT_DIR/packages/renderer/dist/index.mjs" \
  50

check_size "@liquid-ai/editor" \
  "$ROOT_DIR/packages/editor/dist/index.mjs" \
  500

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
