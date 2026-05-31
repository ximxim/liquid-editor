#!/usr/bin/env bash
#
# health-check.sh — the agent dashboard.
#
# One-shot status of the harness, read entirely from log files. Answers, with
# no human in the loop: is the dev server up, and what was the last result of
# build / test / typecheck / lint / e2e?
#
# Usage: scripts/health-check.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"

report_task() {
  local name="$1"
  local latest="$LOG_DIR/$name.latest.log"
  if [ ! -e "$latest" ]; then
    printf '  %-12s %s\n' "$name" "(never run)"
    return
  fi
  local code
  code="$(grep -E '^EXIT_CODE=' "$latest" | tail -1 | cut -d= -f2)"
  if [ -z "$code" ]; then
    printf '  %-12s %s\n' "$name" "RUNNING (no EXIT_CODE yet)"
  elif [ "$code" = "0" ]; then
    printf '  %-12s %s\n' "$name" "PASS (exit 0)"
  else
    printf '  %-12s %s\n' "$name" "FAIL (exit $code) — see logs/$name.latest.log"
  fi
}

dev_server_status() {
  # Probe the configured dev port (5173). Prefer curl, fall back to nc.
  local port="5173"
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS -o /dev/null --max-time 2 "http://localhost:$port"; then
      echo "UP (http://localhost:$port)"
      return
    fi
  elif command -v nc >/dev/null 2>&1; then
    if nc -z localhost "$port" >/dev/null 2>&1; then
      echo "UP (http://localhost:$port)"
      return
    fi
  fi
  echo "DOWN (port $port not responding)"
}

echo "=== Liquid AI Editor — harness health ==="
echo "dev server:   $(dev_server_status)"
echo "task results (from logs/*.latest.log):"
for task in build test typecheck lint e2e dev; do
  report_task "$task"
done
echo
echo "browser logs:"
for f in browser-runtime browser-console; do
  if [ -e "$LOG_DIR/$f.log" ]; then
    lines="$(wc -l <"$LOG_DIR/$f.log" | tr -d ' ')"
    printf '  %-16s %s line(s) — logs/%s.log\n' "$f" "$lines" "$f"
  else
    printf '  %-16s %s\n' "$f" "(empty)"
  fi
done
