import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider, useEditorContext } from './EditorContext'

const {
  mockInitDatabase,
  mockCreateSession,
  mockCreateCheckpoint,
  mockGetCheckpoints,
  mockRestoreCheckpoint,
} = vi.hoisted(() => ({
  mockInitDatabase: vi.fn().mockResolvedValue({ query: vi.fn(), exec: vi.fn() }),
  mockCreateSession: vi.fn().mockResolvedValue({ id: 'mock-session-id' }),
  mockCreateCheckpoint: vi.fn().mockResolvedValue({}),
  mockGetCheckpoints: vi.fn().mockResolvedValue([]),
  mockRestoreCheckpoint: vi.fn().mockResolvedValue({ template: '<p>restored</p>', data: {} }),
}))

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Mock Title', price: 9.99 })),
  initDatabase: mockInitDatabase,
  createSession: mockCreateSession,
  createCheckpoint: mockCreateCheckpoint,
  getCheckpoints: mockGetCheckpoints,
  restoreCheckpoint: mockRestoreCheckpoint,
}))

const schema = z.object({ title: z.string(), price: z.number() })

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mockInitDatabase.mockResolvedValue({ query: vi.fn(), exec: vi.fn() })
  mockCreateSession.mockResolvedValue({ id: 'mock-session-id' })
  mockCreateCheckpoint.mockResolvedValue({})
  mockGetCheckpoints.mockResolvedValue([])
  mockRestoreCheckpoint.mockResolvedValue({ template: '<p>restored</p>', data: {} })
})

function Consumer() {
  const ctx = useEditorContext()
  return (
    <div>
      <span data-testid="template">{ctx.template}</span>
      <span data-testid="data-title">{String((ctx.data as Record<string, unknown>)['title'])}</span>
      <span data-testid="schema-defined">{ctx.schema ? 'yes' : 'no'}</span>
    </div>
  )
}

describe('EditorContext', () => {
  it('provides template and schema to consumers', () => {
    render(
      <EditorContextProvider template="<h1>{{ title }}</h1>" schema={schema}>
        <Consumer />
      </EditorContextProvider>
    )
    expect(screen.getByTestId('template').textContent).toBe('<h1>{{ title }}</h1>')
    expect(screen.getByTestId('schema-defined').textContent).toBe('yes')
  })

  it('updateTemplate changes the template value', () => {
    function TemplateChanger() {
      const { template, updateTemplate } = useEditorContext()
      return (
        <>
          <span data-testid="template">{template}</span>
          <button onClick={() => updateTemplate('new template')}>change</button>
        </>
      )
    }

    render(
      <EditorContextProvider template="initial" schema={schema}>
        <TemplateChanger />
      </EditorContextProvider>
    )

    expect(screen.getByTestId('template').textContent).toBe('initial')
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('template').textContent).toBe('new template')
  })

  it('updateData changes the data value', () => {
    function DataChanger() {
      const { data, updateData } = useEditorContext()
      return (
        <>
          <span data-testid="data">{JSON.stringify(data)}</span>
          <button onClick={() => updateData({ title: 'updated' })}>change</button>
        </>
      )
    }

    render(
      <EditorContextProvider template="" schema={schema}>
        <DataChanger />
      </EditorContextProvider>
    )
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('data').textContent).toBe('{"title":"updated"}')
  })

  it('initial data is generated from schema (not undefined)', () => {
    render(
      <EditorContextProvider template="" schema={schema}>
        <Consumer />
      </EditorContextProvider>
    )
    expect(screen.getByTestId('data-title').textContent).toBe('Mock Title')
  })

  it('template change triggers createCheckpoint after debounce', async () => {
    vi.useFakeTimers()

    let updateTemplateFn!: (t: string) => void
    function Updater() {
      const { updateTemplate } = useEditorContext()
      updateTemplateFn = updateTemplate
      return null
    }

    await act(async () => {
      render(
        <EditorContextProvider template="initial" schema={schema}>
          <Updater />
        </EditorContextProvider>
      )
      // Flush promises to complete DB init
      await Promise.resolve()
      await Promise.resolve()
    })

    act(() => {
      updateTemplateFn('updated template')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5001)
    })

    expect(mockCreateCheckpoint).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('DB init error is caught silently', async () => {
    mockInitDatabase.mockRejectedValueOnce(new Error('IndexedDB unavailable'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      render(
        <EditorContextProvider template="initial" schema={schema}>
          <Consumer />
        </EditorContextProvider>
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    // Component should still render without throwing
    expect(screen.getByTestId('template').textContent).toBe('initial')
    consoleSpy.mockRestore()
  })
})
