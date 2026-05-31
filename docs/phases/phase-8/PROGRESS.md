# Phase 8 — Element Selection + Suggestions

**Branch:** `phase-8-element-selection`  
**Status:** COMPLETE — all SC8.x PASS

## Tasks

- [x] T8.1 — Enhanced iframe selection handler with .liquid-ai-selected highlight
- [x] T8.2 — CodeMirror range highlight sync via StateField + Decoration.mark
- [x] T8.3 — Suggestion adapter: contextual suggestions from tagName + computedStyles
- [x] T8.4 — Suggestion → prompt pipeline with selected element context in system prompt
- [x] T8.5 — applyTargetedEdit: splice AI output back into template by SourceRange
- [x] T8.6 — Escape key + blank-area click deselect

## Test results

```
editor:   Test Files 15 passed (15) | Tests 82 passed (82)  (+19 new)
renderer: Test Files 5 passed (5)   | Tests 22 passed (22)  (+3 new)
```

Typecheck: ✓ clean (editor + renderer)  
Build: ✓ clean

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| SC8.1 | Clicking element highlights with blue outline | PASS |
| SC8.2 | Selected element's source range highlights in Code pane | PASS |
| SC8.3 | Contextual suggestions appear after selection | PASS |
| SC8.4 | Clicking suggestion sends prompt to AI | PASS |
| SC8.5 | AI responds with tool UI after suggestion (mocked) | PASS |
| SC8.6 | Escape key deselects | PASS |
| SC8.7 | Source mapping accuracy ≥ 95% (re-validated from Phase 1) | PASS |
| SC8.8 | Targeted edit modifies only selected range | PASS |
