# Liquid AI Editor

An open-source, client-side, AI-powered [Liquid](https://liquidjs.com/) template editor for React. Mount it as a JSX component — WebLLM runs entirely in the browser, zero server dependency required.

```tsx
import { LiquidEditor } from '@liquid-ai/editor'
import { z } from 'zod'

const schema = z.object({
  title: z.string(),
  price: z.number(),
  on_sale: z.boolean().optional(),
})

const template = `
<div>
  <h1>{{ title }}</h1>
  <p>${{ price }}</p>
  {% if on_sale %}<span>SALE</span>{% endif %}
</div>
`

function App() {
  return (
    <LiquidEditor
      template={template}
      schema={schema}
      onSave={(updatedTemplate) => console.log(updatedTemplate)}
    />
  )
}
```

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props Reference](#props-reference)
  - [LiquidEditor](#liquideditor-props)
  - [LiquidRenderer](#liquidrenderer-props)
- [Package Map](#package-map)
- [Architecture Overview](#architecture-overview)
- [Browser Requirements](#browser-requirements)
- [Contributing](#contributing)

---

## Installation

```bash
npm install @liquid-ai/editor @liquid-ai/renderer
# or
pnpm add @liquid-ai/editor @liquid-ai/renderer
```

Peer dependencies you must install separately:

```bash
npm install react react-dom zod
```

---

## Quick Start

### Full editor with AI

```tsx
import { LiquidEditor } from '@liquid-ai/editor'
import { z } from 'zod'

const productSchema = z.object({
  title: z.string().describe('Product name'),
  description: z.string().describe('Short product description'),
  price: z.number().describe('Price in USD'),
  on_sale: z.boolean().optional().describe('Whether the product is on sale'),
  image_url: z.string().url().optional().describe('Product image URL'),
})

const initialTemplate = `
<div style="font-family: sans-serif; max-width: 400px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
  <h2 style="margin: 0 0 8px; font-size: 1.25rem;">{{ title }}</h2>
  <p style="color: #6b7280; font-size: 0.875rem;">{{ description }}</p>
  <div style="display: flex; align-items: baseline; gap: 8px;">
    <span style="font-size: 1.5rem; font-weight: bold;">${{ price }}</span>
    {% if on_sale %}<span style="color: #ef4444;">SALE</span>{% endif %}
  </div>
  {% if image_url %}
    <img src="{{ image_url }}" alt="{{ title }}" style="width: 100%; border-radius: 4px; margin-top: 16px;">
  {% endif %}
</div>
`

export function TemplateEditor() {
  function handleSave(updatedTemplate: string) {
    // persist the template — e.g. send to your API
    console.log('Template saved:', updatedTemplate)
  }

  return (
    <div style={{ height: '100vh' }}>
      <LiquidEditor
        template={initialTemplate}
        schema={productSchema}
        onSave={handleSave}
      />
    </div>
  )
}
```

### Production renderer (no editor, no AI)

```tsx
import { LiquidRenderer } from '@liquid-ai/renderer'
import { z } from 'zod'

const schema = z.object({
  title: z.string(),
  price: z.number(),
})

export function ProductCard({ data }: { data: { title: string; price: number } }) {
  return (
    <LiquidRenderer
      template="<h2>{{ title }}</h2><p>${{ price }}</p>"
      schema={schema}
      data={data}
    />
  )
}
```

---

## Props Reference

### LiquidEditor Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `template` | `string` | Yes | Initial Liquid template string |
| `schema` | `ZodType` | Yes | Zod schema describing the template's data contract |
| `onSave` | `(template: string) => void` | Yes | Called when the user clicks "Save & Close" with the updated template |
| `systemPrompt` | `string` | No | Custom system prompt prepended to every AI request |
| `modelId` | `string` | No | Override the default WebLLM model ID (e.g. `"Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC"`) |
| `className` | `string` | No | CSS class name applied to the root editor container |

### LiquidRenderer Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `template` | `string` | Yes | Liquid template string to render |
| `schema` | `ZodType` | Yes | Zod schema for validation |
| `data` | `Record<string, unknown>` | No | Data object passed into the Liquid template |
| `onElementSelect` | `(loc: SourceRange) => void` | No | Called when the user clicks a rendered element (returns source range) |
| `className` | `string` | No | CSS class name applied to the renderer container |
| `instrumentSourceMap` | `boolean` | No | Enable `data-loc` attribute injection for source mapping (default: `false`) |

---

## Package Map

| Package | Size | Purpose |
|---------|------|---------|
| `@liquid-ai/core` | ~100 KB | Liquid engine, Zod introspection, mock data generation, PGlite persistence |
| `@liquid-ai/renderer` | ~50 KB | Production `<LiquidRenderer>` component — no AI, no editor UI |
| `@liquid-ai/editor` | ~500 KB | Full `<LiquidEditor>` with AI chat panel, code editor, and context pane |
| `@liquid-ai/tool-ui` | Small | AI tool UI components: `ParameterSlider`, `QuestionFlow`, `PreferencesPanel` |
| `@liquid-ai/runtime-webllm` | Small (+ model download) | WebLLM `ChatModelAdapter` — WebGPU inference in a Web Worker |

> **Note:** Bundle sizes listed are approximate gzipped sizes excluding the WebLLM model weights.
> Model weights (1.6 GB–5 GB) are downloaded and cached in the browser on first use.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer's React App                     │
│                                                             │
│  <LiquidEditor                   <LiquidRenderer            │
│    template={...}                  template="..."           │
│    schema={z.object(...)}          data={{...}}             │
│    onSave={fn}                     schema={z.object(...)}   │
│  />                              />                         │
└──────────────────────┬───────────────────────────────────────┘
                       │ internally uses
         ┌─────────────▼─────────────────────────────┐
         │  Editor Layout (80/20 split)               │
         │                                            │
         │  Workspace (80%)    AI Panel (20%)         │
         │  ┌─────────────┐   ┌────────────────────┐  │
         │  │ Preview tab │   │ assistant-ui Thread │  │
         │  │ Code tab    │   │ + tool-ui components│  │
         │  │ Context tab │   │                     │  │
         │  └─────────────┘   └────────┬────────────┘  │
         └───────────────────────────── │ ──────────────┘
                                        │
                               ┌────────▼────────┐
                               │  WebLLM Engine  │
                               │  (Web Worker)   │
                               │  WebGPU/WASM    │
                               └────────┬────────┘
                               ┌────────▼────────┐
                               │  PGlite         │
                               │  (IndexedDB)    │
                               │  sessions/ckpts │
                               └─────────────────┘
```

### Editor tabs

- **Preview** — Renders the Liquid template in a sandboxed iframe. Click any element to select it and focus the AI on that element.
- **Code** — CodeMirror 6 editor with Liquid syntax highlighting. Live-syncs with the preview.
- **Context** — JSON editor for the template's mock data, generated automatically from the Zod schema.

### AI Panel

The AI panel is powered by [assistant-ui](https://assistant-ui.com/) and communicates with the WebLLM engine running in a Web Worker. It surfaces:

- **Chat thread** — free-form conversation with the AI about your template
- **Suggestion chips** — context-aware suggestions based on the selected element
- **Tool UIs** — interactive controls the AI can invoke: `AdjustParameter`, `AskQuestion`, `ConfigurePreferences`
- **History** — browse past editing sessions

---

## Browser Requirements

| Feature | Requirement |
|---------|-------------|
| Core rendering | Any modern browser (Chrome 90+, Firefox 90+, Safari 15+) |
| AI chat (WebLLM) | WebGPU required — Chrome 113+, Edge 113+, or Safari 18+ |
| Persistence | IndexedDB (available in all modern browsers) |

If WebGPU is not available, the editor falls back gracefully: all editing features work, but the AI chat panel shows a message explaining that WebGPU is required.

To check WebGPU availability programmatically:

```ts
import { isWebGPUAvailable } from '@liquid-ai/runtime-webllm'

if (!isWebGPUAvailable()) {
  console.warn('AI features require a WebGPU-capable browser')
}
```

---

## Contributing

```bash
# Clone the repo
git clone https://github.com/your-org/liquid-ai-editor
cd liquid-ai-editor

# Install dependencies
pnpm install

# Start the playground app
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

The playground app at `apps/playground/` mounts a `<LiquidEditor>` with a sample product schema — it's the primary development target.

### Repository layout

```
packages/
  core/           @liquid-ai/core — engine, zod, sourcemap, persistence
  renderer/       @liquid-ai/renderer — production renderer component
  editor/         @liquid-ai/editor — full editor with AI panel
  tool-ui/        @liquid-ai/tool-ui — AI tool UI components
  runtime-webllm/ @liquid-ai/runtime-webllm — WebLLM adapter
apps/
  playground/     Vite dev app (primary dev surface)
  nextjs-example/ Next.js App Router integration example
tooling/
  tsconfig/       Shared TypeScript configs
  vitest/         Shared Vitest config
```

---

## License

MIT
