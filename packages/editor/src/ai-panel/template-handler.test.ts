import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleAssistantResponse, applyTargetedEdit } from './template-handler'

const mockParse = vi.fn()

vi.mock('@liquid-ai/core', () => ({
  createLiquidEngine: vi.fn(() => ({ parse: mockParse })),
}))

beforeEach(() => {
  mockParse.mockReset()
  mockParse.mockReturnValue([])
})

describe('handleAssistantResponse', () => {
  it('valid JSON with valid Liquid calls updateTemplate and returns success', () => {
    const updateTemplate = vi.fn()
    const response = JSON.stringify({
      template: '<p>{{ title }}</p>',
      explanation: 'Added a title paragraph.',
    })

    const result = handleAssistantResponse(response, updateTemplate)

    expect(result.success).toBe(true)
    expect(result.template).toBe('<p>{{ title }}</p>')
    expect(result.explanation).toBe('Added a title paragraph.')
    expect(updateTemplate).toHaveBeenCalledWith('<p>{{ title }}</p>')
  })

  it('valid JSON with invalid Liquid returns error and does NOT call updateTemplate', () => {
    const updateTemplate = vi.fn()
    mockParse.mockImplementation(() => {
      throw new Error('Unexpected tag: endif')
    })

    const response = JSON.stringify({
      template: '{% if %}{% endif %}',
      explanation: 'bad template',
    })

    const result = handleAssistantResponse(response, updateTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid Liquid')
    expect(updateTemplate).not.toHaveBeenCalled()
  })

  it('invalid JSON returns error', () => {
    const updateTemplate = vi.fn()
    const result = handleAssistantResponse('not valid json at all !!!', updateTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Could not parse AI response')
    expect(updateTemplate).not.toHaveBeenCalled()
  })

  it('json-repair recovers from slightly malformed JSON', () => {
    const updateTemplate = vi.fn()
    // Missing closing brace — json-repair can fix this
    const malformed = '{"template": "<p>{{ title }}</p>", "explanation": "ok"'
    const result = handleAssistantResponse(malformed, updateTemplate)

    expect(result.success).toBe(true)
    expect(updateTemplate).toHaveBeenCalledWith('<p>{{ title }}</p>')
  })

  it('returns error when parsed JSON lacks template field', () => {
    const updateTemplate = vi.fn()
    const result = handleAssistantResponse(JSON.stringify({ explanation: 'no template' }), updateTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Could not parse AI response')
    expect(updateTemplate).not.toHaveBeenCalled()
  })

  it('response with context_updates parses and returns them', () => {
    const updateTemplate = vi.fn()
    const response = JSON.stringify({
      template: '<p>{{ title }}</p>',
      explanation: 'Added title',
      context_updates: { subtitle: 'World', count: 3 },
    })

    const result = handleAssistantResponse(response, updateTemplate)

    expect(result.success).toBe(true)
    expect(result.contextUpdates).toEqual({ subtitle: 'World', count: 3 })
  })

  it('response without context_updates returns undefined contextUpdates', () => {
    const updateTemplate = vi.fn()
    const response = JSON.stringify({
      template: '<p>{{ title }}</p>',
      explanation: 'Added title',
    })

    const result = handleAssistantResponse(response, updateTemplate)

    expect(result.success).toBe(true)
    expect(result.contextUpdates).toBeUndefined()
  })
})

describe('applyTargetedEdit', () => {
  it('replaces the correct range in the template', () => {
    const template = '<div><h1>Hello</h1></div>'
    const result = applyTargetedEdit(
      template,
      { start: 5, end: 19, snippet: '<h1>Hello</h1>' },
      '<h1>World</h1>'
    )
    expect(result).toBe('<div><h1>World</h1></div>')
  })

  it('replaces from the start of the template', () => {
    const template = '<h1>Hello</h1> world'
    const result = applyTargetedEdit(
      template,
      { start: 0, end: 14, snippet: '<h1>Hello</h1>' },
      '<h2>Hi</h2>'
    )
    expect(result).toBe('<h2>Hi</h2> world')
  })

  it('replaces at the end of the template', () => {
    const template = 'Hello <span>world</span>'
    const result = applyTargetedEdit(
      template,
      { start: 6, end: 24, snippet: '<span>world</span>' },
      '<em>earth</em>'
    )
    expect(result).toBe('Hello <em>earth</em>')
  })

  it('returns original template when range start is out of bounds', () => {
    const template = '<p>test</p>'
    const result = applyTargetedEdit(
      template,
      { start: 100, end: 110, snippet: '' },
      'replacement'
    )
    expect(result).toBe(template)
  })

  it('returns original template when range end is out of bounds', () => {
    const template = '<p>test</p>'
    const result = applyTargetedEdit(
      template,
      { start: 0, end: 200, snippet: '' },
      'replacement'
    )
    expect(result).toBe(template)
  })

  it('returns original template when start > end', () => {
    const template = '<p>test</p>'
    const result = applyTargetedEdit(
      template,
      { start: 5, end: 2, snippet: '' },
      'replacement'
    )
    expect(result).toBe(template)
  })

  it('works with empty editedSnippet (deletes the range)', () => {
    const template = '<div>hello world</div>'
    const result = applyTargetedEdit(
      template,
      { start: 5, end: 10, snippet: 'hello' },
      ''
    )
    expect(result).toBe('<div> world</div>')
  })
})
