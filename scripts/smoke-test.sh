#!/usr/bin/env bash
#
# smoke-test.sh — build and typecheck all packages, report PASS/FAIL.
#
# Usage: bash scripts/smoke-test.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

run_step() {
  local label="$1"
  shift
  printf "%-40s" "$label"
  if "$@" >/dev/null 2>&1; then
    echo "PASS"
    PASS=$(( PASS + 1 ))
  else
    echo "FAIL"
    FAIL=$(( FAIL + 1 ))
  fi
}

echo "=== Smoke test ==="
echo ""

cd "$ROOT_DIR"

run_step "build (all packages)" pnpm turbo run build
run_step "typecheck (all packages)" pnpm turbo run typecheck

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
