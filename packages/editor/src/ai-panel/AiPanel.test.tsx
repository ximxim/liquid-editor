import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { z } from 'zod'
import { AiPanel } from './AiPanel'
import { EditorContextProvider } from '../context/EditorContext'

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

describe('AiPanel', () => {
  it('renders AI Assistant heading', () => {
    renderPanel()
    expect(screen.getByText('AI Assistant')).toBeDefined()
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
})
