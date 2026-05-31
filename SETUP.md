# System Setup Guide — `liquid-ai-editor` Overnight Coding Harness

**Purpose:** This document is a complete, step-by-step setup guide for a coding agent
to execute. When finished, the system will be ready for fully-autonomous overnight
coding sessions using Paseo, Claude Code, git worktrees, and a machine-checkable
verifier pipeline. Every command is idempotent — safe to re-run.

**Operator:** Azim (Buildkinship)  
**Project:** `liquid-ai-editor` — TypeScript pnpm+turbo monorepo  
**Goal:** Before first overnight run, confirm all tools, configs, and harness are live.

---

## 0. Prerequisites Checklist

Before executing any step, verify these are present on the host machine.
Run each check; if it fails, install per the note in parentheses.

```bash
# Node.js >= 20 LTS
node --version          # must be >= 20.0.0 (install: https://nodejs.org)

# pnpm >= 9
pnpm --version          # must be >= 9.0.0 (install: npm install -g pnpm)

# Git >= 2.38 (worktrees need modern git)
git --version           # must be >= 2.38.0 (install: https://git-scm.com)

# Claude Code CLI
claude --version        # must be present (install: npm install -g @anthropic-ai/claude-code)

# GitHub CLI (for PR creation and release automation)
gh --version            # must be >= 2.40.0 (install: https://cli.github.com)
gh auth status          # must show "Logged in to github.com"

# Playwright system dependencies (for E2E tests)
npx playwright install chromium --with-deps 2>&1 | tail -5
```

If any check fails, **stop and install the missing tool first**. Do not proceed.

---

## 1. Repository Initialization

### 1.1 — Clone or confirm the repo

```bash
# If repo does not exist yet, create it:
gh repo create liquid-ai-editor \
  --public \
  --description "Open-source AI-powered Liquid template editor for React" \
  --clone

cd liquid-ai-editor

# If repo already exists, just confirm you're in the root:
git rev-parse --show-toplevel   # should print the repo root path
```

### 1.2 — Confirm pnpm workspace structure

The root `package.json` and `pnpm-workspace.yaml` must exist:

```bash
# Check:
cat pnpm-workspace.yaml
```

**Expected content:**
```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tooling/*"
```

If missing, create it:

```bash
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "packages/*"
  - "apps/*"
  - "tooling/*"
EOF
```

### 1.3 — Root package.json scripts

Ensure the root `package.json` has these scripts so `pnpm -w run <script>` works:

```bash
node -e "
const pkg = require('./package.json');
const required = ['typecheck', 'lint', 'test', 'e2e', 'build'];
const missing = required.filter(s => !pkg.scripts?.[s]);
if (missing.length) console.log('MISSING SCRIPTS:', missing.join(', '));
else console.log('OK — all scripts present');
"
```

If missing scripts, add them to `package.json`:

```json
{
  "scripts": {
    "build":     "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint":      "turbo run lint",
    "test":      "turbo run test",
    "e2e":       "turbo run e2e",
    "dev":       "turbo run dev --parallel",
    "verify":    "pnpm typecheck && pnpm lint && pnpm test && pnpm e2e"
  }
}
```

---

## 2. Install Paseo

### 2.1 — Install the Paseo daemon

```bash
# Install globally
npm install -g paseo

# Verify
paseo --version

# Start the daemon (runs as a background process)
paseo start

# Confirm it is running
paseo status
# Expected: "Paseo daemon running on port 3142"
```

### 2.2 — Install Paseo skills

```bash
# Install all getpaseo/paseo orchestration skills
npx skills add getpaseo/paseo

# Verify all 6 stable skills are present
ls ~/.agents/skills/
# Expected output includes: paseo/ paseo-advisor/ paseo-committee/
#                            paseo-epic/ paseo-handoff/ paseo-loop/
```

### 2.3 — Connect your phone

