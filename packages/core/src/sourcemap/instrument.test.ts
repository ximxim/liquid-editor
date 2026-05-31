import { describe, it, expect } from 'vitest'
import { createLiquidEngine } from '../liquid/engine.js'
import { instrumentTemplate, mapDomLocToSource } from './instrument.js'

async function render(template: string, data: Record<string, unknown>): Promise<string> {
  const engine = createLiquidEngine({ strictVariables: false })
  return engine.parseAndRender(template, data)
}

describe('instrumentTemplate', () => {
  it('returns empty string unchanged', () => {
    expect(instrumentTemplate('')).toBe('')
  })

  it('returns whitespace-only template unchanged', () => {
    expect(instrumentTemplate('   ')).toBe('   ')
  })

  it('returns HTML-only template unchanged', () => {
    const tmpl = '<p>Hello world</p>'
    expect(instrumentTemplate(tmpl)).toBe(tmpl)
  })

  it('wraps simple variable output with data-loc span', () => {
    const tmpl = '{{ title }}'
    const instrumented = instrumentTemplate(tmpl)
    expect(instrumented).toContain('data-loc="0:11"')
    expect(instrumented).toContain('{{ title }}')
  })

  it('data-loc span renders correctly', async () => {
    const tmpl = '{{ title }}'
    const instrumented = instrumentTemplate(tmpl)
    const rendered = await render(instrumented, { title: 'Hello' })
    expect(rendered).toContain('data-loc="0:11"')
    expect(rendered).toContain('Hello')
  })

  it('wraps variable inside HTML', () => {
    const tmpl = '<h1>{{ title }}</h1>'
    const instrumented = instrumentTemplate(tmpl)
    expect(instrumented).toContain('data-loc="4:15"')
    expect(instrumented).toContain('{{ title }}')
  })

  it('handles multiple variables with correct offsets', () => {
    // '{{ first }} {{ last }}'
    //  0         11 12       22
    const tmpl = '{{ first }} {{ last }}'
    const instrumented = instrumentTemplate(tmpl)
    expect(instrumented).toContain('data-loc="0:11"')
    expect(instrumented).toContain('data-loc="12:22"')
  })

  it('renders multiple variables correctly after instrumentation', async () => {
    const tmpl = '{{ first }} {{ last }}'
    const instrumented = instrumentTemplate(tmpl)
    const rendered = await render(instrumented, { first: 'John', last: 'Doe' })
    expect(rendered).toContain('John')
    expect(rendered).toContain('Doe')
    expect(rendered).toContain('data-loc="0:11"')
    expect(rendered).toContain('data-loc="12:22"')
  })

  it('instruments variable inside for loop body', () => {
    // '{% for item in items %}{{ item }}{% endfor %}'
    //  0                     23        33
    const tmpl = '{% for item in items %}{{ item }}{% endfor %}'
    const instrumented = instrumentTemplate(tmpl)
    expect(instrumented).toContain('data-loc="23:33"')
    expect(instrumented).toContain('{{ item }}')
  })

  it('renders for loop body with data-loc after instrumentation', async () => {
    const tmpl = '{% for item in items %}{{ item }}{% endfor %}'
    const instrumented = instrumentTemplate(tmpl)
    const rendered = await render(instrumented, { items: ['apple', 'banana'] })
    expect(rendered).toContain('data-loc="23:33"')
    expect(rendered).toContain('apple')
    expect(rendered).toContain('banana')
  })

  it('instruments variable inside if block', () => {
    // '{% if show %}{{ msg }}{% endif %}'
    //  0           13       22
    const tmpl = '{% if show %}{{ msg }}{% endif %}'
    const instrumented = instrumentTemplate(tmpl)
    expect(instrumented).toContain('data-loc="13:22"')
    expect(instrumented).toContain('{{ msg }}')
  })

  it('renders if block variable with data-loc', async () => {
    const tmpl = '{% if show %}{{ msg }}{% endif %}'
    const instrumented = instrumentTemplate(tmpl)
    const rendered = await render(instrumented, { show: true, msg: 'Hello' })
    expect(rendered).toContain('data-loc="13:22"')
    expect(rendered).toContain('Hello')
  })

  it('instruments multiple variables inside for loop', () => {
    // '{% for item in items %}{{ item.name }} - {{ item.price }}{% endfor %}'
    //  0                     23             38  41             57
    const tmpl = '{% for item in items %}{{ item.name }} - {{ item.price }}{% endfor %}'
    const instrumented = instrumentTemplate(tmpl)
    expect(instrumented).toContain('data-loc="23:38"')
    expect(instrumented).toContain('data-loc="41:57"')
  })

  it('instruments variable with filter', () => {
    // '{{ price | money }}' - 19 chars
    const tmpl = '{{ price | money }}'
    const instrumented = instrumentTemplate(tmpl)
    // begin=0, end=19
    expect(instrumented).toContain('data-loc="0:19"')
  })

  it('instruments nested if inside for loop', () => {
    const tmpl = '{% for item in items %}{% if item.active %}{{ item.name }}{% endif %}{% endfor %}'
    const instrumented = instrumentTemplate(tmpl)
    // {{ item.name }} starts at 42: {% for item in items %}{% if item.active %}
    // '{% for item in items %}' = 23
    // '{% if item.active %}' = 20
    // so {{ item.name }} begins at 43
    expect(instrumented).toContain('data-loc=')
    expect(instrumented).toContain('{{ item.name }}')
  })
})

describe('mapDomLocToSource', () => {
  it('returns correct SourceRange for simple variable', () => {
    const tmpl = '{{ title }}'
    const range = mapDomLocToSource('0:11', tmpl)
    expect(range.start).toBe(0)
    expect(range.end).toBe(11)
    expect(range.snippet).toBe('{{ title }}')
  })

  it('returns correct SourceRange for variable inside HTML', () => {
    const tmpl = '<h1>{{ title }}</h1>'
    const range = mapDomLocToSource('4:15', tmpl)
    expect(range.start).toBe(4)
    expect(range.end).toBe(15)
    expect(range.snippet).toBe('{{ title }}')
  })

  it('returns correct SourceRange for second variable', () => {
    const tmpl = '{{ first }} {{ last }}'
    const range = mapDomLocToSource('12:22', tmpl)
    expect(range.start).toBe(12)
    expect(range.end).toBe(22)
    expect(range.snippet).toBe('{{ last }}')
  })

  it('round-trips: instrumentTemplate → render → mapDomLocToSource → correct snippet', async () => {
    const tmpl = '<p>{{ greeting }}</p>'
    const instrumented = instrumentTemplate(tmpl)
    const rendered = await render(instrumented, { greeting: 'Hello World' })

    const match = rendered.match(/data-loc="(\d+:\d+)"/)
    expect(match).not.toBeNull()
    const locValue = match![1]!

    const range = mapDomLocToSource(locValue, tmpl)
    expect(range.snippet).toContain('{{ greeting }}')
  })
})
