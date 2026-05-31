import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleAssistantResponse } from './template-handler'

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
})