```bash
# Get the relay connection URL
paseo relay

# This prints a URL like: https://app.paseo.sh/#offer=xxxx
# Open this URL on your phone in the Paseo app (iOS/Android)
# or in a mobile browser. Confirm the connection shows "Connected" on both ends.
```

### 2.4 — Create `paseo.json` at the repo root

This is the single most important config file — it defines the verifier harness.

```bash
cat > paseo.json << 'EOF'
{
  "worktree": {
    "setup": "pnpm install --frozen-lockfile",
    "teardown": "echo 'Worktree teardown complete'"
  },
  "scripts": {
    "typecheck": "pnpm -w run typecheck",
    "lint":      "pnpm -w run lint",
    "test":      "pnpm -w run test",
    "e2e":       "pnpm -w run e2e",
    "build":     "pnpm -w run build",
    "verify":    "pnpm -w run typecheck && pnpm -w run lint && pnpm -w run test"
  },
  "services": {
    "web": {
      "command":      "pnpm --filter playground dev",
      "readyPattern": "Local:.*http",
      "port":         5173
    }
  },
  "agents": {
    "defaultProvider": "claude",
    "workerProvider":  "codex",
    "verifierProvider": "claude"
  },
  "limits": {
    "maxTimeHours":    8,
    "maxIterations":  20,
    "maxBudgetUsd":   50
  }
}
EOF
```

**Verify Paseo can read it:**

```bash
paseo config validate
# Expected: "paseo.json is valid"
```

---

## 3. Claude Code Configuration

### 3.1 — Create `CLAUDE.md` at the repo root

This is the persistent instruction file every Claude Code session reads.

```bash
cat > CLAUDE.md << 'EOF'
# liquid-ai-editor — Agent Instructions

## Identity
You are building `liquid-ai-editor`, an open-source, client-side, AI-powered Liquid
template editor for React. It runs WebLLM (Qwen2.5-Coder) in-browser via WebGPU.
No server dependency. MIT license.

## Package Structure
- `packages/core`          → @liquid-ai/core (engine, no React)
- `packages/renderer`      → @liquid-ai/renderer (production <LiquidRenderer>)
- `packages/runtime-webllm`→ @liquid-ai/runtime-webllm (WebGPU adapter)
- `packages/tool-ui`       → @liquid-ai/tool-ui (vendored tool-ui components)
- `packages/editor`        → @liquid-ai/editor (main <LiquidEditor>)
- `apps/playground`        → Vite dev app
- `apps/nextjs-example`    → Next.js integration example

## Build Commands
```
pnpm install --frozen-lockfile    # install
pnpm -w run build                 # build all packages
pnpm -w run typecheck             # TypeScript check (0 errors required)
pnpm -w run lint                  # ESLint (0 errors required)
pnpm -w run test                  # Vitest unit + component tests
pnpm -w run e2e                   # Playwright E2E tests
pnpm -w run verify                # all of the above in sequence
```

## Commit Convention
Use Conventional Commits STRICTLY:
- `feat(scope): description`   → new feature (minor bump)
- `fix(scope): description`    → bug fix (patch bump)
- `docs(scope): description`   → documentation only
- `test(scope): description`   → adding/fixing tests
- `chore(scope): description`  → tooling, config
- `refactor(scope): description`
- BREAKING CHANGE footer for breaking changes (major bump)

Scope = package short name: core, renderer, editor, webllm, tool-ui, playground, ci

## Changeset Discipline
After every `feat` or `fix` commit, add a changeset:
```
pnpm changeset add
```
Select the affected packages. Write a user-facing summary. Commit with `chore: add changeset`.

## BOUND — NEVER DO These
1. NEVER commit directly to `main` — always work on a branch
2. NEVER auto-merge PRs — leave them as draft for human approval
3. NEVER run `npm publish` manually — only via the changesets/action CI
4. NEVER delete or overwrite `docs/vault/` files — they are the source of truth
5. NEVER use `--force` with git push
6. NEVER disable TypeScript strict mode
7. NEVER add `@ts-ignore` without a comment explaining why
8. NEVER import from `apps/` inside `packages/` (one-way dependency rule)
9. NEVER add `faker` or `@anatine/zod-mock` to `packages/renderer` (bundle budget)
10. NEVER skip adding tests for new exported functions

## Knowledge Vault
Read `/docs/vault/index.html` first. Each phase has its own HTML spec file.
The spec is the source of truth — code must satisfy its acceptance checklist.

## Testing Rules
- Mock the ChatModelAdapter in ALL unit/component/integration tests
- Real WebGPU/WebLLM tests only in the GPU E2E suite (separate Playwright project)
- Vitest Browser Mode for component tests that need a real DOM
- All new exported functions must have unit tests

## Style
- TypeScript strict: true
- No `any` types (use `unknown` + type narrowing)
- Tailwind classes prefixed with `lai-` (custom prefix, set in tailwind config)
- Radix UI + shadcn/ui for all UI primitives
- No inline styles except for dynamic values
EOF
```

