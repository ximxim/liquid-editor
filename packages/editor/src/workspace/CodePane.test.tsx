import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider, useEditorContext } from '../context/EditorContext'
import type { SelectedElementInfo } from '../context/EditorContext'
import { CodePane } from './CodePane'

afterEach(cleanup)

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Mock' })),
}))

const { mockDispatch } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
}))

vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
    onCreateEditor,
  }: {
    value: string
    onChange?: (v: string) => void
    onCreateEditor?: (view: object) => void
  }) => {
    onCreateEditor?.({
      dispatch: mockDispatch,
      state: { doc: { length: 100 } },
    })
    return React.createElement('textarea', {
      'data-testid': 'codemirror',
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
    })
  },
}))

vi.mock('@codemirror/lang-liquid', () => ({ liquid: () => [] }))

vi.mock('@codemirror/state', async () => {
  const actual = await vi.importActual('@codemirror/state')
  return actual
})

vi.mock('@codemirror/view', async () => {
  const actual = await vi.importActual('@codemirror/view')
  return actual
})

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

  it('dispatches highlight effect when selectedElement is set in context', async () => {
    mockDispatch.mockClear()

    const element: SelectedElementInfo = {
      start: 0,
      end: 14,
      snippet: '<h1>{{ title }}</h1>',
      loc: '0:14',
      tagName: 'h1',
      computedStyles: { padding: '0px', 'font-size': '24px' },
    }

    function ElementSetter() {
      const { setSelectedElement } = useEditorContext()
      return (
        <button
          data-testid="set-element"
          onClick={() => setSelectedElement(element)}
        />
      )
    }

    render(
      <EditorContextProvider template="<h1>{{ title }}</h1>" schema={schema}>
        <CodePane />
        <ElementSetter />
      </EditorContextProvider>
    )

    await act(async () => {
      screen.getByTestId('set-element').click()
    })

    expect(mockDispatch).toHaveBeenCalled()
  })
})
