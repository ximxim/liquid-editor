import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { buildSystemPrompt } from './system-prompt'

vi.mock('@liquid-ai/core', () => ({
  introspectSchema: vi.fn((schema) => {
    // Simple mock that returns field info based on shape
    const shape = (schema as { shape?: Record<string, unknown> }).shape ?? {}
    const required = Object.keys(shape).map((name) => ({ name, type: 'string', isArray: false }))
    return {
      required,
      optional: [],
      jsonSchema: {
        type: 'object',
        properties: Object.fromEntries(Object.keys(shape).map((k) => [k, { type: 'string' }])),
        required: Object.keys(shape),
      },
    }
  }),
}))

describe('buildSystemPrompt', () => {
  it('includes role description', () => {
    const schema = z.object({ title: z.string() })
    const result = buildSystemPrompt(schema)
    expect(result).toContain('You are a Liquid template builder. You generate and edit Liquid templates.')
  })

  it('includes template and explanation in output format spec', () => {
    const schema = z.object({ title: z.string() })
    const result = buildSystemPrompt(schema)
    expect(result).toContain('"template"')
    expect(result).toContain('"explanation"')
  })

  it('includes required field names from schema', () => {
    const schema = z.object({ title: z.string(), price: z.number() })
    const result = buildSystemPrompt(schema)
    expect(result).toContain('title')
    expect(result).toContain('price')
  })

  it('includes the customPrompt when provided', () => {
    const schema = z.object({ title: z.string() })
    const result = buildSystemPrompt(schema, 'Always use dark mode styles.')
    expect(result).toContain('Always use dark mode styles.')
  })

  it('does not include additional instructions section when customPrompt is omitted', () => {
    const schema = z.object({ title: z.string() })
    const result = buildSystemPrompt(schema)
    expect(result).not.toContain('Additional Instructions')
  })

  it('includes few-shot examples', () => {
    const schema = z.object({ title: z.string() })
    const result = buildSystemPrompt(schema)
    expect(result).toContain('product card')
    expect(result).toContain('dark theme')
  })
})