### 3.2 — Create Claude Code hooks

Hooks enforce guardrails at the tool level — before and after every file operation.

```bash
mkdir -p .claude

cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/pre-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post-write.sh"
          }
        ]
      }
    ]
  }
}
EOF
```

Create the hook scripts:

```bash
mkdir -p .claude/hooks

# Pre-bash hook: blocks dangerous commands (exit code 2 = hard block)
cat > .claude/hooks/pre-bash.sh << 'HOOKEOF'
#!/usr/bin/env bash
# Read the command from stdin (Claude Code passes it as JSON)
INPUT=$(cat)
CMD=$(echo "$INPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).command || '')")

# Block list — exit 2 to hard-block
BLOCKED_PATTERNS=(
  "rm -rf /"
  "git push.*--force"
  "git push.*main"
  "npm publish"
  "pnpm publish"
  "npx changeset publish"
  "curl.*| bash"
  "wget.*| bash"
  "chmod 777"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$CMD" | grep -qE "$pattern"; then
    echo "BLOCKED: '$pattern' is not allowed in automated sessions" >&2
    exit 2
  fi
done

exit 0
HOOKEOF

# Post-write hook: auto-run typecheck on TypeScript file changes
cat > .claude/hooks/post-write.sh << 'HOOKEOF'
#!/usr/bin/env bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).path || '')")

# Only run on TypeScript/TSX files
if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  echo "Running typecheck after edit to $FILE..."
  pnpm -w run typecheck --noEmit 2>&1 | tail -20
fi

exit 0
HOOKEOF

chmod +x .claude/hooks/pre-bash.sh .claude/hooks/post-write.sh
```

### 3.3 — Create a reviewer subagent

```bash
mkdir -p .claude/agents

cat > .claude/agents/reviewer.md << 'EOF'
---
name: reviewer
description: Read-only code reviewer. Reviews diffs and reports issues. Never edits files.
tools: Read, Glob, Grep, Bash(git diff*), Bash(cat*), Bash(pnpm*lint*), Bash(pnpm*typecheck*)
---

You are a senior TypeScript/React engineer doing a thorough code review.
You have READ-ONLY access. You MUST NOT edit, create, or delete any files.

When invoked, you will:
1. Run `git diff main...HEAD` to see all changes
2. Read the relevant spec file in `/docs/vault/` for the phase being reviewed
3. Check every item on the acceptance checklist in the spec
4. Report:
   - ✅ Passing acceptance criteria
   - ❌ Failing acceptance criteria (with file + line reference)
   - ⚠️  Code quality issues (types, tests, bundle concerns)
   - 💡 Suggestions (non-blocking)

Output a structured review in markdown. Be specific — reference file paths and line numbers.
Do not be diplomatic about failures — the goal is to catch issues before human review.
EOF
```

---

## 4. Knowledge Vault Structure

### 4.1 — Create the vault directory

