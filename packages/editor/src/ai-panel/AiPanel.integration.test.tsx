import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act, renderHook } from '@testing-library/react'
import { z } from 'zod'
import { LiquidEditor } from '../LiquidEditor'
import { EditorContextProvider, useEditorContext } from '../context/EditorContext'
import { handleAssistantResponse } from './template-handler'

vi.mock('../tools/register-tools.js', () => ({
  registerTools: () => [() => null, () => null, () => null] as const,
}))

vi.mock('@liquid-ai/core', () => ({
  introspectSchema: vi.fn(() => ({
    required: [{ name: 'title', type: 'string', isArray: false }],
    optional: [],
    jsonSchema: {},
  })),
  generateMockData: vi.fn(() => ({ title: 'Mock Title' })),
  createLiquidEngine: vi.fn(() => ({ parse: vi.fn() })),
}))

vi.mock('@liquid-ai/runtime-webllm', () => ({
  WebLLMAdapter: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    run: async function* () {
      yield {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              template: '<p>{{ title }}</p>',
              explanation: 'Added title',
            }),
          },
        ],
      }
    },
  })),
  isWebGPUAvailable: vi.fn(() => false),
  ModelLoadProgress: () => null,
}))

vi.mock('@assistant-ui/react', () => ({
  useLocalRuntime: vi.fn(() => ({ type: 'local' })),
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'runtime-provider' }, children),
  makeAssistantToolUI: vi.fn(
    (tool: { toolName: string; render: unknown }) => {
      const Component = Object.assign(() => null, { unstable_tool: tool })
      return Component
    },
  ),
  ThreadPrimitive: {
    Root: ({ children }: { children?: React.ReactNode; style?: React.CSSProperties }) =>
      React.createElement('div', { 'data-testid': 'thread-root' }, children),
    Viewport: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', null, children),
    Messages: () => null,
  },
  ComposerPrimitive: {
    Root: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('form', { 'data-testid': 'composer' }, children),
    Input: (props: React.InputHTMLAttributes<HTMLTextAreaElement>) =>
      React.createElement('textarea', { 'data-testid': 'composer-input', ...props }),
    Send: ({ children }: { children?: React.ReactNode; style?: React.CSSProperties }) =>
      React.createElement('button', { 'data-testid': 'composer-send' }, children),
  },
}))

vi.mock('@liquid-ai/tool-ui', () => ({
  ParameterSlider: () => null,
  QuestionFlow: () => null,
  PreferencesPanel: () => null,
}))

vi.mock('./system-prompt.js', () => ({
  buildSystemPrompt: vi.fn(() => 'mocked system prompt'),
}))

vi.mock('../workspace/PreviewPane.js', () => ({
  PreviewPane: () => React.createElement('div', { 'data-testid': 'preview-pane' }, 'Preview'),
}))

vi.mock('../workspace/CodePane.js', () => ({
  CodePane: () => React.createElement('div', { 'data-testid': 'code-pane' }, 'Code'),
}))

vi.mock('../workspace/ContextPane.js', () => ({
  ContextPane: () => React.createElement('div', { 'data-testid': 'context-pane' }, 'Context'),
}))

const MOCK_RESPONSE = JSON.stringify({
  template: '<p>{{ title }}</p>',
  explanation: 'Added title',
})

afterEach(cleanup)

const schema = z.object({ title: z.string() })

describe('AiPanel integration', () => {
  it('renders within LiquidEditor with all mocked dependencies', async () => {
    await act(async () => {
      render(
        <LiquidEditor template="<p>original</p>" schema={schema} onSave={vi.fn()} />,
      )
    })

    expect(screen.getByText('AI Assistant')).toBeDefined()
  })

  it('handleAssistantResponse updates EditorContext.template', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EditorContextProvider template="<p>original</p>" schema={schema}>
        {children}
      </EditorContextProvider>
    )

    const { result } = renderHook(() => useEditorContext(), { wrapper })

    expect(result.current.template).toBe('<p>original</p>')

    act(() => {
      handleAssistantResponse(MOCK_RESPONSE, result.current.updateTemplate)
    })

    expect(result.current.template).toBe('<p>{{ title }}</p>')
  })

  it('handleAssistantResponse returns success with explanation', () => {
    const updateTemplate = vi.fn()
    const result = handleAssistantResponse(MOCK_RESPONSE, updateTemplate)

    expect(result.success).toBe(true)
    expect(result.template).toBe('<p>{{ title }}</p>')
    expect(result.explanation).toBe('Added title')
    expect(updateTemplate).toHaveBeenCalledWith('<p>{{ title }}</p>')
  })

  it('invalid AI response does not update template', () => {
    const updateTemplate = vi.fn()
    const result = handleAssistantResponse('not valid json', updateTemplate)

    expect(result.success).toBe(false)
    expect(updateTemplate).not.toHaveBeenCalled()
  })
})
