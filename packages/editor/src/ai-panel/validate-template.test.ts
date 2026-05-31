import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validateRequiredFields } from './validate-template'

vi.mock('@liquid-ai/core', () => ({
  introspectSchema: vi.fn((schema) => {
    const shape = (schema as { shape?: Record<string, unknown> }).shape ?? {}
    const allKeys = Object.keys(shape)
    // For the test schema z.object({ title: z.string(), price: z.number() })
    // we treat all as required unless they're optional
    const required = allKeys
      .filter((k) => {
        const field = (shape as Record<string, { isOptional?: () => boolean }>)[k]
        return typeof field?.isOptional === 'function' ? !field.isOptional() : true
      })
      .map((name) => ({ name, type: 'string', isArray: false }))
    const optional = allKeys
      .filter((k) => {
        const field = (shape as Record<string, { isOptional?: () => boolean }>)[k]
        return typeof field?.isOptional === 'function' ? field.isOptional() : false
      })
      .map((name) => ({ name, type: 'string', isArray: false }))
    return {
      required,
      optional,
      jsonSchema: {},
    }
  }),
}))

describe('validateRequiredFields', () => {
  it('all required fields present returns valid with empty missing list', () => {
    const schema = z.object({ title: z.string(), price: z.number() })
    const template = '<h2>{{ title }}</h2><p>{{ price }}</p>'
    const result = validateRequiredFields(template, schema)

    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('one field missing returns invalid with that field in missing list', () => {
    const schema = z.object({ title: z.string(), price: z.number() })
    const template = '<h2>{{ title }}</h2>'
    const result = validateRequiredFields(template, schema)

    expect(result.valid).toBe(false)
    expect(result.missing).toContain('price')
  })

  it('optional fields are not required', () => {
    const schema = z.object({ title: z.string(), subtitle: z.string().optional() })
    const template = '<h2>{{ title }}</h2>'
    const result = validateRequiredFields(template, schema)

    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('recognizes field used with a Liquid filter', () => {
    const schema = z.object({ title: z.string() })
    const template = '<h2>{{ title | upcase }}</h2>'
    const result = validateRequiredFields(template, schema)

    expect(result.valid).toBe(true)
  })
})