```bash
mkdir -p docs/vault
```

### 4.2 — Create the vault index

```bash
cat > docs/vault/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>liquid-ai-editor — Knowledge Vault</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: #0a0a0f; color: #e8e6e1; }
    h1 { color: #c4f04d; }
    a { color: #4dabff; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #222; }
    th { color: #8a8a9a; font-size: 0.8rem; text-transform: uppercase; }
    .status-ready { color: #c4f04d; }
    .status-pending { color: #ff8f4d; }
    .status-draft { color: #8a8a9a; }
  </style>
</head>
<body>
  <h1>liquid-ai-editor Knowledge Vault</h1>
  <p>This is the source of truth for all coding agent sessions. Read the relevant phase spec before starting any implementation work.</p>
  <h2>Phase Index</h2>
  <table>
    <tr><th>Phase</th><th>Name</th><th>Package</th><th>Status</th><th>Spec</th></tr>
    <tr><td>1</td><td>Core Engine</td><td>@liquid-ai/core</td><td class="status-pending">pending</td><td><a href="phase-01-core.html">phase-01-core.html</a></td></tr>
    <tr><td>2</td><td>Zod Schemas</td><td>@liquid-ai/core</td><td class="status-pending">pending</td><td><a href="phase-02-zod.html">phase-02-zod.html</a></td></tr>
    <tr><td>3</td><td>Renderer</td><td>@liquid-ai/renderer</td><td class="status-pending">pending</td><td><a href="phase-03-renderer.html">phase-03-renderer.html</a></td></tr>
    <tr><td>4</td><td>WebLLM Runtime</td><td>@liquid-ai/runtime-webllm</td><td class="status-draft">draft</td><td><a href="phase-04-webllm.html">phase-04-webllm.html</a></td></tr>
    <tr><td>5</td><td>AI Panel</td><td>@liquid-ai/editor</td><td class="status-draft">draft</td><td><a href="phase-05-ai-panel.html">phase-05-ai-panel.html</a></td></tr>
    <tr><td>6</td><td>CodeMirror</td><td>@liquid-ai/editor</td><td class="status-draft">draft</td><td><a href="phase-06-codemirror.html">phase-06-codemirror.html</a></td></tr>
    <tr><td>7</td><td>Tool-UI</td><td>@liquid-ai/tool-ui</td><td class="status-draft">draft</td><td><a href="phase-07-tool-ui.html">phase-07-tool-ui.html</a></td></tr>
    <tr><td>8</td><td>Source Maps</td><td>@liquid-ai/core</td><td class="status-draft">draft</td><td><a href="phase-08-sourcemaps.html">phase-08-sourcemaps.html</a></td></tr>
    <tr><td>9</td><td>Persistence</td><td>@liquid-ai/core</td><td class="status-draft">draft</td><td><a href="phase-09-persistence.html">phase-09-persistence.html</a></td></tr>
    <tr><td>10</td><td>Release</td><td>all packages</td><td class="status-draft">draft</td><td><a href="phase-10-release.html">phase-10-release.html</a></td></tr>
  </table>
  <h2>Reference Files</h2>
  <ul>
    <li><a href="architecture.html">System Architecture</a></li>
    <li><a href="conventions.html">Code Conventions</a></li>
    <li><a href="config.html">Live Configuration Dashboard</a></li>
  </ul>
</body>
</html>
EOF
```

### 4.3 — Create a starter phase spec (Phase 3 — Renderer, as the recommended first run)

