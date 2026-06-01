# Phase 9 — Persistence + Checkpoints

**Branch:** `phase-9-persistence`  
**Status:** COMPLETE — all SC9.x PASS

## Tasks

- [x] T9.1 — PGlite init + schema (`packages/core/src/persistence/db.ts`)
- [x] T9.2 — Session repository (`packages/core/src/persistence/sessions.ts`)
- [x] T9.3 — Message repository (`packages/core/src/persistence/messages.ts`)
- [x] T9.4 — Checkpoint repository (`packages/core/src/persistence/checkpoints.ts`)
- [x] T9.5 — Core index.ts updated with persistence exports
- [x] T9.6 — Auto-checkpoint on template change in EditorContext (5s debounce, lazy import)
- [x] T9.7 — HistoryPanel UI in AiPanel with session + checkpoint timeline

## Test results

```
core:   Test Files 10 passed (10) | Tests 96 passed (96)  (+23 persistence tests)
editor: Test Files 16 passed (16) | Tests 89 passed (89)  (+7 history/context tests)
```

Typecheck: ✓ clean (both packages)  
Build: ✓ clean

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| SC9.1 | PGlite initializes and creates tables | PASS |
| SC9.2 | Session CRUD operations work | PASS |
| SC9.3 | Messages persist and reload in order | PASS |
| SC9.4 | Checkpoints create on template change | PASS |
| SC9.5 | Checkpoint restore sets correct template state | PASS |
| SC9.6 | Data survives simulated page reload | PASS |
| SC9.7 | Session history UI shows past sessions | PASS |
| SC9.8 | PGlite WASM loads without errors | PASS |
