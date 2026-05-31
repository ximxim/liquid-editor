# Phase <N> — <name> — PROGRESS

> Copied from `docs/phases/PROGRESS.template.md` by `phase-planner`. Single source of
> truth for this phase. Keep it current — it is how work resumes across sessions.

**Status:** not started | in progress | verifying | done
**Spec:** `plan.md` → `# PHASE <N>`
**Depends on:** <phases that must be done first>

## Goal
<one-paragraph restatement of the phase goal from plan.md>

## Todos
Each todo is atomic and independently verifiable. `[ ]` pending · `[~]` in progress · `[x]` done.

- [ ] **T<N>.1 — <task>**
  - Files: <paths to create/edit>
  - Test first (TDD): <the failing test to write>
  - Reuse: <existing files/utilities to build on, with paths>
  - Verify: `pnpm <cmd>` → `EXIT_CODE=0` in `logs/<name>.latest.log`
- [ ] **T<N>.2 — <task>**
  - ...

## Success criteria (from plan.md)
Carry every `SC<N>.x` verbatim. `[ ]` until verified by `phase-verifier`.

- [ ] **SC<N>.1** — <criterion> — *Validate:* `<command>` → evidence: `<log/output>`
- [ ] **SC<N>.2** — <criterion> — *Validate:* `<command>`

## Logs to check
- Build/type/test: `logs/build.latest.log`, `logs/typecheck.latest.log`, `logs/test.latest.log`
- Browser (if UI): `logs/browser-runtime.log` (dev), `logs/browser-console.log` (e2e), `test-results/`

## Decisions
<non-obvious choices made during the phase and why — so future readers don't relitigate>

## Blockers
<anything stuck after 3 attempts, or ambiguity in plan.md needing resolution. Empty if none.>
