# Liquid AI Editor — Master Build Plan

## Project Identity

**Name:** `liquid-ai-editor`
**Tagline:** An open-source, client-side, AI-powered Liquid template editor for React — mountable as a JSX component with WebLLM intelligence, zero server dependency.
**License:** MIT
**Package Scope:** `@liquid-ai/`

## Learnings Applied from "The Unreasonable Effectiveness of HTML"

This project embodies five principles from Anthropic's Thariq Shihipar:

1. **Rich output over flat text.** The editor produces full HTML-rendered Liquid pages — not markdown previews. The AI generates visually rich, CSS-styled Liquid templates because HTML is the most expressive format for communicating design intent.
2. **Interactive controls for tuning.** The blog advocates sliders, knobs, and copy-as-JSON buttons inside custom editing interfaces. Our tool-ui Parameter Sliders, Preferences Panels, and Question Flows are exactly this pattern — purpose-built throwaway UIs for the specific editing task at hand.
3. **Two-way interaction documents.** The rendered preview is not read-only — users click elements to select them, and the selection flows back as context to the AI. This is the "HTML as two-way interaction surface" pattern.
4. **Export-always pattern.** The blog's golden rule: every custom interface ends with an export button. Our editor's top-right save/close button returns the updated Liquid template text — the "copy as prompt" equivalent.
5. **Client-side-first architecture.** By running WebLLM in-browser and persisting state to PGlite/IndexedDB, the editor is a self-contained creative tool that works offline — no server round-trips for AI generation, no external storage dependencies.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer's React App                     │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  <LiquidEditor       │  │  <LiquidRenderer             │ │
│  │    template={...}    │  │    template="<h1>{{title}}"  │ │
│  │    schema={z.obj()}  │  │    data={{title:"Hi"}}       │ │
│  │    systemPrompt={..} │  │    schema={z.object({...})}  │ │
│  │    onSave={fn}       │  │  />                          │ │
│  │  />                  │  │  (production renderer)        │ │
│  │  (editor component)  │  └──────────────────────────────┘ │
│  └──────────┬───────────┘                                   │
│             │ uses internally                                │
│  ┌──────────▼───────────────────────────────────────────┐   │
│  │  Editor Layout (80/20 split)                          │   │
│  │  ┌──────────────────────────┬────────────────────┐   │   │
│  │  │  Workspace (80%)         │  AI Panel (20%)    │   │   │
│  │  │  ┌────────────────────┐  │  ┌──────────────┐  │   │   │
│  │  │  │ [Preview|Code|Ctx] │  │  │ assistant-ui  │  │   │   │
│  │  │  │                    │  │  │ Thread +      │  │   │   │
│  │  │  │ Preview: Renderer  │  │  │ tool-ui       │  │   │   │
│  │  │  │   in sandboxed     │  │  │ components    │  │   │   │
│  │  │  │   iframe           │  │  │               │  │   │   │
│  │  │  │ Code: CodeMirror6  │  │  │ Suggestions   │  │   │   │
│  │  │  │   + lang-liquid    │  │  │ Param Slider  │  │   │   │
│  │  │  │ Ctx: JSON editor   │  │  │ Question Flow │  │   │   │
│  │  │  │   (mock data)      │  │  │ Prefs Panel   │  │   │   │
│  │  │  └────────────────────┘  │  └──────┬───────┘  │   │   │
│  │  └──────────────────────────┘         │          │   │   │
│  │                                       ▼          │   │   │
│  │                              ┌────────────────┐  │   │   │
│  │                              │ WebLLM Engine  │  │   │   │
│  │                              │ (Web Worker)   │  │   │   │
│  │                              │ Qwen2.5-Coder  │  │   │   │
│  │                              └────────────────┘  │   │   │
│  │                              ┌────────────────┐  │   │   │
│  │                              │ PGlite         │  │   │   │
│  │                              │ (IndexedDB)    │  │   │   │
│  │                              │ sessions/ckpts │  │   │   │
│  │                              └────────────────┘  │   │   │
│  └──────────────────────────────────────────────────┘   │   │
└─────────────────────────────────────────────────────────────┘
```

## Repository Structure

```
liquid-ai-editor/
├── package.json                 # root — workspaces, turbo config
├── pnpm-workspace.yaml          # pnpm workspace definition
├── turbo.json                   # turborepo pipeline
├── .github/workflows/           # CI: build, test, visual regression
├── packages/
│   ├── core/                    # @liquid-ai/core (engine logic, no React)
│   │   ├── src/
│   │   │   ├── liquid/          # LiquidJS engine factory, sandbox HTML, custom filters
│   │   │   ├── zod/             # schema introspection, mock-data gen, zod-to-json-schema
│   │   │   ├── sourcemap/       # data-loc instrumentation, DOM→source mapping
│   │   │   └── persistence/     # PGlite schema, session/checkpoint CRUD
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── renderer/                # @liquid-ai/renderer (production <LiquidRenderer>)
│   │   ├── src/
│   │   │   ├── LiquidRenderer.tsx
│   │   │   ├── IframeSandbox.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   ├── runtime-webllm/          # @liquid-ai/runtime-webllm (ChatModelAdapter + worker)
│   │   ├── src/
│   │   │   ├── adapter.ts       # assistant-ui ChatModelAdapter impl
│   │   │   ├── worker.ts        # WebWorkerMLCEngine host
│   │   │   ├── model-picker.ts  # VRAM detection + fallback logic
│   │   │   └── prompts/         # system prompts, few-shot examples
│   │   └── package.json
│   ├── tool-ui/                 # vendored tool-ui.com components (copy/paste model)
│   │   ├── src/
│   │   │   ├── parameter-slider/
│   │   │   ├── question-flow/
│   │   │   └── preferences-panel/
│   │   └── package.json
│   └── editor/                  # @liquid-ai/editor (main <LiquidEditor>)
│       ├── src/
│       │   ├── LiquidEditor.tsx          # root component
│       │   ├── layout/                   # 80/20 split, toolbar, segments
│       │   ├── workspace/                # Preview, Code, Context panes
│       │   ├── ai-panel/                 # assistant-ui Thread, suggestions
│       │   ├── selection/                # iframe click→postMessage→context
│       │   ├── tools/                    # makeAssistantToolUI registrations
│       │   └── index.ts
│       └── package.json
├── apps/
│   ├── playground/              # Vite dev app (fast iteration)
│   │   └── src/App.tsx          # mounts <LiquidEditor> with sample schema
│   └── nextjs-example/          # Next.js integration example
│       └── app/page.tsx
└── tooling/
    ├── tsconfig/                # shared base tsconfigs
    ├── tailwind/                # shared tailwind preset + CSS vars
    └── vitest/                  # shared vitest config
