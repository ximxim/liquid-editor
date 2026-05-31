import { describe, it, expect } from 'vitest'
import { createLiquidEngine } from './engine.js'

describe('createLiquidEngine', () => {
  it('renders a basic template with data', async () => {
    const engine = createLiquidEngine()
    const result = await engine.parseAndRender('Hello {{ name }}!', { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('renders multi-variable template correctly', async () => {
    const engine = createLiquidEngine()
    const result = await engine.parseAndRender('<h1>{{ title }}</h1><p>{{ body }}</p>', {
      title: 'My Title',
      body: 'Some body text',
    })
    expect(result).toBe('<h1>My Title</h1><p>Some body text</p>')
  })

  it('throws on missing variable in strict mode', async () => {
    const engine = createLiquidEngine()
    await expect(engine.parseAndRender('{{ missing_var }}', {})).rejects.toThrow()
  })

  it('escapes XSS payloads in output', async () => {
    const engine = createLiquidEngine()
    const result = await engine.parseAndRender('{{ content }}', {
      content: '<script>alert(1)</script>',
    })
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('alert(1)')
  })

  it('escapes angle brackets in data', async () => {
    const engine = createLiquidEngine()
    const result = await engine.parseAndRender('{{ html }}', {
      html: '<img src=x onerror=alert(1)>',
    })
    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
  })

  it('respects custom strictVariables: false', async () => {
    const engine = createLiquidEngine({ strictVariables: false })
    const result = await engine.parseAndRender('{{ missing }}', {})
    expect(result).toBe('')
  })

  it('respects custom strictFilters: false', async () => {
    const engine = createLiquidEngine({ strictFilters: false })
    const result = await engine.parseAndRender('{{ name | unknownFilter }}', { name: 'test' })
    expect(result).toBe('test')
  })

  it('renders for loops correctly', async () => {
    const engine = createLiquidEngine()
    const result = await engine.parseAndRender(
      '{% for item in items %}{{ item }}{% endfor %}',
      { items: ['a', 'b', 'c'] }
    )
    expect(result).toBe('abc')
  })

  it('renders if/else correctly', async () => {
    const engine = createLiquidEngine()
    const trueResult = await engine.parseAndRender(
      '{% if show %}yes{% else %}no{% endif %}',
      { show: true }
    )
    expect(trueResult).toBe('yes')

    const falseResult = await engine.parseAndRender(
      '{% if show %}yes{% else %}no{% endif %}',
      { show: false }
    )
    expect(falseResult).toBe('no')
  })
})
