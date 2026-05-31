import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { z } from 'zod'
import { RuntimeProvider } from './RuntimeProvider'

const { mockIsWebGPUAvailable, mockAdapterInit } = vi.hoisted(() => ({
  mockIsWebGPUAvailable: vi.fn(() => false),
  mockAdapterInit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@liquid-ai/core', () => ({
  introspectSchema: vi.fn(() => ({ required: [], optional: [], jsonSchema: {} })),
  generateMockData: vi.fn(() => ({})),
}))

vi.mock('@liquid-ai/runtime-webllm', () => ({
  WebLLMAdapter: vi.fn().mockImplementation(() => ({
    init: mockAdapterInit,
    destroy: vi.fn(),
    run: async function* () { yield { content: [] } },
  })),
  isWebGPUAvailable: () => mockIsWebGPUAvailable(),
  ModelLoadProgress: ({ text }: { modelId: string; progress: number; text?: string }) =>
    React.createElement('div', { 'data-testid': 'model-load-progress' }, text ?? 'Loading...'),
}))

vi.mock('@assistant-ui/react', () => ({
  useLocalRuntime: vi.fn(() => ({ type: 'local' })),
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'assistant-runtime-provider' }, children),
}))

vi.mock('./system-prompt.js', () => ({
  buildSystemPrompt: vi.fn(() => 'mocked system prompt'),
}))

const schema = z.object({ title: z.string() })

afterEach(cleanup)

describe('RuntimeProvider', () => {
  it('shows fallback message when WebGPU is unavailable', () => {
    mockIsWebGPUAvailable.mockReturnValue(false)

    render(
      <RuntimeProvider schema={schema}>
        <div data-testid="child">child</div>
      </RuntimeProvider>
    )

    expect(screen.queryByTestId('child')).toBeNull()
    expect(screen.getByText(/WebGPU is required/)).toBeDefined()
  })

  it('shows ModelLoadProgress during adapter init', async () => {
    mockIsWebGPUAvailable.mockReturnValue(true)
    let resolveInit!: () => void
    mockAdapterInit.mockImplementation(
      () => new Promise<void>((r) => { resolveInit = r }),
    )

    render(
      <RuntimeProvider schema={schema}>
        <div data-testid="child">child</div>
      </RuntimeProvider>
    )

    expect(screen.getByTestId('model-load-progress')).toBeDefined()
    expect(screen.queryByTestId('child')).toBeNull()

    await act(async () => {
      resolveInit()
    })

    expect(screen.queryByTestId('model-load-progress')).toBeNull()
  })

  it('renders children inside AssistantRuntimeProvider when ready', async () => {
    mockIsWebGPUAvailable.mockReturnValue(true)
    mockAdapterInit.mockResolvedValue(undefined)

    await act(async () => {
      render(
        <RuntimeProvider schema={schema}>
          <div data-testid="child">child</div>
        </RuntimeProvider>
      )
    })

    expect(screen.getByTestId('assistant-runtime-provider')).toBeDefined()
    expect(screen.getByTestId('child')).toBeDefined()
  })
})
