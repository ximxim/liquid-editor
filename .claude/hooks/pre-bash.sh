#!/usr/bin/env bash
#
# pre-bash.sh — PreToolUse guardrail for autonomous (overnight) sessions.
#
# Claude Code passes the pending Bash tool call as JSON on stdin. We extract the
# command and hard-block (exit 2) any irreversible or outward-facing action that
# an unattended agent must never take. This is the interim safety net standing in
# for branch protection / publish gating until release automation is set up.
#
# Exit 2 = block the tool call. Exit 0 = allow.
set -uo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try { const j=JSON.parse(d); console.log(j.tool_input?.command ?? j.command ?? ''); } catch { console.log(''); }")

BLOCKED_PATTERNS=(
  "rm -rf /"
  "git push.*--force"
  "git push.*-f( |$)"
  "git push.* main"
  "git push.*:main"
  "npm publish"
  "pnpm publish"
  "changeset publish"
  "curl.*\| *(sudo )?bash"
  "wget.*\| *(sudo )?bash"
  "chmod 777"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if printf '%s' "$CMD" | grep -qE "$pattern"; then
    echo "BLOCKED by pre-bash guardrail: command matches forbidden pattern '$pattern'." >&2
    echo "Autonomous sessions may not run this. A human must do it manually if intended." >&2
    exit 2
  fi
done

exit 0
