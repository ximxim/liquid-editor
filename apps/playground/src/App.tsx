import { z } from 'zod'
import { LiquidRenderer } from '@liquid-ai/renderer'

const schema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number(),
  on_sale: z.boolean().optional(),
  image_url: z.string().url().optional(),
})

const template = `
<div style="font-family: sans-serif; max-width: 400px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
  <h2 style="margin: 0 0 8px; font-size: 1.25rem;">{{ title }}</h2>
  <p style="color: #6b7280; font-size: 0.875rem; margin: 0 0 12px;">{{ description }}</p>
  <div style="display: flex; align-items: baseline; gap: 8px;">
    <span style="font-size: 1.5rem; font-weight: bold;">\${{ price }}</span>
    {% if on_sale %}<span style="color: #ef4444; font-size: 0.875rem;">SALE</span>{% endif %}
  </div>
  {% if image_url %}<img src="{{ image_url }}" alt="{{ title }}" style="width: 100%; border-radius: 4px; margin-top: 16px;">{% endif %}
</div>
`

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1 data-testid="harness-status">harness-ok</h1>
      <h2>Product Card Preview</h2>
      <LiquidRenderer template={template} schema={schema} />
    </main>
  )
}