```

## Dependency Manifest

| Package | Purpose | Bundle Target |
|---------|---------|---------------|
| `liquidjs` | Generic Liquid rendering (browser-safe, no eval) | core, renderer |
| `zod` | Schema definition for template data contracts | core, renderer |
| `zod-to-json-schema` | Convert Zod→JSON Schema for LLM structured output | core |
| `@anatine/zod-mock` + `@faker-js/faker` | Generate realistic mock data from Zod schemas | core (editor-only) |
| `@mlc-ai/web-llm` | Client-side WebGPU LLM inference | runtime-webllm |
| `@assistant-ui/react` | Chat UI primitives, LocalRuntime, tool UIs, suggestions | editor |
| `codemirror` + `@codemirror/lang-liquid` | In-browser code editor with Liquid syntax highlighting | editor |
| `@electric-sql/pglite` | Postgres-in-WASM for client-side persistence (IndexedDB) | editor |
| `tailwindcss` + `@radix-ui/*` (via shadcn/ui) | UI primitives matching assistant-ui's design system | editor |
| `vite` + `vite-plugin-dts` | Library-mode bundler with .d.ts generation | all packages |
| `vitest` + `@testing-library/react` | Unit + component testing | all packages |
| `playwright` | E2E + visual regression testing | apps |

---

## Phase Map

| Phase | Name | Agent Team | Depends On | Est. Complexity |
|-------|------|------------|------------|-----------------|
| 0 | Monorepo Foundation | infra | — | Low |
| 1 | Core Engine — Liquid + Zod | core | Phase 0 | Medium |
| 2 | Renderer Component | renderer | Phase 1 | Medium |
| 3 | Editor Shell + Layout | editor-ui | Phase 2 | Medium |
| 4 | WebLLM Runtime | ai-runtime | Phase 0 | High |
| 5 | AI Chat Panel + Basic Generation | ai-integration | Phases 3, 4 | High |
| 6 | Mock Data + Context Tab | data | Phases 1, 3 | Medium |
| 7 | Tool UIs + Generative Components | tool-ui | Phase 5 | Medium |
| 8 | Element Selection + Suggestions | interaction | Phases 2, 5 | High |
| 9 | Persistence + Checkpoints | persistence | Phase 5 | Medium |
| 10 | Polish, Packaging + Release | release | All | Medium |

---

# PHASE 0 — Monorepo Foundation

## Goal
Establish a reproducible pnpm + Turborepo monorepo with shared tooling so every subsequent phase has a stable build/test/lint foundation. Ship a "hello world" component from the renderer package that mounts in both the Vite playground and Next.js example.

## Context for Agent Team
This phase produces zero user-visible features. Its only job is to ensure every subsequent team can `pnpm install && pnpm build && pnpm test` and get green. Treat this as infrastructure — ruthless simplicity, zero unnecessary abstractions.

## Technical Decisions

### Monorepo tooling: pnpm workspaces + Turborepo
- **Why pnpm:** Strict peer-dep resolution prevents phantom dependencies. The monorepo structure means each package declares exactly what it uses.
- **Why Turborepo:** Parallel builds with task caching. `turbo.json` defines the build DAG so downstream packages automatically rebuild when upstream changes.
- **NOT yarn workspaces / Nx:** pnpm is the standard for new monorepos in 2026; Nx adds configuration overhead we don't need.

### Build system: Vite library mode + vite-plugin-dts
- Each package builds with `vite build` in library mode, outputting ESM (`.mjs`) + CJS (`.cjs`) + declaration files (`.d.ts`).
- React, react-dom, react/jsx-runtime are marked as `external` (peer deps) — never bundled.
- `vite-plugin-dts` generates `.d.ts` from TypeScript source.
- CSS: each package that has styles outputs a `dist/styles.css`. Additionally, export a Tailwind preset so consumers can tree-shake.

### Testing: Vitest (shared config)
- Shared `vitest.config.ts` base in `tooling/vitest/`.
- Each package extends it. `jsdom` environment for unit tests; Vitest Browser Mode for component tests when needed.
- `@testing-library/react` for React component testing.

### Playground: Vite app + Next.js app
- `apps/playground/` — Vite SPA, fast HMR, primary dev target.
- `apps/nextjs-example/` — validates the library works in a Next.js App Router setup (SSR edge cases, dynamic imports for WebGPU).

## Tasks

### T0.1 — Initialize monorepo skeleton
```
- Create root package.json with "workspaces" and turbo scripts
- Create pnpm-workspace.yaml listing packages/* and apps/*
- Create turbo.json with build/test/lint pipelines
- Create .npmrc with strict-peer-dependencies=true
```

### T0.2 — Shared tooling
```
- tooling/tsconfig/base.json — strict TS, ESNext target, jsx: react-jsx
- tooling/tsconfig/react-lib.json — extends base, adds React types, composite: true
- tooling/tailwind/preset.ts — shared color tokens, font stack matching shadcn/assistant-ui
- tooling/vitest/base.ts — shared vitest config (jsdom, coverage thresholds)
```

### T0.3 — Scaffold all packages
```
For each of: core, renderer, runtime-webllm, tool-ui, editor:
  - Create package.json with name, version 0.0.0, private: false
  - Set peerDependencies: react >=18, react-dom >=18
  - Create vite.config.ts in library mode with react externals
  - Create src/index.ts with a placeholder export
  - Create tsconfig.json extending shared base
  - Add vitest.config.ts extending shared base
```

### T0.4 — Placeholder component in renderer
```
- Create packages/renderer/src/LiquidRenderer.tsx that renders <div>LiquidRenderer placeholder</div>
- Export from packages/renderer/src/index.ts
- Ensure `pnpm build` in renderer produces dist/index.mjs, dist/index.cjs, dist/index.d.ts
```

### T0.5 — Playground apps
```
- apps/playground: Vite + React app, imports @liquid-ai/renderer, renders <LiquidRenderer />
- apps/nextjs-example: Next.js App Router, dynamic import of @liquid-ai/renderer (avoid SSR), renders it
- Both apps must start and show the placeholder text
```

### T0.6 — CI pipeline
```
- .github/workflows/ci.yml: pnpm install → turbo build → turbo test → turbo lint
- Runs on push to main and PRs
- Cache pnpm store + turbo cache
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC0.1 | `pnpm install` completes with zero warnings | `pnpm install 2>&1 \| grep -c "WARN" == 0` |
| SC0.2 | `pnpm build` exits 0 for all packages | `turbo build` exit code 0 |
| SC0.3 | Every package has `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` | `ls packages/*/dist/index.{mjs,cjs,d.ts}` — all exist |
| SC0.4 | React is NOT in any package's dist bundle | `grep -r "react" packages/*/dist/*.mjs` returns zero matches for `require("react")` or `from "react"` |
| SC0.5 | `pnpm test` exits 0 (placeholder tests pass) | Exit code 0 |
| SC0.6 | TypeScript strict mode — zero type errors | `pnpm -r exec tsc --noEmit` exits 0 |
| SC0.7 | Vite playground renders "LiquidRenderer placeholder" | Manual or Playwright: text visible |
| SC0.8 | Next.js example renders "LiquidRenderer placeholder" | Manual or Playwright: text visible |

## Risks & Mitigations
- **Risk:** Tailwind CSS in a library — consumers may not use Tailwind. **Mitigation:** Ship a compiled `styles.css` AND a Tailwind preset. Document both paths.
- **Risk:** `vite-plugin-dts` can be slow on large TS projects. **Mitigation:** Fine now; switch to `tsc --emitDeclarationOnly` if builds exceed 30s.

---

# PHASE 1 — Core Engine: Liquid + Zod

## Goal
Build `@liquid-ai/core` — the engine-agnostic (no React, no DOM) package that handles Liquid rendering, Zod schema introspection, mock data generation, and source-location instrumentation. This is the spine of the entire system.

## Context for Agent Team
This package has ZERO React dependencies. It is pure TypeScript logic. Every function must be importable in both browser and Node.js environments. The key innovation here is the `data-loc` source instrumentation — this is what makes the click-to-edit UX possible later. Get the mapping right; fixtures are your contract.

## Technical Decisions

### LiquidJS configuration
- Use `liquidjs` in strict mode: `strictFilters: true`, `strictVariables: true` — fail fast on typos.
- Use `outputEscape: 'escape'` — all variable output is HTML-escaped by default (XSS protection).
- Register custom filters as needed (but start minimal).
- The engine factory returns a configured `Liquid` instance, reusable across renders.

### Source instrumentation (`data-loc`)
- **Approach:** A custom LiquidJS plugin/tag wrapper that annotates rendered HTML output with `data-loc="startOffset:endOffset"` attributes. This maps rendered DOM elements back to their character positions in the Liquid source.
- **How:** After LiquidJS parses the template, walk the AST. For each output/tag node that produces HTML elements, wrap the output in a span (or annotate the root element) with `data-loc` carrying the node's source position (`token.begin`, `token.end`).
- **Fallback:** If exact offsets are too fragile (LiquidJS AST doesn't expose positions cleanly), fall back to block-boundary mapping — annotate each `{% block %}`, `{% for %}`, `{% if %}` region. This is coarser but still useful for selection.
- **Contract:** `mapDomLocToSource(dataLocValue: string, templateSource: string) => { start: number, end: number, snippet: string }` — this function is the core API. It MUST have ≥ 95% accuracy on the fixture suite.

### Zod schema introspection
- Walk a Zod schema to extract: field names, types, required vs optional, nested structures, enums, descriptions.
- Use `zod-to-json-schema` to produce a JSON Schema representation for the LLM system prompt.
- Build a `SchemaInfo` type: `{ required: FieldInfo[], optional: FieldInfo[], jsonSchema: JSONSchema }`.

### Mock data generation
- `@anatine/zod-mock` with `@faker-js/faker` generates realistic data.
- Key-name matching: `email` → faker.internet.email, `url` → faker.internet.url, `title` → faker.lorem.sentence, etc.
- Seeded generation: pass a seed for deterministic output (testability).
- `generateMockData(schema: ZodType, options?: { seed?: number }) => Record<string, unknown>` — MUST pass `schema.parse(result)` (round-trip validation).

## Tasks

### T1.1 — LiquidJS engine factory
```
- src/liquid/engine.ts
- createLiquidEngine(config?: EngineConfig) => Liquid
- Config: strictFilters, strictVariables, outputEscape, custom filters/tags array
- Unit test: render a basic template with data, assert output matches expected HTML
- Unit test: render with missing variable in strict mode, assert throws
- Unit test: XSS payload in data is escaped in output
```

### T1.2 — Source instrumentation plugin
```
- src/sourcemap/instrument.ts
- instrumentTemplate(template: string) => string
  Modifies the template to add data-loc attributes to rendered output
- mapDomLocToSource(dataLocValue: string, templateSource: string) => SourceRange
- Create a fixture suite: 10+ template/data pairs with expected data-loc→source mappings
  - Simple variable: {{ title }} → data-loc points to "{{ title }}" in source
  - For loop: {% for item in items %} → data-loc wraps loop body
  - If/else blocks
  - Nested structures
  - Include/render tags (if applicable)
- Target: ≥ 95% exact-offset accuracy on fixture suite
- IMPORTANT: if LiquidJS AST doesn't expose source positions, document this and implement
  block-boundary fallback. File an issue for Phase 8 to revisit.
```

### T1.3 — Zod schema introspection
```
- src/zod/introspect.ts
- introspectSchema(schema: ZodType) => SchemaInfo
- SchemaInfo: { required: FieldInfo[], optional: FieldInfo[], jsonSchema: object }
- FieldInfo: { name: string, type: string, description?: string, isArray: boolean, children?: FieldInfo[] }
- Unit tests:
  - Flat schema: z.object({ title: z.string(), description: z.string().optional() })
    → required: [title], optional: [description]
  - Nested: z.object({ product: z.object({ price: z.number() }) })
    → required includes product.price
  - Enum: z.object({ status: z.enum(["active", "draft"]) })
    → FieldInfo captures enum values
  - Array: z.object({ tags: z.array(z.string()) })
    → isArray: true
```

### T1.4 — Mock data generation
```
- src/zod/mock.ts
- generateMockData(schema: ZodType, options?: MockOptions) => Record<string, unknown>
- MockOptions: { seed?: number, overrides?: Record<string, unknown> }
- Round-trip test: for every fixture schema, schema.parse(generateMockData(schema)) succeeds
- Realism test: field named "email" produces valid email format, "url" produces URL, etc.
- Determinism test: same seed → same output
```

### T1.5 — Integration: render with mock data
```
- src/liquid/render.ts
- renderTemplate(template: string, schema: ZodType, data?: Record<string, unknown>) => RenderResult
- RenderResult: { html: string, instrumentedHtml: string, errors: string[] }
- If data is omitted, generate mock data from schema
- If data is provided, validate against schema (return errors, don't throw)
- Integration test: full pipeline — schema → mock data → render → valid HTML with data-loc attrs
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC1.1 | LiquidJS renders templates correctly with data | `vitest run` — all engine tests pass |
| SC1.2 | XSS payloads in data are escaped in rendered output | Test: `<script>alert(1)</script>` in data → appears as escaped text in output |
| SC1.3 | Source instrumentation maps ≥ 95% of fixtures correctly | Fixture suite: count passing / total ≥ 0.95 |
| SC1.4 | Schema introspection correctly identifies required vs optional | Test suite with 5+ schema shapes, all pass |
| SC1.5 | Mock data round-trips through schema validation | `schema.parse(generateMockData(schema))` for all fixture schemas |
| SC1.6 | Mock data with same seed is deterministic | Two calls with seed=42 produce identical output |
| SC1.7 | Full render pipeline works end-to-end | Integration test: schema → mock → render → HTML string contains expected content + data-loc |
| SC1.8 | Package has zero React dependencies | `grep "react" packages/core/package.json` — not in dependencies |

## Risks & Mitigations
- **Risk:** LiquidJS AST may not expose source positions (token.begin/end). **Mitigation:** Check `template.parse()` output first. If positions aren't available, use regex-based block detection as a fallback and document the limitation.
- **Risk:** `@anatine/zod-mock` bundle size is large (~faker is 2MB+). **Mitigation:** This is editor-only. The production renderer never imports it. Enforce via bundle-size CI check on renderer package.

---

# PHASE 2 — Renderer Component

## Goal
Build `@liquid-ai/renderer` — a production-quality `<LiquidRenderer>` React component that renders a single Liquid template with Zod-validated data inside a sandboxed iframe. This component is used both in production (by the developer's app) and inside the editor's Preview pane.

## Context for Agent Team
This is the most reused component in the system. It MUST be lightweight, secure (sandboxed), and fast. It imports from `@liquid-ai/core` only — no WebLLM, no assistant-ui, no PGlite. Think of it as a "Liquid iframe renderer" that any React app can drop in.

## Technical Decisions

### Sandboxed iframe for preview
- The rendered HTML goes into a sandboxed `<iframe>` with `sandbox="allow-scripts allow-same-origin"` (need same-origin for postMessage communication in Phase 8).
- The iframe receives an HTML document via `srcdoc` — this is a complete `<html>` page containing the rendered Liquid output plus any `<style>` tags from the template.
- The iframe also loads a small selection-handler script (a thin JS file injected into the srcdoc) that listens for clicks and postMessages the `data-loc` to the parent. This is wired up in Phase 8 but the infrastructure goes in now.

### Zod validation on render
- Before rendering, validate the provided data against the schema.
- If validation fails, render an error state (not a blank page) showing which fields failed and why.
- If no data is provided, use `generateMockData` from core.

### Props API
```typescript
interface LiquidRendererProps {
  template: string;                    // Liquid template source
  schema: ZodType;                     // Zod schema for template data
  data?: Record<string, unknown>;      // Data to render (optional — mock if missing)
  onElementSelect?: (loc: SourceRange) => void;  // Click-to-select callback
  className?: string;                  // Container styling
  instrumentSourceMap?: boolean;       // Enable data-loc instrumentation (default: false in prod, true in editor)
}
```

## Tasks

### T2.1 — IframeSandbox component
```
- src/IframeSandbox.tsx
- Renders a sandboxed <iframe> with srcdoc
- Accepts html: string and optional onMessage callback
- Sets sandbox attribute
- Handles iframe resize (auto-height to content)
- Injects selection-handler.js into srcdoc (a small script that adds click listeners on [data-loc] elements
  and postMessages {type: 'element-select', loc: string, tagName: string, computedStyles: {...}} to parent)
- The onMessage prop receives parsed postMessage events from the iframe
```

### T2.2 — LiquidRenderer component
```
- src/LiquidRenderer.tsx
- Accepts LiquidRendererProps
- On render:
  1. If data provided → validate with schema.safeParse(data)
  2. If validation fails → render error UI (shadcn Alert component listing field errors)
  3. If no data → generateMockData(schema)
  4. Call renderTemplate(template, schema, validatedData) from core
  5. Pass result.instrumentedHtml (if instrumentSourceMap) or result.html to IframeSandbox
- When IframeSandbox sends 'element-select' message → call onElementSelect with SourceRange
- Memoize rendering: only re-render when template or data changes (useMemo on renderTemplate)
```

### T2.3 — Error boundary
```
- src/ErrorBoundary.tsx
- Wrap LiquidRenderer in a React error boundary
- If Liquid rendering throws (invalid template syntax), show a friendly error with the parse error message
- Don't crash the host app
```

### T2.4 — Export and types
```
- src/index.ts — export { LiquidRenderer, type LiquidRendererProps, type SourceRange }
- Ensure types are generated in dist/index.d.ts
```

### T2.5 — Playground integration
```
- Update apps/playground to use a real Liquid template + Zod schema
- Example: a product card template with title, price, description, image_url
- Schema: z.object({ title: z.string(), price: z.number(), description: z.string().optional(), image_url: z.string().url().optional() })
- Template: Liquid template rendering a styled product card
- Show it rendering with auto-generated mock data
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC2.1 | Renderer renders a known template+data and output HTML matches snapshot | Vitest snapshot test |
| SC2.2 | Invalid data shows error UI, not blank screen | Test: pass `{ title: 123 }` (wrong type) → error Alert is rendered |
| SC2.3 | Missing data auto-generates mock and renders successfully | Test: render with no data prop → iframe contains rendered content |
| SC2.4 | iframe has sandbox attribute | DOM assertion: `iframe.getAttribute('sandbox')` contains expected value |
| SC2.5 | XSS payload in data does not execute in iframe | Test: `data.title = '<img src=x onerror=alert(1)>'` → no alert, escaped in output |
| SC2.6 | Component doesn't crash host app on invalid template | Error boundary catches LiquidJS parse errors, shows error UI |
| SC2.7 | Bundle does NOT contain @faker-js or zod-mock when `instrumentSourceMap` is false | Bundle analysis: production build of renderer < 50KB gzipped |
| SC2.8 | Playground shows a working product card with realistic mock data | Visual verification in Vite dev server |

## Risks & Mitigations
- **Risk:** iframe auto-height is tricky (ResizeObserver inside srcdoc). **Mitigation:** Use a postMessage-based height reporting script injected into the srcdoc.
- **Risk:** `allow-same-origin` in sandbox could be a security concern. **Mitigation:** The srcdoc is our own generated content (not user-supplied URLs). CSP headers in the srcdoc disallow external script loading.

---

# PHASE 3 — Editor Shell + Layout

## Goal
Build the `<LiquidEditor>` shell — the 80/20 layout with toolbar, segment selector (Preview/Code/Context), and open/close flow. No AI yet — just the workspace UI.

## Context for Agent Team
This is the main user-facing component. The layout must be responsive, clean, and match assistant-ui's shadcn aesthetic. Use shadcn/ui components (Button, Tabs/SegmentedControl, etc.) and Tailwind. The AI panel is a placeholder div for now — Phase 5 fills it.

## Technical Decisions

### Layout: CSS Grid 80/20
- Use CSS Grid with `grid-template-columns: 1fr 320px` (fixed AI panel width, workspace takes remaining).
- The AI panel collapses to 0 when hidden (future toggle).

### Toolbar
- Full-width bar above the workspace.
- Center: Segmented control with three options — **Preview** (default), **Code**, **Context**.
- Right: Save/Close button that fires `onSave(updatedTemplate: string)` and closes the editor.
- Left: Template name/label (from props).

### Code pane: CodeMirror 6 + @codemirror/lang-liquid
- `@codemirror/lang-liquid` provides Liquid syntax highlighting, bracket matching, and completion (variables, tags, filters).
- Two-way binding: edits in CodeMirror update the template state; template state changes (from AI) update CodeMirror.
- Use CodeMirror's `EditorView.updateListener` for change detection.

### Context pane: JSON editor
- A CodeMirror instance with `@codemirror/lang-json` showing the current mock data as formatted JSON.
- Editable: user changes JSON → validate against schema → update renderer preview.
- Show validation errors inline.

### State management
- Use React context (`EditorContext`) to share:
  - `template: string` — current Liquid source
  - `data: Record<string, unknown>` — current context data
  - `schema: ZodType` — the Zod schema (immutable prop)
  - `selectedElement: SourceRange | null` — currently selected element in preview
  - `updateTemplate(newTemplate: string): void`
  - `updateData(newData: Record<string, unknown>): void`
  - `setSelectedElement(range: SourceRange | null): void`

### Props API
```typescript
interface LiquidEditorProps {
  template: string;                          // Initial Liquid template source
  schema: ZodType;                           // Zod schema for template data
  onSave: (updatedTemplate: string) => void; // Called when user saves/closes
  systemPrompt?: string;                     // Optional design guidelines for AI
  modelId?: string;                          // WebLLM model override
  className?: string;
}
```

## Tasks

### T3.1 — EditorContext provider
```
- src/context/EditorContext.tsx
- Provides template, data, schema, selectedElement, and update functions
- Initializes data with generateMockData(schema) on mount
- Changes to template trigger debounced re-render in Preview
```

### T3.2 — Toolbar component
```
- src/layout/Toolbar.tsx
- Center: shadcn Tabs or custom SegmentedControl — Preview | Code | Context
- Right: Button "Save & Close" — calls onSave(currentTemplate) and unmounts
- Left: static label or template name
- Styling: border-b, bg-background, h-12, matching shadcn design tokens
```

### T3.3 — WorkspacePane component
```
- src/workspace/WorkspacePane.tsx
- Renders the active pane based on toolbar segment selection
- Panes are lazy-mounted (keep CodeMirror instances alive when switching, don't destroy/recreate)
```

### T3.4 — PreviewPane
```
- src/workspace/PreviewPane.tsx
- Renders <LiquidRenderer template={template} schema={schema} data={data} instrumentSourceMap={true}
    onElementSelect={setSelectedElement} />
- Shows a loading skeleton while Liquid is rendering
```

### T3.5 — CodePane
```
- src/workspace/CodePane.tsx
- Renders CodeMirror 6 with @codemirror/lang-liquid
- Controlled value: syncs with EditorContext.template
- On change: updateTemplate(newValue) with 300ms debounce
- Extensions: line numbers, bracket matching, liquid() language, autocompletion
```

### T3.6 — ContextPane
```
- src/workspace/ContextPane.tsx
- Renders CodeMirror 6 with @codemirror/lang-json
- Shows JSON.stringify(data, null, 2)
- On change: parse JSON → schema.safeParse → if valid, updateData
- If invalid JSON or schema validation fails: show inline error below editor
- Button: "Regenerate Mock Data" — calls generateMockData(schema) and replaces
```

### T3.7 — AI Panel placeholder
```
- src/ai-panel/AiPanel.tsx
- For now: a div with "AI Assistant" heading and a placeholder message
- This is replaced in Phase 5
```

### T3.8 — Main LiquidEditor component
```
- src/LiquidEditor.tsx
- Wraps everything in EditorContext
- Renders: Toolbar + Grid layout (WorkspacePane 80% | AiPanel 20%)
- Exports from index.ts
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC3.1 | Editor mounts and shows Preview by default | Playwright: check for iframe presence |
| SC3.2 | Segment selector switches between Preview, Code, Context | Playwright: click each tab → correct pane visible |
| SC3.3 | Code tab shows Liquid syntax highlighting | Playwright: CodeMirror DOM contains `.cm-tag` or `.cm-liquid` tokens |
| SC3.4 | Editing code updates preview within 500ms | Playwright: type in CodeMirror → iframe content updates |
| SC3.5 | Context tab shows valid JSON of mock data | Playwright: JSON.parse(contextPane.textContent) succeeds |
| SC3.6 | Editing context JSON updates preview | Playwright: modify JSON → preview reflects change |
| SC3.7 | Save & Close button fires onSave with current template text | Component test: mock onSave, click button, assert called with correct string |
| SC3.8 | Layout is 80/20 split | Visual regression: screenshot matches baseline |

## Risks & Mitigations
- **Risk:** CodeMirror 6 + React integration can be tricky (controlled vs uncontrolled). **Mitigation:** Use `@uiw/react-codemirror` wrapper or a thin custom hook that manages EditorView lifecycle.
- **Risk:** Two CodeMirror instances (Code + Context) may be heavy. **Mitigation:** Lazy-mount Context pane only when active. Profile memory.

---

# PHASE 4 — WebLLM Runtime

## Goal
Build `@liquid-ai/runtime-webllm` — the assistant-ui `ChatModelAdapter` that runs a Qwen2.5-Coder model entirely client-side via WebLLM's `WebWorkerMLCEngine`. This phase is about the runtime only — no UI, no chat interface.

## Context for Agent Team
This is the most technically demanding phase. WebLLM runs in a Web Worker (off main thread), communicates via structured messages, and requires WebGPU. You need to handle model download progress, VRAM detection, graceful degradation, and streaming token output — all wrapped in the assistant-ui adapter interface. Test with mocks; real-model tests require a WebGPU-capable environment.

## Technical Decisions

### Model selection strategy
- **Primary:** `Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC` (5107 MB VRAM) — best code quality.
- **Fallback 1:** `Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC` (2505 MB VRAM) — good enough for Liquid/HTML.
- **Fallback 2:** `Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC` (1630 MB VRAM) — minimum viable.
- **Detection:** Use `navigator.gpu.requestAdapter()` → `adapter.requestAdapterInfo()` to estimate available VRAM. If undetectable, default to 3B.
- **User override:** the `modelId` prop on LiquidEditor lets developers force a specific model.

### WebWorkerMLCEngine
- WebLLM provides `WebWorkerMLCEngine` — the engine runs entirely in a Web Worker.
- The main thread communicates via `CreateMLCEngine` / postMessage.
- This keeps the UI thread responsive during inference.

### assistant-ui ChatModelAdapter
- assistant-ui's `LocalRuntime` accepts a `ChatModelAdapter` with a `run()` method.
- `run()` receives messages (the conversation history) and must yield streamed text chunks.
- We implement `run()` by calling `engine.chat.completions.create({ stream: true, messages, response_format })`.
- For structured output (tool calls), use WebLLM's `response_format: { type: "json_object", schema: ... }` with XGrammar.

### Structured output contract
- Define tool schemas as JSON Schema (from Zod via `zod-to-json-schema`).
- The adapter converts assistant-ui tool definitions → WebLLM `response_format` or `tools` parameter.
- Post-validate JSON responses with `json-repair` before passing to tool handlers.

## Tasks

### T4.1 — Web Worker setup
```
- src/worker.ts — the worker file
  - Imports @mlc-ai/web-llm
  - Listens for 'init', 'chat', 'abort' messages
  - 'init': loads model with initProgressCallback, posts progress back
  - 'chat': runs engine.chat.completions.create({ stream: true }), posts chunks back
  - 'abort': calls engine.interruptGenerate()
```

### T4.2 — Model picker + VRAM detection
```
- src/model-picker.ts
- detectVRAM() => Promise<number | null>
  Uses navigator.gpu?.requestAdapter() to estimate available memory
- selectModel(preferredId?: string) => ModelConfig
  Returns the best model for available VRAM, or the preferred override
- ModelConfig: { id: string, vramMB: number, downloadSizeMB: number }
```

### T4.3 — ChatModelAdapter implementation
```
- src/adapter.ts
- Implements assistant-ui ChatModelAdapter interface
- constructor(options: { modelId?: string, onProgress?: (progress: LoadProgress) => void })
- async init(): loads model via worker, reports progress
- run({ messages, abortSignal, config }): AsyncGenerator<ChatModelRunResult>
  - Converts assistant-ui message format → OpenAI-compatible format
  - Posts to worker
  - Yields streamed text chunks
  - Handles abort signal → worker.postMessage('abort')
- Handles tool calls: when response_format is json_object, parse structured output,
  map to assistant-ui tool call format
```

### T4.4 — WebGPU detection + fallback
```
- src/detect.ts
- isWebGPUAvailable() => boolean
- If not available: adapter.run() returns a single message:
  "WebGPU is required for AI features. Your browser does not support WebGPU.
   The editor's Preview, Code, and Context tabs work without AI."
- Export a React hook: useWebGPUStatus() => { available: boolean, adapter: GPUAdapterInfo | null }
```

### T4.5 — Progress UI component
```
- src/ModelLoadProgress.tsx (a small React component)
- Shows: model name, download progress bar, "Downloading model (X/Y MB)"
- Uses the onProgress callback from adapter init
- This component is used by the editor in Phase 5
```

### T4.6 — Unit tests (mocked)
```
- Mock the Web Worker (no real WebGPU in CI)
- Test: adapter.init() resolves after worker posts 'ready'
- Test: adapter.run() yields streamed chunks when worker posts tokens
- Test: abort signal stops generation
- Test: VRAM detection returns null when navigator.gpu is undefined
- Test: selectModel fallback logic works correctly
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC4.1 | ChatModelAdapter conforms to assistant-ui interface | TypeScript compiles — adapter satisfies ChatModelAdapter type |
| SC4.2 | Mocked adapter streams chunks correctly | Unit test: yield count matches expected chunks |
| SC4.3 | Abort signal stops generation | Unit test: abort after 2 chunks → generator completes early |
| SC4.4 | WebGPU detection returns false in jsdom | Unit test: isWebGPUAvailable() === false in test env |
| SC4.5 | Model picker selects appropriate model for VRAM | Unit test: 6000MB → 7B; 3000MB → 3B; 2000MB → 1.5B; null → 3B |
| SC4.6 | Progress callback fires during mock init | Unit test: onProgress called with incremental values |
| SC4.7 | Package has zero React dependencies in production exports | Only ModelLoadProgress is React; core adapter is vanilla TS |

## Risks & Mitigations
- **Risk:** WebLLM's `WebWorkerMLCEngine` API may change between versions. **Mitigation:** Pin `@mlc-ai/web-llm` version. Add an integration test that loads a real tiny model (run only on GPU CI runners).
- **Risk:** engine reuse across different JSON schemas can cause "Module disposed" errors (WebLLM Issue #560). **Mitigation:** Reset engine between schema changes, or instantiate fresh per schema.
- **Risk:** First model download is 1.6–5 GB. **Mitigation:** Show progress UI; cache in browser storage (WebLLM handles this via Cache API).

---

# PHASE 5 — AI Chat Panel + Basic Generation

## Goal
Wire the WebLLM runtime into the editor's AI panel using assistant-ui. The user can type a prompt, and the AI generates or edits the Liquid template. This is where the magic starts.

## Context for Agent Team
This phase connects Phase 3 (editor shell) with Phase 4 (WebLLM runtime) through assistant-ui's `LocalRuntime`. The AI must understand the Zod schema, always render required fields, and produce valid Liquid. Use few-shot prompting and XGrammar structured output. The chat panel should feel like a shadcn-native conversation — clean, minimal, fast.

## Technical Decisions

### System prompt design
The system prompt is critical for tiny model reliability. It must:
1. Describe the AI's role: "You are a Liquid template builder. You generate and edit Liquid templates."
2. Include the JSON Schema of the template's data (from `zod-to-json-schema`).
3. List required fields explicitly: "These fields MUST appear in every template: title, price."
4. Include 2–3 few-shot examples of Liquid template generation (input prompt → output template).
5. Specify output format: the AI responds with a JSON object `{ "template": "...", "explanation": "..." }`.
6. If the user provides a `systemPrompt` prop (design guidelines), append it.

### Structured output
- Use XGrammar `response_format: { type: "json_object", schema: editResponseSchema }`.
- `editResponseSchema`: `{ template: string, explanation: string }`.
- This guarantees valid JSON 100% of the time (XGrammar handles grammar-constrained decoding).
- Semantic quality varies by model size — post-validate that the template parses in LiquidJS.

### assistant-ui integration
- Use `useLocalRuntime` with the WebLLM `ChatModelAdapter`.
- Mount `<AssistantRuntimeProvider>` wrapping the AI panel.
- Use `<Thread>` component for the chat history.
- Use `<Composer>` for the input field.
- After each assistant response: extract the template from structured output → update EditorContext.template.

### Generation flow
```
User types prompt
  → assistant-ui sends to LocalRuntime
  → ChatModelAdapter.run() streams to WebLLM worker
  → worker returns structured JSON { template, explanation }
  → adapter parses JSON, yields tool result
  → Thread displays explanation text
  → Editor updates template + re-renders preview
```

## Tasks

### T5.1 — System prompt builder
```
- packages/editor/src/ai-panel/system-prompt.ts
- buildSystemPrompt(schema: ZodType, customPrompt?: string) => string
- Includes: role description, JSON Schema, required fields list, few-shot examples, output format spec
- Few-shot examples: 3 examples of (user prompt → Liquid template)
  Example 1: "Create a product card" → full template with title, price, image
  Example 2: "Add a description section below the title" → targeted edit
  Example 3: "Change the background to dark theme" → CSS modification
- Unit test: output contains all required sections
```

### T5.2 — Runtime provider setup
```
- packages/editor/src/ai-panel/RuntimeProvider.tsx
- Creates WebLLM ChatModelAdapter
- Wraps children in <AssistantRuntimeProvider runtime={localRuntime}>
- Shows ModelLoadProgress while model is downloading
- Shows WebGPU-not-available message if detection fails
```

### T5.3 — AI Panel component
```
- packages/editor/src/ai-panel/AiPanel.tsx (replace Phase 3 placeholder)
- Uses assistant-ui <Thread> and <Composer> components
- Styling: shadcn theme, fits in the 20% panel width (320px)
- Thread messages: user messages (text), assistant messages (explanation text + "Template updated" indicator)
- On assistant response: parse the structured output, call updateTemplate()
```

### T5.4 — Template update handler
```
- packages/editor/src/ai-panel/template-handler.ts
- handleAssistantResponse(response: string, context: EditorContext) => void
- Parse response as JSON (json-repair fallback)
- Validate template field parses in LiquidJS
- If valid: updateTemplate(response.template)
- If invalid: show error in chat ("I generated invalid Liquid. Let me try again.")
  → optionally auto-retry with error context
```

### T5.5 — Required fields enforcement
```
- packages/editor/src/ai-panel/validate-template.ts
- validateRequiredFields(template: string, schema: ZodType) => { valid: boolean, missing: string[] }
- Checks that every required field from the schema appears as {{ fieldName }} or is used in a
  {% %} tag in the template
- After generation: if required fields missing, auto-append a correction prompt to the AI
```

### T5.6 — Chat conversation management
```
- Conversation history is held in assistant-ui's runtime (in-memory for now)
- Each message includes role and content
- System prompt is prepended to every conversation
- Context about the current template state is injected before user messages
```

### T5.7 — Integration test (mocked LLM)
```
- Mock the ChatModelAdapter with a deterministic response
- Test full flow: mount editor → type prompt → mock adapter returns structured response
  → template updates → preview shows new content
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC5.1 | AI panel renders with Thread + Composer | Playwright: chat input and message list visible |
| SC5.2 | Model loading shows progress UI | Playwright (mocked): progress bar visible during init |
| SC5.3 | User message appears in thread | Playwright: type + enter → message visible |
| SC5.4 | Mock assistant response updates template | Integration test: after response, EditorContext.template changed |
| SC5.5 | Preview updates after AI generates template | Playwright (mocked): iframe content changes after AI response |
| SC5.6 | Invalid Liquid from AI shows error in chat | Test: mock adapter returns invalid template → error message in thread |
| SC5.7 | Required fields are enforced | Test: mock response missing required field → correction prompt sent |
| SC5.8 | WebGPU-not-available shows fallback message | Test: mock navigator.gpu as undefined → message displayed |

## Risks & Mitigations
- **Risk:** Tiny models generate invalid Liquid frequently. **Mitigation:** XGrammar constrains JSON structure; LiquidJS parse validation catches syntax errors; auto-retry with error context (up to 2 retries). Track error rate for model quality assessment.
- **Risk:** assistant-ui API changes between versions. **Mitigation:** Pin version; use only stable APIs (LocalRuntime, Thread, Composer).

---

# PHASE 6 — Mock Data + Context Tab Enhancement

## Goal
Enhance the Context tab with rich mock data UX: regenerate with different seeds, override individual fields, see validation errors inline, and sync bidirectionally with the AI (AI can modify context data, not just template).

## Context for Agent Team
This phase polishes the mock data pipeline from Phase 1 and makes it interactive. The Context tab should feel like a mini data playground. The key insight: when the user modifies context data and sees the template update, it builds understanding of how the template works — which makes subsequent AI prompts more targeted.

## Tasks

### T6.1 — Enhanced mock data controls
```
- Add a toolbar above the Context pane JSON editor:
  - "Regenerate" button — new random seed → new mock data
  - "Reset to defaults" — restore initial mock data
  - Seed input field — type a number for reproducible data
  - Toggle: "Show only required fields" vs "Show all fields"
```

### T6.2 — Field-level validation feedback
```
- When user edits JSON, validate in real-time:
  - Valid: green checkmark indicator
  - Invalid JSON syntax: red squiggly underline in CodeMirror + error message below
  - Valid JSON but schema mismatch: orange warning with field-specific errors
    (e.g., "price must be a number, got string")
```

### T6.3 — AI context awareness
```
- When the AI generates a template, also generate matching context data if the template
  uses new variables not in the current data
- The system prompt should instruct the model to output:
  { "template": "...", "context_updates": { "new_field": "value" }, "explanation": "..." }
- context_updates are merged into the current data
```

### T6.4 — Schema documentation in Context pane
```
- Add a collapsible "Schema Reference" section below the JSON editor
- Shows each field: name, type, required/optional, description (from Zod .describe())
- Visual indicator: required fields have a red asterisk
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC6.1 | Regenerate produces different mock data each click | Test: two consecutive regenerations produce different JSON |
| SC6.2 | Same seed always produces same data | Test: seed=42 twice → identical JSON |
| SC6.3 | Schema validation errors show inline | Test: set price to "abc" → orange warning "must be a number" |
| SC6.4 | AI can update context data alongside template | Integration test: mock AI returns context_updates → data merges |
| SC6.5 | Schema reference shows all fields with required/optional markers | Playwright: collapsible section contains all schema fields |

---

# PHASE 7 — Tool UIs + Generative Components

## Goal
Vendor and integrate tool-ui.com's Parameter Slider, Question Flow, and Preferences Panel as assistant-ui tool UIs. The AI uses these as interactive response components instead of plain text — enabling the click-heavy UX.

## Context for Agent Team
tool-ui.com is a copy/paste component library (shadcn model, not npm). You'll vendor the three components into `packages/tool-ui/`, adapt them to our Tailwind preset, and register them with assistant-ui's `makeAssistantToolUI` (or `Tools()`). Each tool UI has a Zod schema for its payload, renders an interactive control, and returns a "receipt" (the user's choices) back to the assistant.

## Technical Decisions

### Vendoring approach
- Copy the source from tool-ui.com's GitHub into `packages/tool-ui/src/`.
- Adapt imports to our shadcn/Radix setup.
- Each component folder: component.tsx, schema.ts (Zod), types.ts, styles if any.

### assistant-ui registration
- Use `makeAssistantToolUI` to register each tool UI component.
- Define tool schemas that the AI can call:
  - `adjust_spacing` → renders Parameter Slider (min, max, step, current value, label)
  - `clarify_intent` → renders Question Flow (question text, options array)
  - `configure_styles` → renders Preferences Panel (multiple labeled inputs: selects, toggles, sliders)
- The AI decides which tool to call based on the user's intent.

### Receipt flow
- User interacts with tool UI (drags slider, selects option, fills form).
- Component calls `addResult(receipt)` — the receipt is a structured JSON of the user's choices.
- assistant-ui appends the receipt to the conversation as a tool result.
- The AI's next turn uses the receipt to generate the template edit.

## Tasks

### T7.1 — Vendor Parameter Slider
```
- packages/tool-ui/src/parameter-slider/
- Copy from tool-ui.com, adapt to our Tailwind preset
- Schema: { label: string, min: number, max: number, step: number, value: number, unit?: string }
- Receipt: { value: number }
- Register as assistant-ui tool: "adjust_parameter"
```

### T7.2 — Vendor Question Flow
```
- packages/tool-ui/src/question-flow/
- Schema: { question: string, options: { id: string, label: string, description?: string }[] }
- Receipt: { selectedId: string }
- Register as assistant-ui tool: "ask_question"
```

### T7.3 — Vendor Preferences Panel
```
- packages/tool-ui/src/preferences-panel/
- Schema: { title: string, fields: { id: string, label: string, type: "slider"|"select"|"toggle",
    options?: string[], min?: number, max?: number, value: any }[] }
- Receipt: { values: Record<string, any> }
- Register as assistant-ui tool: "configure_preferences"
```

### T7.4 — Tool registration in AI panel
```
- packages/editor/src/tools/register-tools.ts
- Register all three tool UIs with assistant-ui
- Update system prompt to include tool descriptions so the AI knows when to use each:
  - Parameter Slider: for single numeric adjustments (margin, padding, font-size, opacity)
  - Question Flow: for clarifying ambiguous requests
  - Preferences Panel: for multi-field style configuration (colors, fonts, layouts)
```

### T7.5 — Receipt → template edit pipeline
```
- When a tool receipt arrives:
  1. Inject the receipt into the conversation context
  2. Auto-prompt the AI: "Apply these settings: {receipt}"
  3. AI generates updated template
  4. Update preview
- This should be seamless — user adjusts slider → preview updates
```

### T7.6 — Debounced slider updates
```
- For Parameter Slider: debounce the receipt (200ms) so rapid dragging doesn't spam the AI
- Show a "Applying..." indicator while the AI processes
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC7.1 | Parameter Slider renders from tool call args | Component test: pass schema args → slider visible with correct range |
| SC7.2 | Slider receipt flows back to assistant | Component test: drag slider → addResult called with value |
| SC7.3 | Question Flow renders options as clickable cards | Component test: options rendered, clicking one calls addResult |
| SC7.4 | Preferences Panel renders multiple fields | Component test: mixed field types render correctly |
| SC7.5 | AI uses tools appropriately in mocked scenario | Integration test: "change padding" prompt → AI calls adjust_parameter tool |
| SC7.6 | Slider change updates preview (E2E with mock) | Playwright: drag slider → preview CSS changes |
| SC7.7 | All tool UI Zod schemas validate their receipts | Unit test: receipt.parse(mockReceipt) succeeds for each tool |

## Risks & Mitigations
- **Risk:** Tiny models may not reliably choose the correct tool. **Mitigation:** Keep tool descriptions short and distinct. Use few-shot examples showing tool selection. If the model fails to use tools, fall back to text-only edits.
- **Risk:** tool-ui.com components may have upstream changes. **Mitigation:** Vendor with a date stamp; periodically diff against upstream.

---

# PHASE 8 — Element Selection + Suggestions

## Goal
Click-to-select an element in the preview → it's highlighted → context sent to AI → AI preemptively offers clickable Suggestions → clicking a suggestion triggers the appropriate tool UI. This is the crown jewel interaction pattern.

## Context for Agent Team
This phase connects the `data-loc` source mapping from Phase 1, the iframe click handling from Phase 2, and the tool UIs from Phase 7. The user selects a DOM element in the preview iframe; the editor maps it back to Liquid source; the AI receives this context and generates relevant Suggestions (assistant-ui's Suggestion Primitives). It's the most complex cross-system integration.

## Technical Decisions

### Selection flow
```
User clicks element in preview iframe
  → iframe's selection-handler.js reads data-loc from clicked element (or nearest parent with data-loc)
  → postMessage { type: 'element-select', loc: '42:87', tagName: 'div', computedStyles: { padding: '16px', ... } }
  → parent editor receives message via IframeSandbox.onMessage
  → EditorContext.setSelectedElement({ start: 42, end: 87, snippet: '<div class="product-card">...', styles: {...} })
  → AI panel receives selectedElement change
  → Suggestion adapter generates contextual suggestions
```

### Highlight in iframe
- When an element is selected, inject a CSS class via postMessage back into the iframe:
  `document.querySelector('[data-loc="42:87"]').classList.add('liquid-ai-selected')`
- The injected stylesheet defines `.liquid-ai-selected { outline: 2px solid #3b82f6; outline-offset: 2px; }`.
- Clear previous selection on new click.

### Highlight in CodeMirror
- When an element is selected, scroll to and highlight the corresponding source range in the Code pane.
- Use CodeMirror's `Decoration.mark` to add a background highlight to the range.

### Suggestions generation
- assistant-ui supports Suggestions via `ThreadPrimitive.Suggestions` and a suggestion adapter.
- When `selectedElement` changes, generate suggestions based on:
  1. The element's computed styles → "Adjust padding", "Change font size", "Modify background color"
  2. The element's tag name → structural suggestions like "Add a child element", "Wrap in a container"
  3. The element type → semantic suggestions like "Make this a link", "Convert to a list"
- Suggestions are displayed as clickable chips in the AI panel.
- Clicking a suggestion auto-sends it as a user message → AI responds with the appropriate tool UI.

### Suggestion templates
```
For a selected <div> with padding: 16px, font-size: 14px, color: #333:
  → "Adjust spacing" (→ AI responds with Parameter Slider for margin/padding)
  → "Change typography" (→ AI responds with Preferences Panel for font-size, weight, family)
  → "Modify colors" (→ AI responds with Preferences Panel for text color, background)
  → "Remove this element"
  → "Duplicate this element"
```

## Tasks

### T8.1 — iframe selection handler enhancement
```
- Update the selection-handler.js injected into iframe srcdoc
- On click: find nearest [data-loc] ancestor
- Read computed styles (padding, margin, font-size, color, background, width, height, display, etc.)
- postMessage to parent with full context
- Add/remove .liquid-ai-selected class
- Handle click on already-selected element → deselect
```

### T8.2 — CodeMirror highlight sync
```
- When selectedElement changes in EditorContext:
  - Map SourceRange to CodeMirror positions
  - Apply Decoration.mark with a highlight class
  - Scroll to the range with scrollIntoView
  - Clear previous highlight
```

### T8.3 — Suggestion adapter
```
- packages/editor/src/ai-panel/suggestion-adapter.ts
- generateSuggestions(selectedElement: SelectedElement | null) => Suggestion[]
- Each Suggestion: { prompt: string, displayLabel: string, icon?: string }
- Rules:
  - No selection → general suggestions: "Generate a new section", "Change the overall layout"
  - With selection → contextual suggestions based on styles + element type
  - Limit to 4–6 suggestions max
- Hook into assistant-ui's suggestion system
```

### T8.4 — Suggestion → tool UI pipeline
```
- When a suggestion is clicked, it sends the prompt as a user message
- The system prompt context now includes the selected element info:
  "The user has selected: <div data-loc='42:87'> with styles: { padding: 16px, ... }
   Source: {% for product in products %}<div class='product-card'>..."
- The AI should respond with the appropriate tool call (parameter slider / preferences panel)
```

### T8.5 — Targeted template edits
```
- When the AI generates an edit for a selected element, it should modify ONLY
  the source range corresponding to the selection, not regenerate the entire template
- Approach: include the source snippet in the prompt + instruction "modify only this section"
- Replace the source range in the template string with the AI's output
```

### T8.6 — Deselection + escape key
```
- Click on blank area in preview → deselect
- Press Escape → deselect
- Deselection clears highlight in both iframe and CodeMirror
- Suggestions revert to general suggestions
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC8.1 | Clicking element in preview highlights it with blue outline | Playwright: click element → outline visible |
| SC8.2 | Selected element's source range highlights in Code pane | Playwright: switch to Code tab → highlighted range visible |
| SC8.3 | Contextual suggestions appear after selection | Playwright: click element → suggestion chips appear in AI panel |
| SC8.4 | Clicking suggestion sends prompt to AI | Playwright: click "Adjust spacing" → message appears in thread |
| SC8.5 | AI responds with tool UI after suggestion click (mocked) | Integration test: suggestion → mock AI returns parameter slider tool call |
| SC8.6 | Escape key deselects | Playwright: select element → press Escape → outline removed |
| SC8.7 | Source mapping accuracy ≥ 95% on fixture suite | Unit test from Phase 1 re-validated: fixture accuracy check |
| SC8.8 | Targeted edit modifies only the selected range | Test: select element, mock AI returns edit → only that range changes in template |

## Risks & Mitigations
- **Risk:** `data-loc` mapping breaks with complex nested templates (partials, deeply nested for loops). **Mitigation:** Fall back to block-boundary mapping for unmappable elements. Always have a "this element couldn't be precisely mapped" fallback UX.
- **Risk:** computed styles from the iframe may not reflect the actual CSS (inherited styles, etc.). **Mitigation:** Use `getComputedStyle()` which resolves inheritance. Send raw values, not parsed.

---

# PHASE 9 — Persistence + Checkpoints

## Goal
Store chat sessions, conversation history, and template checkpoints entirely client-side using PGlite (Postgres in WASM, IndexedDB persistence). Enable browsing past sessions and restoring/branching from checkpoints.

## Context for Agent Team
PGlite gives us a real relational database in the browser, persisted to IndexedDB. This phase implements the data layer for sessions (each editor open creates a new one), messages (chat history), and checkpoints (template snapshots at each modification). The UX: users can see "Session History" in the AI panel sidebar, browse past sessions, and restore any checkpoint.

## Technical Decisions

### PGlite configuration
- Use `@electric-sql/pglite` with `PGlite({ dataDir: 'idb://liquid-ai-editor' })`.
- IndexedDB VFS for Safari compatibility (OPFS is not supported in Safari as of 2026).
- Initialize schema on first load; migrations for future versions.

### Database schema
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  template_initial TEXT NOT NULL,   -- starting template
  schema_json JSONB NOT NULL,       -- JSON Schema snapshot
  system_prompt TEXT
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,                 -- tool calls/results if any
  created_at TIMESTAMPTZ DEFAULT now(),
  seq INTEGER NOT NULL              -- ordering within session
);

CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES checkpoints(id),  -- for branching
  template_text TEXT NOT NULL,
  context_data JSONB,
  description TEXT,                  -- auto-generated: "Added product description section"
  created_at TIMESTAMPTZ DEFAULT now(),
  seq INTEGER NOT NULL
);
```

### Session lifecycle
- Editor mount → create new session, insert initial template + schema.
- Each AI-generated template change → create checkpoint.
- Each manual code edit (debounced, 5s after last keystroke) → create checkpoint.
- Editor unmount → update session.updated_at.
- New editor mount → fresh session; past sessions browsable.

### Checkpoint restore
- Selecting a past checkpoint sets template + data to that checkpoint's state.
- This is NOT undo/redo — it's time-travel. Any checkpoint can be restored.
- Restoring from a past session's checkpoint creates a new branch in the current session.

## Tasks

### T9.1 — PGlite initialization + schema
```
- packages/core/src/persistence/db.ts
- initDatabase() => PGlite instance
- Run CREATE TABLE IF NOT EXISTS for all tables
- Handle migration: version check + ALTER TABLE for future schema changes
```

### T9.2 — Session repository
```
- packages/core/src/persistence/sessions.ts
- createSession(template, schemaJson, systemPrompt?) => Session
- getSession(id) => Session
- listSessions(limit, offset) => Session[]
- updateSession(id, updates) => Session
```

### T9.3 — Message repository
```
- packages/core/src/persistence/messages.ts
- appendMessage(sessionId, role, content, toolCalls?) => Message
- getMessages(sessionId) => Message[]  (ordered by seq)
- clearMessages(sessionId) => void
```

### T9.4 — Checkpoint repository
```
- packages/core/src/persistence/checkpoints.ts
- createCheckpoint(sessionId, templateText, contextData, description, parentId?) => Checkpoint
- getCheckpoints(sessionId) => Checkpoint[]  (ordered by seq)
- getCheckpoint(id) => Checkpoint
- restoreCheckpoint(checkpointId) => { template: string, data: object }
```

### T9.5 — Auto-checkpoint on template change
```
- In EditorContext: after each template update (from AI or manual edit, debounced),
  call createCheckpoint with the new template state
- Auto-generate description from the last user message or "Manual edit"
```

### T9.6 — Session history UI
```
- Add a "History" button/icon in the AI panel header
- Opens a side panel (or replaces thread temporarily) showing:
  - Current session with list of checkpoints (timeline)
  - Past sessions list (date, first message preview)
  - Click checkpoint → restore (with confirmation)
  - Click past session → expand to see its checkpoints
```

### T9.7 — assistant-ui history adapter
```
- Wire PGlite messages to assistant-ui's history/persistence adapter
- On editor mount: load current session's messages → populate thread
- On new message: append to PGlite
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC9.1 | PGlite initializes and creates tables | Unit test (fake-indexeddb): tables exist after init |
| SC9.2 | Session CRUD operations work | Unit test: create, read, list, update |
| SC9.3 | Messages persist and reload in order | Unit test: append 5 messages, reload, verify order |
| SC9.4 | Checkpoints create on template change | Integration test: update template 3 times → 3 checkpoints |
| SC9.5 | Checkpoint restore sets correct template state | Unit test: restore checkpoint #2 → template matches checkpoint #2 text |
| SC9.6 | Data survives simulated page reload | Unit test: init db → insert data → new PGlite instance → data present |
| SC9.7 | Session history UI shows past sessions | Playwright: open history → past sessions listed |
| SC9.8 | PGlite WASM loads without errors | Integration test: no console errors during init |

## Risks & Mitigations
- **Risk:** PGlite adds ~3MB to the editor bundle. **Mitigation:** Lazy-load PGlite; it's not needed for the renderer. Only import in the editor package.
- **Risk:** IndexedDB quota limits on some browsers. **Mitigation:** Implement a cleanup strategy: delete sessions older than 30 days automatically. Show a warning when approaching quota.
- **Risk:** PGlite may have cold-start latency. **Mitigation:** Init PGlite in parallel with WebLLM model loading; both are async initialization.

---

# PHASE 10 — Polish, Packaging + Release

## Goal
Finalize the library for open-source release: consistent theming, accessibility, documentation, bundle optimization, and smoke tests in both Vite and Next.js consumer apps.

## Context for Agent Team
This is the "last mile" phase. Every sharp edge gets sanded down. The library must install cleanly via `npm install @liquid-ai/editor @liquid-ai/renderer`, mount with minimal config, and look professional. The README and Storybook are the first things people see.

## Tasks

### T10.1 — Bundle optimization
```
- Run bundle analysis (vite-plugin-visualizer) on each package
- Enforce size budgets:
  - @liquid-ai/renderer: < 50KB gzipped (no faker, no PGlite, no WebLLM)
  - @liquid-ai/editor: < 500KB gzipped (excluding WebLLM model download)
  - @liquid-ai/core: < 100KB gzipped
- Tree-shake: ensure unused exports are eliminated
- Dynamic imports: lazy-load PGlite, CodeMirror, tool-ui components
```

### T10.2 — Tailwind / CSS finalization
```
- Ship styles.css for each package (compiled Tailwind)
- Ship tailwind preset for Tailwind consumers
- Document both approaches in README
- Verify no CSS class name collisions (use a prefix: `lai-`)
- Dark mode support via CSS variables (inherit from host app's prefers-color-scheme)
```

### T10.3 — Accessibility audit
```
- Keyboard navigation: Tab through toolbar, segments, chat input
- ARIA labels: toolbar buttons, segment selector, chat messages
- Focus management: opening editor traps focus; closing returns it
- Screen reader: chat messages announced
- Color contrast: all text meets WCAG AA
```

### T10.4 — Consumer smoke tests
```
- Vite app: npm pack → install tarball → mount editor → assert renders
- Next.js App Router: dynamic import → mount editor → assert renders
- Next.js Pages Router: dynamic import → mount editor → assert renders
- Run these in CI
```

### T10.5 — Documentation
```
- README.md: installation, quick start, props reference, examples
- Storybook stories for:
  - LiquidRenderer (standalone)
  - LiquidEditor (with sample schema)
  - Each tool-ui component
  - Error states (no WebGPU, invalid template, schema mismatch)
- API reference: generated from TSDoc comments
- Architecture diagram (similar to the one in this spec)
```

### T10.6 — Storybook setup
```
- Add Storybook to root (or apps/storybook)
- Stories for all exported components
- Visual regression baseline screenshots
```

### T10.7 — Release setup
```
- Changesets for versioning
- GitHub Actions: auto-publish to npm on release
- Semantic versioning
- CHANGELOG generation
```

## Success Criteria

| # | Criterion | How to Validate |
|---|-----------|-----------------|
| SC10.1 | Renderer bundle < 50KB gzipped | CI: `du -b dist/*.mjs \| gzip -9` check |
| SC10.2 | Editor bundle < 500KB gzipped (excl. WebLLM) | CI: bundle size check |
| SC10.3 | Vite consumer app mounts editor successfully | CI: Playwright on Vite test app |
| SC10.4 | Next.js consumer app mounts editor successfully | CI: Playwright on Next.js test app |
| SC10.5 | Zero accessibility violations (axe-core) | Playwright + axe: 0 violations |
| SC10.6 | Storybook boots without errors | CI: storybook build exits 0 |
| SC10.7 | All consumer TypeScript type-checks pass | CI: tsc --noEmit in consumer apps |
| SC10.8 | README quick-start example works | Manual: follow README → editor mounts |

## Risks & Mitigations
- **Risk:** Tailwind class name collisions with host app. **Mitigation:** Use a custom prefix in the Tailwind config (`prefix: 'lai-'`). Test with a host app that also uses Tailwind.
- **Risk:** SSR hydration errors in Next.js. **Mitigation:** All WebGPU/browser-only code behind dynamic imports with `ssr: false`. Document this requirement.

---

# Cross-Phase Testing Strategy

## Test pyramid

| Level | Tool | What it covers | Where |
|-------|------|----------------|-------|
| Unit | Vitest | Pure functions: Liquid rendering, Zod introspection, mock data, source mapping, persistence CRUD | packages/*/src/**/*.test.ts |
| Component | Vitest Browser Mode + @testing-library/react | React components in real browser DOM: renderer, tool UIs, editor panes | packages/*/src/**/*.test.tsx |
| Integration | Vitest + mocked adapter | Full flows: prompt → AI response → template update → preview | packages/editor/src/**/*.integration.test.ts |
| E2E | Playwright | User journeys: mount editor → type prompt → preview updates → save | apps/playground/e2e/*.spec.ts |
| Visual | Playwright toHaveScreenshot | Layout, theming, regression | apps/playground/e2e/visual/*.spec.ts |

## LLM testing strategy
- **CI (no GPU):** Mock the ChatModelAdapter with deterministic responses. All unit, component, integration, and E2E tests use mocks. This ensures tests are fast, deterministic, and reproducible.
- **GPU runner (optional):** A separate CI job on a GPU-enabled runner loads a real tiny model (1.5B) and runs a small "golden edit" suite: 5 prompts → validate output parses as Liquid → validate required fields present. This is a smoke test, not a gate.
- **Local dev:** Developers with WebGPU can run real-model tests manually.

## Mock strategy
```typescript
// Deterministic mock adapter for tests
class MockChatModelAdapter implements ChatModelAdapter {
  constructor(private responses: Map<string, string>) {}
  
  async *run({ messages }) {
    const lastUserMsg = messages.findLast(m => m.role === 'user')?.content;
    const response = this.responses.get(lastUserMsg) ?? '{"template":"<p>mock</p>","explanation":"mock"}';
    yield { content: [{ type: 'text', text: response }] };
  }
}
```

---

# Risk Register (Cross-Phase)

| Risk | Likelihood | Impact | Phase | Mitigation |
|------|-----------|--------|-------|------------|
| Tiny LLM generates invalid Liquid | High | Medium | 5, 7, 8 | XGrammar structured output + LiquidJS parse validation + auto-retry (2x) |
| WebGPU not available in user's browser | Medium | High | 4 | Graceful degradation: editor works without AI; show clear message |
| Model download (1.6–5GB) deters users | Medium | Medium | 4 | Progress UI, smaller model default (3B), browser caches model |
| data-loc source mapping inaccurate | Medium | High | 1, 8 | Fixture suite with 95% accuracy gate; block-boundary fallback |
| PGlite cold-start latency | Low | Low | 9 | Parallel init with WebLLM; lazy-load on first persistence need |
| assistant-ui API breaks between versions | Medium | Medium | 5, 7 | Pin version; wrap in abstraction layer |
| Bundle too large for production renderer | Low | High | 10 | CI budget; keep faker/PGlite/WebLLM out of renderer bundle |
| CodeMirror + React controlled-mode bugs | Low | Medium | 3 | Use @uiw/react-codemirror wrapper; test bidirectional sync |

---

# Glossary

| Term | Definition |
|------|-----------|
| **data-loc** | A custom HTML attribute (`data-loc="start:end"`) injected into rendered Liquid output that maps a DOM element back to its character range in the Liquid source template. |
| **Receipt** | In tool-ui.com's model, a structured JSON object returned when a user completes interaction with a tool UI (e.g., slider value, selected option). Persists in chat as a tool result. |
| **Checkpoint** | A snapshot of the template text + context data at a point in time, stored client-side. Enables time-travel/restore/branching. |
| **XGrammar** | WebLLM's grammar-constrained decoding system that forces the model to output structurally valid JSON matching a provided schema. Guarantees valid syntax but not semantic correctness. |
| **Instrument** | The process of modifying a Liquid template's rendered output to include `data-loc` attributes for source mapping. Only used in the editor; disabled in production rendering. |
