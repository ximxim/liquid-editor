import { describe, it, expect } from 'vitest'
import { generateSuggestions } from './suggestion-adapter'

describe('generateSuggestions', () => {
  it('returns 4 general suggestions when no element is selected', () => {
    const result = generateSuggestions(null)
    expect(result).toHaveLength(4)
    expect(result[0]?.displayLabel).toBe('Generate a new section')
    expect(result[1]?.displayLabel).toBe('Change the overall layout')
    expect(result[2]?.displayLabel).toBe('Add a header')
    expect(result[3]?.displayLabel).toBe('Improve typography')
  })

  it('always includes Adjust spacing and Change colors when element is selected', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'div',
      computedStyles: { padding: '16px', margin: '0px' },
    })
    const labels = result.map((s) => s.displayLabel)
    expect(labels).toContain('Adjust spacing')
    expect(labels).toContain('Change colors')
  })

  it('includes Change typography when element has font-size', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'p',
      computedStyles: { 'font-size': '14px', padding: '0px' },
    })
    const labels = result.map((s) => s.displayLabel)
    expect(labels).toContain('Change typography')
  })

  it('includes Change typography when element has color', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'span',
      computedStyles: { color: '#333', padding: '0px' },
    })
    const labels = result.map((s) => s.displayLabel)
    expect(labels).toContain('Change typography')
  })

  it('includes Update image when element is an img', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'img',
      computedStyles: {},
    })
    const labels = result.map((s) => s.displayLabel)
    expect(labels).toContain('Update image')
  })

  it('includes block element suggestions for div', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'div',
      computedStyles: { padding: '8px' },
    })
    const labels = result.map((s) => s.displayLabel)
    expect(labels).toContain('Add content below')
    expect(labels).toContain('Wrap in container')
  })

  it('includes button suggestions for a tag', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'a',
      computedStyles: {},
    })
    const labels = result.map((s) => s.displayLabel)
    expect(labels).toContain('Update link text')
    expect(labels).toContain('Style the button')
  })

  it('result length never exceeds 6', () => {
    const result = generateSuggestions({
      loc: '0:10',
      tagName: 'div',
      computedStyles: { 'font-size': '16px', color: '#000', padding: '8px' },
    })
    expect(result.length).toBeLessThanOrEqual(6)
  })

  it('each suggestion has a prompt and displayLabel', () => {
    const result = generateSuggestions(null)
    for (const s of result) {
      expect(typeof s.prompt).toBe('string')
      expect(s.prompt.length).toBeGreaterThan(0)
      expect(typeof s.displayLabel).toBe('string')
      expect(s.displayLabel.length).toBeGreaterThan(0)
    }
  })
})
