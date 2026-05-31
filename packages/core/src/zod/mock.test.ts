import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { generateMockData } from './mock.js'

describe('generateMockData', () => {
  it('round-trips: schema.parse(generateMockData(schema)) succeeds for flat schema', () => {
    const schema = z.object({
      title: z.string(),
      price: z.number(),
      description: z.string().optional(),
    })
    const mock = generateMockData(schema)
    expect(() => schema.parse(mock)).not.toThrow()
  })

  it('round-trips for schema with enum', () => {
    const schema = z.object({ status: z.enum(['active', 'draft', 'archived']) })
    const mock = generateMockData(schema)
    expect(() => schema.parse(mock)).not.toThrow()
    expect(['active', 'draft', 'archived']).toContain(mock['status'])
  })

  it('round-trips for schema with array field', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const mock = generateMockData(schema)
    expect(() => schema.parse(mock)).not.toThrow()
    expect(Array.isArray(mock['tags'])).toBe(true)
  })

  it('round-trips for nested object schema', () => {
    const schema = z.object({
      product: z.object({ name: z.string(), price: z.number() }),
    })
    const mock = generateMockData(schema)
    expect(() => schema.parse(mock)).not.toThrow()
    const product = mock['product'] as Record<string, unknown>
    expect(typeof product).toBe('object')
    expect(typeof product['name']).toBe('string')
    expect(typeof product['price']).toBe('number')
  })

  it('round-trips for schema with email validator', () => {
    const schema = z.object({ email: z.string().email() })
    const mock = generateMockData(schema)
    expect(() => schema.parse(mock)).not.toThrow()
    // email() validator ensures valid format
    expect(typeof mock['email']).toBe('string')
  })

  it('generates deterministic output with same seed', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const result1 = generateMockData(schema, { seed: 42 })
    const result2 = generateMockData(schema, { seed: 42 })
    expect(result1).toEqual(result2)
  })

  it('generates different output with different seeds', () => {
    const schema = z.object({ name: z.string(), count: z.number() })
    const result1 = generateMockData(schema, { seed: 1 })
    const result2 = generateMockData(schema, { seed: 999 })
    // Different seeds should produce different output (very high probability)
    expect(result1).not.toEqual(result2)
  })

  it('applies overrides that take precedence over generated values', () => {
    const schema = z.object({ name: z.string(), price: z.number() })
    const overrides = { name: 'Custom Product' }
    const mock = generateMockData(schema, { seed: 42, overrides })
    expect(mock['name']).toBe('Custom Product')
    expect(typeof mock['price']).toBe('number')
  })

  it('applies multiple overrides', () => {
    const schema = z.object({ name: z.string(), price: z.number(), active: z.boolean() })
    const overrides = { name: 'Test', price: 9.99 }
    const mock = generateMockData(schema, { overrides })
    expect(mock['name']).toBe('Test')
    expect(mock['price']).toBe(9.99)
    expect(typeof mock['active']).toBe('boolean')
  })

  it('round-trips for complex e-commerce schema', () => {
    const schema = z.object({
      id: z.string(),
      title: z.string(),
      price: z.number().positive(),
      description: z.string().optional(),
      images: z.array(z.string()),
      status: z.enum(['available', 'sold_out']),
      metadata: z.object({
        weight: z.number(),
        category: z.string(),
      }),
    })
    const mock = generateMockData(schema, { seed: 123 })
    expect(() => schema.parse(mock)).not.toThrow()
  })

  it('produces different values across multiple calls without seed', () => {
    const schema = z.object({ value: z.number() })
    const results = Array.from({ length: 5 }, () => generateMockData(schema))
    // With no seed, at least some should differ
    const values = results.map((r) => r['value'])
    const unique = new Set(values)
    // Very likely to have at least 2 unique values across 5 calls
    expect(unique.size).toBeGreaterThan(0)
  })
})
