# Liquid AI Editor — Agent Operating Manual

This repo is built **by coding agents, for coding agents**. The full product spec
is in [`plan.md`](./plan.md) (a 10-phase build plan). This file is the harness:
how to run, observe, troubleshoot, and verify work **without a human in the loop**.

> Core principle: never ask a human for runtime information. If you'd want to ask
> "what did the terminal print?" or "what's the browser console error?", there is
> already a **file** that answers it. Read the file.

## Current state

Only the harness exists so far: a minimal pnpm/Turborepo workspace, one placeholder
playground app (`apps/playground`), the observability layer, and these docs. The
product packages (`packages/core`, `renderer`, `runtime-webllm`, `tool-ui`, `editor`)
are built phase-by-phase per `plan.md`, starting at Phase 0.

## Repository layout

```
plan.md                       # the product spec — 10 phases, success criteria per phase
CLAUDE.md                     # this file
scripts/
  with-logs.sh                # logging primitive — wraps every fallible command
  health-check.sh             # one-shot status dashboard (reads logs/)
logs/                         # runtime logs agents read (gitignored; see logs/README.md)
tooling/
  tsconfig/base.json          # shared strict TS config
  vite/log-forwarder.ts       # dev-only Vite plugin: browser console/errors -> logs/browser-runtime.log
apps/playground/              # minimal Vite+React app; the surface the harness exercises
  e2e/                        # Playwright specs + console-capturing fixture
playwright.config.ts          # e2e config; artifacts -> test-results/
docs/phases/                  # per-phase orchestration + PROGRESS.md convention
.claude/agents/               # phase-planner, phase-executor, phase-verifier
```

## Commands — and where each one's output lands

Every command routes through `scripts/with-logs.sh`, which tees output to
`logs/<name>.latest.log` and appends `EXIT_CODE=<n>`.

| Command | Log file | Notes |
|---------|----------|-------|
| `pnpm dev` | `logs/dev.latest.log` | Persistent. Grep for `ready in` + the `Local:` URL. No `EXIT_CODE` until it stops. **Run backgrounded.** |
| `pnpm build` | `logs/build.latest.log` | |
| `pnpm test` | `logs/test.latest.log` | Vitest (added per-package as phases land). |
| `pnpm typecheck` | `logs/typecheck.latest.log` | |
| `pnpm lint` | `logs/lint.latest.log` | |
| `pnpm e2e` | `logs/e2e.latest.log` | Playwright; boots/reuses the dev server. Artifacts in `test-results/`. |
| `pnpm health` | (prints to stdout) | Dashboard: dev up? last result of each task? |
| (browser, dev) | `logs/browser-runtime.log` | console.*/onerror/unhandledrejection during `pnpm dev`. |
| (browser, e2e) | `logs/browser-console.log` | console/pageerror/requestfailed during `pnpm e2e`. |

### Running rules (non-negotiable)
1. **Never run a long-lived process in the foreground.** Start `pnpm dev` backgrounded, then wait on its log: `until grep -q "ready in" logs/dev.latest.log; do sleep 0.5; done`.
2. **Check results from files, not memory.** `grep -E '^EXIT_CODE=' logs/<name>.latest.log`.
3. **A task is only green when its log ends with `EXIT_CODE=0`.** No exceptions.

## Autonomous troubleshooting loop

```
1. RUN     a command via pnpm (it auto-logs).
2. STATUS  pnpm health   →   or   grep -E '^EXIT_CODE=' logs/<name>.latest.log
3. READ    on failure, read logs/<name>.latest.log; grep -iE 'error|fail|warn'.
4. BROWSER for UI/runtime issues:
     - during `pnpm dev`:  read logs/browser-runtime.log
     - drive the live app: Playwright MCP — browser_navigate(http://localhost:5173),
       browser_snapshot, browser_console_messages(level:"error"), browser_take_screenshot
     - during `pnpm e2e`:  read logs/browser-console.log + open test-results/ traces
5. FIX     make the minimal change. Re-run from step 1. Re-verify — never assume.
```

You should be able to diagnose any failure from the files above. If you find a
gap where you'd otherwise need to ask a human, **close it by adding a log/probe**,
the same way `logs/browser-runtime.log` removed "what's in the console?".

## How work gets done — phase workflow

Work is organized by the phases in `plan.md`. Use sub-agents to keep the
orchestrator's context lean (see `.claude/agents/` and `docs/phases/`):

```
Orchestrator (you)
  → phase-planner   : reads plan.md §Phase N → docs/phases/phase-N/PROGRESS.md (atomic todos)
  → phase-executor  : implements tasks TDD-first, runs everything via pnpm (auto-logs),
                      updates PROGRESS.md, returns a SUMMARY (not a transcript)
  → phase-verifier  : runs the phase's Success Criteria table, reading results from logs/,
                      reports PASS/FAIL per criterion
```

Reuse the user's existing global agents where they fit (`explore` for codebase
search, `librarian` for external docs, `tdd-guide` for tests, reviewers before
merge) instead of duplicating them here.

## Conventions

- **Package manager:** pnpm 9 + Turborepo. Node ≥ 20.
- **TypeScript:** strict; never suppress errors (`as any`, `@ts-ignore`, `@ts-expect-error` are forbidden). Browser/tooling code is split into separate tsconfigs (see `apps/playground/tsconfig*.json`).
- **Tooling vs app code:** files under `tooling/` are root-level shared code typechecked with Node types; app code stays browser-pure.
- **Scope discipline:** when executing Phase N, treat code outside that phase as read-only. Flag issues; don't fix them inline.
- **Verification before completion:** never claim done without an `EXIT_CODE=0` log (and, for UI, a clean `browser_console_messages` / `browser-runtime.log`).

## Verifying the harness itself

```bash
pnpm install            # clean, no peer-dep errors
pnpm typecheck          # EXIT_CODE=0
pnpm build              # EXIT_CODE=0
pnpm dev &              # backgrounded; wait for "ready in" in logs/dev.latest.log
pnpm health             # dev server UP
pnpm e2e                # smoke passes; logs/browser-console.log populated
```
