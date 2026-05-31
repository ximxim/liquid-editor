import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider, useEditorContext } from './EditorContext'

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Mock Title', price: 9.99 })),
}))

const schema = z.object({ title: z.string(), price: z.number() })

afterEach(cleanup)

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
})
