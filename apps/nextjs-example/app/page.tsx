'use client'

import dynamic from 'next/dynamic'
import { z } from 'zod'

const LiquidRenderer = dynamic(
  () => import('@liquid-ai/renderer').then((mod) => ({ default: mod.LiquidRenderer })),
  { ssr: false }
)

const schema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number(),
})

const template = `
<div style="font-family: sans-serif; max-width: 400px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="margin: 0 0 8px;">{{ title }}</h2>
  <p style="color: #6b7280; margin: 0 0 12px;">{{ description }}</p>
  <span style="font-size: 1.5rem; font-weight: bold;">\${{ price }}</span>
</div>
`

export default function Page() {
  return <LiquidRenderer template={template} schema={schema} />
}
