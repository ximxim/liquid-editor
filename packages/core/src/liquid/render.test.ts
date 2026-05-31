import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { renderTemplate } from './render.js'

const productSchema = z.object({
  title: z.string(),
  price: z.number(),
  description: z.string().optional(),
})

describe('renderTemplate', () => {
  it('generates mock data and renders when no data provided', async () => {
    const template = '<h1>{{ title }}</h1><p>{{ price }}</p>'
    const result = await renderTemplate(template, productSchema)
    expect(result.html).toContain('<h1>')
    expect(result.html).toContain('</h1>')
    expect(result.errors).toHaveLength(0)
  })

  it('renders with provided valid data', async () => {
    const template = '<h1>{{ title }}</h1>'
    const data = { title: 'My Product', price: 29.99 }
    const result = await renderTemplate(template, productSchema, data)
    expect(result.html).toBe('<h1>My Product</h1>')
    expect(result.errors).toHaveLength(0)
  })

  it('escapes XSS in rendered html', async () => {
    const template = '{{ title }}'
    const data = { title: '<script>alert(1)</script>', price: 10 }
    const result = await renderTemplate(template, productSchema, data)
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('populates errors and renders fallback mock when data is invalid', async () => {
    const template = '<h1>{{ title }}</h1>'
    const invalidData = { title: 123, price: 'not-a-number' }
    const result = await renderTemplate(template, productSchema, invalidData as never)
    expect(result.errors.length).toBeGreaterThan(0)
    // Should still render with mock data fallback
    expect(result.html).toContain('<h1>')
  })

  it('instrumentedHtml contains data-loc attributes', async () => {
    const template = '{{ title }}'
    const data = { title: 'Hello', price: 10 }
    const result = await renderTemplate(template, productSchema, data)
    expect(result.instrumentedHtml).toContain('data-loc=')
  })

  it('html and instrumentedHtml both render the same content value', async () => {
    const template = '<p>{{ title }}</p>'
    const data = { title: 'Test Product', price: 5 }
    const result = await renderTemplate(template, productSchema, data)
    expect(result.html).toBe('<p>Test Product</p>')
    expect(result.instrumentedHtml).toContain('Test Product')
    expect(result.instrumentedHtml).toContain('data-loc=')
  })

  it('full pipeline: schema → mock → render produces HTML with data-loc', async () => {
    const schema = z.object({
      heading: z.string(),
      body: z.string(),
      count: z.number(),
    })
    const template = '<h1>{{ heading }}</h1><p>{{ body }}</p><span>{{ count }}</span>'
    const result = await renderTemplate(template, schema)
    expect(result.errors).toHaveLength(0)
    expect(result.html).toContain('<h1>')
    expect(result.html).toContain('<p>')
    expect(result.instrumentedHtml).toContain('data-loc=')
  })

  it('renders for loop with mock data', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    })
    const template = '{% for item in items %}{{ item.name }}{% endfor %}'
    const data = { items: [{ name: 'Apple' }, { name: 'Banana' }] }
    const result = await renderTemplate(template, schema, data)
    expect(result.html).toContain('Apple')
    expect(result.html).toContain('Banana')
    expect(result.errors).toHaveLength(0)
  })

  it('instrumentedHtml has data-loc on variables inside for loop', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    })
    const template = '{% for item in items %}{{ item.name }}{% endfor %}'
    const data = { items: [{ name: 'Apple' }] }
    const result = await renderTemplate(template, schema, data)
    expect(result.instrumentedHtml).toContain('data-loc=')
    expect(result.instrumentedHtml).toContain('Apple')
  })

  it('returns empty errors array for valid render', async () => {
    const schema = z.object({ text: z.string() })
    const template = '{{ text }}'
    const result = await renderTemplate(template, schema, { text: 'hello' })
    expect(result.errors).toEqual([])
  })
})
