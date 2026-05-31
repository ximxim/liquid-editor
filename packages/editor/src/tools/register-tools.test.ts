import { describe, it, expect, vi } from 'vitest'
import {
  ParameterSliderReceiptSchema,
  QuestionFlowReceiptSchema,
  PreferencesPanelReceiptSchema,
} from '@liquid-ai/tool-ui'

vi.mock('@assistant-ui/react', () => ({
  makeAssistantToolUI: vi.fn(
    (tool: { toolName: string; render: unknown }) => {
      const Component = Object.assign(() => null, { unstable_tool: tool })
      return Component
    },
  ),
}))

vi.mock('@liquid-ai/tool-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@liquid-ai/tool-ui')>()
  return {
    ...actual,
    ParameterSlider: () => null,
    QuestionFlow: () => null,
    PreferencesPanel: () => null,
  }
})

const { registerTools } = await import('./register-tools.js')

describe('register-tools', () => {
  describe('tool registrations export expected toolNames', () => {
    it('AdjustParameterToolUI has toolName adjust_parameter', () => {
      const [AdjustParameterToolUI] = registerTools()
      expect(AdjustParameterToolUI.unstable_tool.toolName).toBe('adjust_parameter')
    })

    it('AskQuestionToolUI has toolName ask_question', () => {
      const [, AskQuestionToolUI] = registerTools()
      expect(AskQuestionToolUI.unstable_tool.toolName).toBe('ask_question')
    })

    it('ConfigurePreferencesToolUI has toolName configure_preferences', () => {
      const [, , ConfigurePreferencesToolUI] = registerTools()
      expect(ConfigurePreferencesToolUI.unstable_tool.toolName).toBe('configure_preferences')
    })
  })

  describe('tool schemas validate their receipts', () => {
    it('ParameterSlider receipt validates correctly', () => {
      const receipt = ParameterSliderReceiptSchema.parse({ value: 42 })
      expect(receipt).toEqual({ value: 42 })
    })

    it('QuestionFlow receipt validates correctly', () => {
      const receipt = QuestionFlowReceiptSchema.parse({ selectedId: 'option-1' })
      expect(receipt).toEqual({ selectedId: 'option-1' })
    })

    it('PreferencesPanel receipt validates correctly', () => {
      const receipt = PreferencesPanelReceiptSchema.parse({
        values: { fontSize: 16, bold: true, family: 'serif' },
      })
      expect(receipt.values['fontSize']).toBe(16)
      expect(receipt.values['bold']).toBe(true)
    })
  })
})
