# Phase execution & progress tracking

Work on this repo follows the 10 phases in [`../../plan.md`](../../plan.md). Each phase
is planned, executed, and verified by dedicated sub-agents, with an on-disk
`PROGRESS.md` that survives context compaction and hand-offs.

## The orchestration pattern

```
Orchestrator (main session)
  │
  ├─ phase-planner   reads plan.md §Phase N
  │                  → writes docs/phases/phase-N/PROGRESS.md (atomic todos + SC checklist)
  │
  ├─ phase-executor  implements todos TDD-first, runs everything via pnpm (auto-logged),
  │                  updates PROGRESS.md, returns a summary
  │
  └─ phase-verifier  runs the Success Criteria table, reads results from logs/,
                     returns PASS/FAIL per criterion with evidence
```

The orchestrator never holds the full implementation transcript — sub-agents return
summaries. State that must persist lives in `PROGRESS.md`, not in the conversation.

Reuse the user's global agents where they fit: `explore` (codebase search),
`librarian` (external library docs), `tdd-guide` (tests), code/security reviewers
before merge. Don't duplicate them here.

## Per-phase directory convention

```
docs/phases/
  README.md                 # this file
  PROGRESS.template.md       # copied per phase
  phase-0/PROGRESS.md        # created by phase-planner when Phase 0 starts
  phase-1/PROGRESS.md
  ...
```

A phase's `PROGRESS.md` is the single source of truth for: what's planned, what's
done, what's blocked, and which log file proves each result. Update it as you go —
it is how the next session (or sub-agent) resumes without re-deriving context.

## Definition of done for a phase

1. Every todo in `PROGRESS.md` is checked off.
2. Every Success Criterion (`SC-N.x`) is PASS with evidence from a log file / command output / browser snapshot.
3. `pnpm typecheck`, `pnpm build`, and `pnpm test` each end with `EXIT_CODE=0`.
4. No regressions in prior phases (re-run their verification if touched).
