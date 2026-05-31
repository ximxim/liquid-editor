# `logs/` — the agent's window into runtime

Every long-running or fallible command in this repo writes its output here so a
coding agent can **read what happened from a file** instead of asking a human.
The log files themselves are gitignored; only this README is committed.

## How logs are produced

All task scripts route through `scripts/with-logs.sh <name> -- <command>`, which:

- tees combined stdout+stderr to `logs/<name>.<timestamp>.log`,
- updates a stable symlink `logs/<name>.latest.log`,
- appends a final machine-parseable line `EXIT_CODE=<n>`.

To check a result deterministically: `grep -E '^EXIT_CODE=' logs/<name>.latest.log`.

## Files

| File | Written by | What it tells you |
|------|-----------|-------------------|
| `dev.latest.log` | `pnpm dev` | Vite dev server output — "ready" line, port, HMR errors. Persistent: no `EXIT_CODE` until it stops. |
| `build.latest.log` | `pnpm build` | Turbo build output + `EXIT_CODE`. |
| `test.latest.log` | `pnpm test` | Vitest run output + `EXIT_CODE`. |
| `typecheck.latest.log` | `pnpm typecheck` | `tsc --noEmit` output + `EXIT_CODE`. |
| `lint.latest.log` | `pnpm lint` | Lint output + `EXIT_CODE`. |
| `e2e.latest.log` | `pnpm e2e` | Playwright run output + `EXIT_CODE`. Artifacts (traces/screenshots/video) land in `test-results/`. |
| `browser-runtime.log` | Vite dev forwarder | Browser `console.*`, `window.onerror`, and unhandled rejections captured during ordinary `pnpm dev` (no browser-driving needed). |
| `browser-console.log` | Playwright fixture | Browser console / page errors / failed requests captured during `pnpm e2e`. |

## Quick agent recipe

```bash
pnpm health                       # dashboard: dev up? last task results?
grep -E '^EXIT_CODE=' logs/build.latest.log
grep -iE 'error|fail|warn' logs/browser-runtime.log
```

See the repo `CLAUDE.md` → "Autonomous troubleshooting loop" for the full workflow.
