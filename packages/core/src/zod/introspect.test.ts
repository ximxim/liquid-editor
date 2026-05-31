import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { introspectSchema } from './introspect.js'

describe('introspectSchema', () => {
  it('identifies required and optional flat fields', () => {
    const schema = z.object({
      title: z.string(),
      description: z.string().optional(),
    })
    const info = introspectSchema(schema)

    const requiredNames = info.required.map((f) => f.name)
    const optionalNames = info.optional.map((f) => f.name)

    expect(requiredNames).toContain('title')
    expect(optionalNames).toContain('description')
    expect(requiredNames).not.toContain('description')
    expect(optionalNames).not.toContain('title')
  })

  it('captures correct type for string field', () => {
    const schema = z.object({ name: z.string() })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'name')
    expect(field?.type).toBe('string')
    expect(field?.isArray).toBe(false)
  })

  it('captures correct type for number field', () => {
    const schema = z.object({ price: z.number() })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'price')
    expect(field?.type).toBe('number')
  })

  it('captures correct type for boolean field', () => {
    const schema = z.object({ active: z.boolean() })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'active')
    expect(field?.type).toBe('boolean')
  })

  it('captures enum values', () => {
    const schema = z.object({ status: z.enum(['active', 'draft', 'archived']) })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'status')
    expect(field?.type).toBe('enum')
    expect(field?.enumValues).toEqual(['active', 'draft', 'archived'])
  })

  it('captures isArray for array field', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'tags')
    expect(field?.isArray).toBe(true)
    expect(field?.type).toBe('string')
  })

  it('captures nested object structure', () => {
    const schema = z.object({
      product: z.object({ price: z.number(), name: z.string() }),
    })
    const info = introspectSchema(schema)
    const productField = info.required.find((f) => f.name === 'product')
    expect(productField?.type).toBe('object')
    expect(productField?.children).toBeDefined()
    const children = productField?.children ?? []
    const childNames = children.map((c) => c.name)
    expect(childNames).toContain('price')
    expect(childNames).toContain('name')
  })

  it('captures description from .describe()', () => {
    const schema = z.object({
      email: z.string().describe('User email address'),
    })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'email')
    expect(field?.description).toBe('User email address')
  })

  it('handles optional nested object', () => {
    const schema = z.object({
      meta: z.object({ author: z.string() }).optional(),
    })
    const info = introspectSchema(schema)
    const field = info.optional.find((f) => f.name === 'meta')
    expect(field).toBeDefined()
    expect(field?.type).toBe('object')
  })

  it('handles array of objects', () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.number(), label: z.string() })),
    })
    const info = introspectSchema(schema)
    const field = info.required.find((f) => f.name === 'items')
    expect(field?.isArray).toBe(true)
    expect(field?.type).toBe('object')
    const children = field?.children ?? []
    const childNames = children.map((c) => c.name)
    expect(childNames).toContain('id')
    expect(childNames).toContain('label')
  })

  it('includes jsonSchema property', () => {
    const schema = z.object({ name: z.string() })
    const info = introspectSchema(schema)
    expect(info.jsonSchema).toBeDefined()
    expect(typeof info.jsonSchema).toBe('object')
    // jsonSchema should have properties
    expect((info.jsonSchema as Record<string, unknown>)['properties']).toBeDefined()
  })

  it('handles schema with multiple required and optional fields', () => {
    const schema = z.object({
      title: z.string(),
      price: z.number(),
      description: z.string().optional(),
      image: z.string().url().optional(),
    })
    const info = introspectSchema(schema)
    const requiredNames = info.required.map((f) => f.name)
    const optionalNames = info.optional.map((f) => f.name)
    expect(requiredNames).toEqual(expect.arrayContaining(['title', 'price']))
    expect(optionalNames).toEqual(expect.arrayContaining(['description', 'image']))
  })
})
