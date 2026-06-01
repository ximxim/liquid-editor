import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { z } from 'zod'
import { AiPanel } from './AiPanel'
import { EditorContextProvider, useEditorContext } from '../context/EditorContext'
import type { SelectedElementInfo } from '../context/EditorContext'

const { mockSetText, mockSend } = vi.hoisted(() => ({
  mockSetText: vi.fn(),
  mockSend: vi.fn(),
}))

vi.mock('../tools/register-tools.js', () => ({
  registerTools: () => [() => null, () => null, () => null] as const,
}))

vi.mock('@liquid-ai/core', () => ({
  introspectSchema: vi.fn(() => ({ required: [], optional: [], jsonSchema: {} })),
  generateMockData: vi.fn(() => ({})),
  createLiquidEngine: vi.fn(() => ({ parse: vi.fn() })),
}))

vi.mock('@liquid-ai/runtime-webllm', () => ({
  WebLLMAdapter: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    run: async function* () { yield { content: [] } },
  })),
  isWebGPUAvailable: vi.fn(() => false),
  ModelLoadProgress: () =>
    React.createElement('div', { 'data-testid': 'model-load-progress' }, 'Loading...'),
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
  useComposerRuntime: vi.fn(() => ({
    setText: mockSetText,
    send: mockSend,
  })),
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

const schema = z.object({ title: z.string() })

afterEach(cleanup)

function renderPanel() {
  return render(
    <EditorContextProvider template="" schema={schema}>
      <AiPanel />
    </EditorContextProvider>
  )
}

function renderPanelWithElement(element: SelectedElementInfo) {
  function Setter() {
    const { setSelectedElement } = useEditorContext()
    React.useEffect(() => {
      setSelectedElement(element)
    }, [setSelectedElement])
    return null
  }

  return render(
    <EditorContextProvider template="" schema={schema}>
      <Setter />
      <AiPanel />
    </EditorContextProvider>
  )
}

describe('AiPanel', () => {
  beforeEach(() => {
    mockSetText.mockClear()
    mockSend.mockClear()
  })

  it('renders AI Assistant heading', () => {
    renderPanel()
    expect(screen.getByText('AI Assistant')).toBeDefined()
  })

  it('root element has role="complementary" and aria-label="AI assistant"', () => {
    const { container } = renderPanel()
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('role')).toBe('complementary')
    expect(root.getAttribute('aria-label')).toBe('AI assistant')
  })

  it('shows WebGPU fallback message when WebGPU unavailable', () => {
    renderPanel()
    expect(screen.getByText(/WebGPU is required/)).toBeDefined()
  })

  it('shows composer input area when WebGPU is available', async () => {
    const { isWebGPUAvailable } = await import('@liquid-ai/runtime-webllm')
    vi.mocked(isWebGPUAvailable).mockReturnValue(true)

    await act(async () => {
      renderPanel()
    })

    expect(screen.getByTestId('composer')).toBeDefined()
  })

  it('suggestion chips render when selectedElement is set in context', async () => {
    const { isWebGPUAvailable } = await import('@liquid-ai/runtime-webllm')
    vi.mocked(isWebGPUAvailable).mockReturnValue(true)

    const element: SelectedElementInfo = {
      start: 0,
      end: 10,
      snippet: '<h1>test</h1>',
      loc: '0:10',
      tagName: 'h1',
      computedStyles: { padding: '0px', 'font-size': '24px', color: '#000' },
    }

    await act(async () => {
      renderPanelWithElement(element)
    })

    const chips = screen.getByTestId('suggestion-chips')
    expect(chips).toBeDefined()
    expect(chips.querySelectorAll('button').length).toBeGreaterThan(0)
  })

  it('clicking a suggestion chip triggers a prompt send', async () => {
    const { isWebGPUAvailable } = await import('@liquid-ai/runtime-webllm')
    vi.mocked(isWebGPUAvailable).mockReturnValue(true)

    const element: SelectedElementInfo = {
      start: 0,
      end: 10,
      snippet: '<h1>test</h1>',
      loc: '0:10',
      tagName: 'h1',
      computedStyles: { padding: '0px', 'font-size': '24px', color: '#000' },
    }

    await act(async () => {
      renderPanelWithElement(element)
    })

    const chips = screen.getByTestId('suggestion-chips')
    const firstChip = chips.querySelector('button')
    expect(firstChip).toBeDefined()

    await act(async () => {
      fireEvent.click(firstChip!)
    })

    expect(mockSetText).toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalled()
  })
})
