import { useRef, useCallback } from 'react'
import { makeAssistantToolUI } from '@assistant-ui/react'
import { ParameterSlider, QuestionFlow, PreferencesPanel } from '@liquid-ai/tool-ui'
import type {
  ParameterSliderArgs,
  ParameterSliderReceipt,
  QuestionFlowArgs,
  QuestionFlowReceipt,
  PreferencesPanelArgs,
  PreferencesPanelReceipt,
} from '@liquid-ai/tool-ui'

const DEBOUNCE_MS = 200

// Tool UIs are created inside registerTools() rather than at module top-level so
// that makeAssistantToolUI is only called after the module is fully initialised —
// avoids mock-hoisting races in Vitest when @assistant-ui/react is mocked.
export function registerTools() {
  const AdjustParameterToolUI = makeAssistantToolUI<ParameterSliderArgs, ParameterSliderReceipt>({
    toolName: 'adjust_parameter',
    render: function AdjustParameterRender({ args, addResult }) {
      const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
      const addResultRef = useRef(addResult)
      addResultRef.current = addResult

      const handleChange = useCallback((receipt: ParameterSliderReceipt) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          addResultRef.current(receipt)
        }, DEBOUNCE_MS)
      }, [])

      return <ParameterSlider {...args} onChange={handleChange} />
    },
  })

  const AskQuestionToolUI = makeAssistantToolUI<QuestionFlowArgs, QuestionFlowReceipt>({
    toolName: 'ask_question',
    render: function AskQuestionRender({ args, addResult }) {
      return <QuestionFlow {...args} onChange={(receipt) => addResult(receipt)} />
    },
  })

  const ConfigurePreferencesToolUI = makeAssistantToolUI<
    PreferencesPanelArgs,
    PreferencesPanelReceipt
  >({
    toolName: 'configure_preferences',
    render: function ConfigurePreferencesRender({ args, addResult }) {
      return <PreferencesPanel {...args} onChange={(receipt) => addResult(receipt)} />
    },
  })

  return [AdjustParameterToolUI, AskQuestionToolUI, ConfigurePreferencesToolUI] as const
}
