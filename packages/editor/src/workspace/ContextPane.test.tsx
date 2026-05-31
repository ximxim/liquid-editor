import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider, useEditorContext } from '../context/EditorContext'
import { ContextPane } from './ContextPane'

afterEach(cleanup)

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Regenerated', price: 42 })),
  introspectSchema: vi.fn(() => ({
    required: [
      { name: 'title', type: 'string', isArray: false },
      { name: 'price', type: 'number', isArray: false },
    ],
    optional: [],
    jsonSchema: {},
  })),
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

import { generateMockData, introspectSchema } from '@liquid-ai/core'
const mockGenerateMockData = vi.mocked(generateMockData)
const mockIntrospectSchema = vi.mocked(introspectSchema)

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

  // T6.1 — Enhanced mock data toolbar

  it('Regenerate button calls updateData with new mock data', async () => {
    mockGenerateMockData.mockReturnValueOnce({ title: 'Initial', price: 1 })
    mockGenerateMockData.mockReturnValueOnce({ title: 'Regenerated', price: 99 })

    render(<ContextPane />, { wrapper: Wrapper })

    await act(async () => {
      screen.getByText('Regenerate').click()
    })

    const dataDisplay = screen.getByTestId('current-data')
    const data = JSON.parse(dataDisplay.textContent ?? '{}') as Record<string, unknown>
    expect(data['title']).toBe('Regenerated')
    expect(data['price']).toBe(99)
  })

  it('same seed produces same data', async () => {
    mockGenerateMockData.mockReturnValue({ title: 'Seeded', price: 100 })
    render(<ContextPane />, { wrapper: Wrapper })

    const seedInput = screen.getByLabelText('Seed')

    await act(async () => {
      fireEvent.change(seedInput, { target: { value: '42' } })
      fireEvent.keyDown(seedInput, { key: 'Enter' })
    })

    const callsBefore = mockGenerateMockData.mock.calls.length

    await act(async () => {
      fireEvent.keyDown(seedInput, { key: 'Enter' })
    })

    const firstSeedCall = mockGenerateMockData.mock.calls[callsBefore - 1]
    const secondSeedCall = mockGenerateMockData.mock.calls[mockGenerateMockData.mock.calls.length - 1]
    expect(firstSeedCall?.[1]).toEqual({ seed: 42 })
    expect(secondSeedCall?.[1]).toEqual({ seed: 42 })

    const data = JSON.parse(
      (screen.getByTestId('current-data').textContent ?? '{}')
    ) as Record<string, unknown>
    expect(data['title']).toBe('Seeded')
  })

  it('Reset to defaults restores initial data', async () => {
    mockGenerateMockData
      .mockReturnValueOnce({ title: 'Initial', price: 1 })
      .mockReturnValue({ title: 'Regenerated', price: 99 })

    render(<ContextPane />, { wrapper: Wrapper })

    await act(async () => {
      screen.getByText('Regenerate').click()
    })

    let data = JSON.parse(
      screen.getByTestId('current-data').textContent ?? '{}'
    ) as Record<string, unknown>
    expect(data['title']).toBe('Regenerated')

    await act(async () => {
      screen.getByText('Reset to defaults').click()
    })

    data = JSON.parse(
      screen.getByTestId('current-data').textContent ?? '{}'
    ) as Record<string, unknown>
    expect(data['title']).toBe('Initial')
  })

  it('Required only toggle filters optional fields', async () => {
    mockIntrospectSchema.mockReturnValue({
      required: [{ name: 'title', type: 'string', isArray: false }],
      optional: [{ name: 'price', type: 'number', isArray: false }],
      jsonSchema: {},
    })
    mockGenerateMockData.mockReturnValue({ title: 'Hello', price: 42 })

    render(<ContextPane />, { wrapper: Wrapper })

    const checkbox = screen.getByRole('checkbox', { name: /required only/i })

    await act(async () => {
      fireEvent.click(checkbox)
    })

    const data = JSON.parse(
      screen.getByTestId('current-data').textContent ?? '{}'
    ) as Record<string, unknown>
    expect(data).toHaveProperty('title')
    expect(data).not.toHaveProperty('price')
  })

  // T6.2 — Field-level validation feedback

  it('shows ✓ Valid indicator for valid data', () => {
    render(<ContextPane />, { wrapper: Wrapper })
    expect(screen.getByText('✓ Valid')).toBeDefined()
  })

  it('valid JSON that passes schema shows ✓ Valid after edit', async () => {
    render(<ContextPane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror')

    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: JSON.stringify({ title: 'Hello', price: 42 }) },
      })
    })

    expect(screen.getByText('✓ Valid')).toBeDefined()
  })

  it('valid JSON that fails schema shows orange field error', async () => {
    render(<ContextPane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror')

    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: JSON.stringify({ title: 123, price: 'abc' }) },
      })
    })

    const alert = screen.getByRole('alert')
    expect(alert).toBeDefined()
    expect(alert.textContent).toMatch(/title|price/)
  })

  it('invalid JSON shows Invalid JSON error', async () => {
    render(<ContextPane />, { wrapper: Wrapper })
    const textarea = screen.getByTestId('codemirror')

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'not valid json {' } })
    })

    expect(screen.getByText('Invalid JSON')).toBeDefined()
  })

  // T6.4 — Schema Reference panel

  it('Schema Reference section is collapsed by default', () => {
    render(<ContextPane />, { wrapper: Wrapper })
    expect(screen.queryByTestId('schema-reference-fields')).toBeNull()
  })

  it('Schema Reference toggle expands and collapses the section', async () => {
    render(<ContextPane />, { wrapper: Wrapper })

    const toggle = screen.getByRole('button', { name: /schema reference/i })

    await act(async () => {
      toggle.click()
    })

    expect(screen.getByTestId('schema-reference-fields')).toBeDefined()

    await act(async () => {
      toggle.click()
    })

    expect(screen.queryByTestId('schema-reference-fields')).toBeNull()
  })

  it('Schema Reference renders field names', async () => {
    render(<ContextPane />, { wrapper: Wrapper })

    await act(async () => {
      screen.getByRole('button', { name: /schema reference/i }).click()
    })

    const container = screen.getByTestId('schema-reference-fields')
    expect(within(container).getByText('title')).toBeDefined()
    expect(within(container).getByText('price')).toBeDefined()
  })

  it('required fields show * marker', async () => {
    render(<ContextPane />, { wrapper: Wrapper })

    await act(async () => {
      screen.getByRole('button', { name: /schema reference/i }).click()
    })

    const container = screen.getByTestId('schema-reference-fields')
    const stars = within(container).getAllByText('*')
    expect(stars.length).toBeGreaterThan(0)
  })

  it('optional fields show optional label', async () => {
    mockIntrospectSchema.mockReturnValue({
      required: [{ name: 'title', type: 'string', isArray: false }],
      optional: [{ name: 'discount', type: 'string', isArray: false }],
      jsonSchema: {},
    })

    render(<ContextPane />, { wrapper: Wrapper })

    await act(async () => {
      screen.getByRole('button', { name: /schema reference/i }).click()
    })

    const container = screen.getByTestId('schema-reference-fields')
    expect(within(container).getByText('optional')).toBeDefined()
  })
})
