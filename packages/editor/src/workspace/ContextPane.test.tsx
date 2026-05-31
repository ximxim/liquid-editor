import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider, useEditorContext } from '../context/EditorContext'
import { ContextPane } from './ContextPane'

afterEach(cleanup)

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Regenerated', price: 42 })),
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

vi.mock('@codemirror/lang-json', () => ({ json: () => [] }))

import { generateMockData } from '@liquid-ai/core'
const mockGenerateMockData = vi.mocked(generateMockData)

const schema = z.object({ title: z.string(), price: z.number() })

function DataDisplay() {
  const { data } = useEditorContext()
  return <span data-testid="current-data">{JSON.stringify(data)}</span>
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <EditorContextProvider template="" schema={schema}>
      {children}
      <DataDisplay />
    </EditorContextProvider>
  )
}

describe('ContextPane', () => {
  it('renders JSON of current data', () => {
    render(<ContextPane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror') as HTMLTextAreaElement
    const parsed = JSON.parse(textarea.value)
    expect(parsed).toHaveProperty('title')
  })

  it('regenerate button calls updateData with new mock data', async () => {
    mockGenerateMockData.mockReturnValueOnce({ title: 'Regenerated', price: 42 })
    render(<ContextPane />, { wrapper: Wrapper })

    await act(async () => {
      screen.getByText('Regenerate Mock Data').click()
    })

    const dataDisplay = screen.getByTestId('current-data')
    const data = JSON.parse(dataDisplay.textContent ?? '{}') as Record<string, unknown>
    expect(data['title']).toBe('Regenerated')
    expect(data['price']).toBe(42)
  })

  it('invalid JSON shows error message', async () => {
    render(<ContextPane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror')

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'not valid json {' } })
    })

    expect(screen.getByText('Invalid JSON')).toBeDefined()
  })

  it('valid JSON that fails schema validation shows error', async () => {
    render(<ContextPane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror')

    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: JSON.stringify({ title: 123, price: 'abc' }) },
      })
    })

    expect(screen.getByRole('alert')).toBeDefined()
  })
})