```bash
cat > docs/vault/phase-03-renderer.html << 'SPECEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phase 3: LiquidRenderer — Spec</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: #0a0a0f; color: #e8e6e1; line-height: 1.6; }
    h1, h2, h3 { color: #c4f04d; }
    code, pre { font-family: 'JetBrains Mono', monospace; background: #12121a; border: 1px solid #222; border-radius: 6px; }
    code { padding: 0.1em 0.4em; font-size: 0.88em; }
    pre { padding: 1rem; overflow-x: auto; }
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 0.5rem 0; border-bottom: 1px solid #1a1a2e; }
    .checklist li::before { content: '☐ '; color: #4dabff; }
    a { color: #4dabff; }
    .risk { background: rgba(255,95,95,0.08); border-left: 3px solid #ff5f5f; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <p><a href="index.html">← Back to index</a></p>
  <h1>Phase 3 — Production Renderer</h1>
  <p><strong>Package:</strong> <code>@liquid-ai/renderer</code> | <strong>Branch:</strong> <code>phase-3-renderer</code></p>

  <h2>Goal</h2>
  <p>Build <code>&lt;LiquidRenderer /&gt;</code> — a standalone React component that renders Liquid templates with Zod-validated data inside a sandboxed iframe. Zero AI dependency. No WebLLM. No PGlite. Bundle must stay under <strong>50KB gzipped</strong>.</p>

  <h2>Files to Create</h2>
  <pre>packages/renderer/
├── src/
│   ├── LiquidRenderer.tsx       ← main component
│   ├── IframeSandbox.tsx        ← sandboxed iframe wrapper
│   ├── sanitize.ts              ← XSS sanitization
│   ├── index.ts                 ← public exports
│   └── __tests__/
│       ├── renderer.test.tsx    ← unit tests
│       └── sandbox.test.tsx     ← sandbox tests
├── package.json
├── tsconfig.json
└── vite.config.ts</pre>

  <h2>Component API</h2>
  <pre>interface LiquidRendererProps {
  template: string;              // Liquid template source
  data: Record&lt;string, unknown&gt;; // render context
  schema?: z.ZodObject&lt;any&gt;;    // optional validation
  className?: string;
  style?: React.CSSProperties;
  onError?: (err: Error) => void;
}</pre>

  <h2>Acceptance Checklist</h2>
  <ul class="checklist">
    <li><code>pnpm typecheck</code> passes with 0 errors</li>
    <li><code>pnpm test --filter renderer</code> passes (all tests green)</li>
    <li>Bundle size check: <code>du -b dist/*.mjs | gzip -9 | wc -c</code> &lt; 51200 bytes</li>
    <li>Renders <code>{{title}}</code> correctly in iframe — Playwright screenshot confirms</li>
    <li>XSS: <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> is stripped in sandbox mode</li>
    <li>Zod validation: invalid data prop logs error via <code>onError</code> callback</li>
    <li>No imports from <code>packages/editor</code>, <code>packages/runtime-webllm</code>, or any app</li>
    <li>ESLint passes with 0 errors</li>
    <li>Exported from <code>index.ts</code> with correct types</li>
    <li>Changeset file added for the feature</li>
  </ul>

  <h2>Risks</h2>
  <div class="risk">Bundle too large: do NOT import faker, PGlite, or @mlc-ai/web-llm in this package. Enforce via <code>bundleDependencies</code> and CI size check.</div>
  <div class="risk">SSR: the iframe is browser-only. Guard with <code>typeof window !== 'undefined'</code> and document this in the README.</div>
</body>
</html>
SPECEOF
```

---

## 5. Testing Harness

### 5.1 — Install Vitest

```bash
# Install at root (shared config)
pnpm add -Dw vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event \
  jsdom happy-dom @vitest/browser playwright

# Verify
pnpm vitest --version
```

### 5.2 — Create shared Vitest config

```bash
mkdir -p tooling/vitest

cat > tooling/vitest/vitest.base.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
      },
    },
  },
});
EOF
```

### 5.3 — Install Playwright

```bash
# Install Playwright + Chromium
pnpm add -Dw @playwright/test

# Install browser binaries
npx playwright install chromium --with-deps

# Verify
npx playwright --version
```

### 5.4 — Create root Playwright config

