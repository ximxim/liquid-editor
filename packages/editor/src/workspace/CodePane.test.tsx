import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider, useEditorContext } from '../context/EditorContext'
import { CodePane } from './CodePane'

afterEach(cleanup)

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Mock' })),
}))

vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string
    onChange?: (v: string) => void
  }) => (
    <textarea
      data-testid="codemirror"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

vi.mock('@codemirror/lang-liquid', () => ({ liquid: () => [] }))

const schema = z.object({ title: z.string() })

function TemplateDisplay() {
  const { template } = useEditorContext()
  return <span data-testid="current-template">{template}</span>
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <EditorContextProvider template="<h1>{{ title }}</h1>" schema={schema}>
      {children}
      <TemplateDisplay />
    </EditorContextProvider>
  )
}

describe('CodePane', () => {
  it('renders a CodeMirror instance', () => {
    render(<CodePane />, { wrapper: Wrapper })
    expect(screen.getByTestId('codemirror')).toBeDefined()
  })

  it('CodeMirror receives current template as value', () => {
    render(<CodePane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror') as HTMLTextAreaElement
    expect(textarea.value).toBe('<h1>{{ title }}</h1>')
  })

  it('on value change, updateTemplate is called after 300ms debounce', async () => {
    vi.useFakeTimers()
    render(<CodePane />, { wrapper: Wrapper })

    const textarea = screen.getByTestId('codemirror')
    fireEvent.change(textarea, { target: { value: 'new template value' } })

    expect(screen.getByTestId('current-template').textContent).toBe('<h1>{{ title }}</h1>')

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByTestId('current-template').textContent).toBe('new template value')
    vi.useRealTimers()
  })
})