```bash
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps',
  testMatch: '**/e2e/**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Disable animations for visual regression stability
    launchOptions: {
      args: ['--disable-web-animations'],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // WebGPU project — only runs on GPU-enabled machines
    {
      name: 'chromium-webgpu',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
        },
      },
      grep: /@webgpu/,
    },
  ],

  webServer: {
    command: 'pnpm --filter playground dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
EOF
```

### 5.5 — Verify the full verifier chain

```bash
# Run each step of the verifier in sequence
echo "=== Step 1: typecheck ===" && pnpm -w run typecheck
echo "=== Step 2: lint ===" && pnpm -w run lint
echo "=== Step 3: test ===" && pnpm -w run test
echo "=== Step 4: build ===" && pnpm -w run build

echo ""
echo "✅ Verifier chain complete. If all steps passed, the harness is ready."
```

---

## 6. Changesets + Release Automation

### 6.1 — Install and initialize changesets

```bash
# Install
pnpm add -Dw @changesets/cli @changesets/changelog-github

# Initialize (creates .changeset/config.json)
pnpm changeset init
```

### 6.2 — Configure changesets

```bash
cat > .changeset/config.json << 'EOF'
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "YOUR_GITHUB_USERNAME/liquid-ai-editor" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
EOF
```

**Note:** Replace `YOUR_GITHUB_USERNAME` with the actual GitHub username/org.

### 6.3 — Create GitHub Actions workflow — CI

```bash
mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, 'phase-*', 'feat/*', 'fix/*']
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm -w run typecheck

      - name: Lint
        run: pnpm -w run lint

      - name: Test
        run: pnpm -w run test -- --coverage

      - name: Build
        run: pnpm -w run build

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: verify

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: Build
        run: pnpm -w run build

      - name: Run E2E
        run: pnpm -w run e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
EOF
```

### 6.4 — Create GitHub Actions workflow — Release

```bash
cat > .github/workflows/release.yml << 'EOF'
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release
  cancel-in-progress: false   # never cancel a release in flight

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    permissions:
      contents: write
      pull-requests: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm -w run build

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
          commit: 'chore: version packages'
          title: '🚀 Version Packages'
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF
```

### 6.5 — Create GitHub Actions workflow — Docs (GitHub Pages)

```bash
cat > .github/workflows/docs.yml << 'EOF'
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'packages/*/src/**/*.ts'
      - 'packages/*/src/**/*.tsx'

  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build docs
        run: |
          # For now, docs/ is the vault itself.
          # Once VitePress/Docusaurus is set up, replace with:
          # pnpm --filter docs build
          echo "Docs are in docs/ — deploying as static site"

      - name: Upload pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF
```

### 6.6 — Add required GitHub secrets

Run these locally to confirm the secrets are set (or note them to add in the repo settings):

```bash
# Check if NPM_TOKEN is set
gh secret list | grep NPM_TOKEN && echo "✅ NPM_TOKEN found" || echo "❌ Add NPM_TOKEN in repo settings → Secrets → Actions"

# Check GITHUB_TOKEN is auto-available (it is, no action needed)
echo "ℹ️  GITHUB_TOKEN is provided automatically by GitHub Actions"
```

**Secrets to add manually in GitHub → Settings → Secrets → Actions:**
- `NPM_TOKEN` — an npm Automation token (not Classic) with `publish:all` scope

---

## 7. Turbo Pipeline

### 7.1 — Create `turbo.json`

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "env": ["CI", "VITEST_*"]
    },
    "e2e": {
      "dependsOn": ["build"],
      "outputs": ["playwright-report/**"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
EOF
```

---

## 8. Git Hygiene

### 8.1 — Create `.gitignore`

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/
.turbo/

# Test outputs
coverage/
playwright-report/
test-results/

# Paseo
.paseo/

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
EOF
```

### 8.2 — Protect `main` branch

```bash
# Set branch protection rules via gh CLI
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["verify","e2e"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null

echo "✅ Branch protection enabled on main"
```

---

## 9. Final Verification

Run this complete checklist to confirm the system is ready for an overnight run:

```bash
#!/usr/bin/env bash
# final-check.sh — Run all checks. Every line must print ✅.

echo "=== SYSTEM READINESS CHECK ==="

# 1. Tools
node --version  | grep -q "v2[0-9]" && echo "✅ Node >= 20" || echo "❌ Node version"
pnpm --version  | grep -q "^9\|^10" && echo "✅ pnpm >= 9" || echo "❌ pnpm version"
claude --version 2>&1 | grep -qi "claude" && echo "✅ Claude Code installed" || echo "❌ Claude Code missing"
gh auth status 2>&1 | grep -q "Logged in" && echo "✅ GitHub CLI authenticated" || echo "❌ gh auth status"

# 2. Paseo
paseo status 2>&1 | grep -qi "running" && echo "✅ Paseo daemon running" || echo "❌ Paseo not running (run: paseo start)"
ls ~/.agents/skills/paseo 2>/dev/null && echo "✅ Paseo skills installed" || echo "❌ Skills missing (run: npx skills add getpaseo/paseo)"

# 3. Config files
[ -f paseo.json ]          && echo "✅ paseo.json present" || echo "❌ paseo.json missing"
[ -f CLAUDE.md ]           && echo "✅ CLAUDE.md present" || echo "❌ CLAUDE.md missing"
[ -f .claude/settings.json ] && echo "✅ Claude hooks configured" || echo "❌ .claude/settings.json missing"

# 4. Knowledge vault
[ -f docs/vault/index.html ]            && echo "✅ Vault index present" || echo "❌ Vault index missing"
[ -f docs/vault/phase-03-renderer.html ] && echo "✅ Phase 3 spec present" || echo "❌ Phase 3 spec missing"

# 5. GitHub Actions
[ -f .github/workflows/ci.yml ]      && echo "✅ CI workflow present" || echo "❌ CI workflow missing"
[ -f .github/workflows/release.yml ] && echo "✅ Release workflow present" || echo "❌ Release workflow missing"
[ -f .github/workflows/docs.yml ]    && echo "✅ Docs workflow present" || echo "❌ Docs workflow missing"

# 6. Branch protection
gh api repos/:owner/:repo/branches/main/protection 2>&1 | grep -q "required_status_checks" \
  && echo "✅ Branch protection active" || echo "⚠️  Branch protection not set"

# 7. Secrets
gh secret list 2>&1 | grep -q "NPM_TOKEN" \
  && echo "✅ NPM_TOKEN secret present" || echo "❌ NPM_TOKEN secret missing"

echo ""
echo "=== Done. Fix any ❌ items before the first overnight run. ==="
```

Run it:

```bash
bash final-check.sh
```

---

## 10. First Overnight Run — Kickoff Template

Once every check passes, use this command (from your phone via Paseo app or from terminal):

```bash
/paseo-epic --autopilot --worktree \
  "Build phase 3 (LiquidRenderer) end to end.
   Read /docs/vault/phase-03-renderer.html for the complete spec.
   Gate every commit on: pnpm -w run typecheck && pnpm -w run lint && pnpm -w run test.
   Use conventional commits. Add a changeset file after each feat/fix.
   When all acceptance criteria pass, push the branch and open a DRAFT PR titled 'feat(renderer): implement LiquidRenderer [phase-3]'.
   Max time: 6 hours. Do not merge. Do not publish to npm."
```

**What to check in the morning:**
1. `paseo logs <agent-id>` — confirm it ran to completion, not stuck/errored
2. GitHub → Pull Requests → check the draft PR exists
3. CI tab on the PR — all checks green?
4. Review the diff for obvious issues (bundle size, missing tests, type errors)
5. If good: approve and merge the draft PR
6. If bad: `paseo worktree archive <id>` and read the logs to understand what failed

---

*This document was generated for the `liquid-ai-editor` project. Keep it updated as the project evolves.*
