import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { EditorContextProvider } from '../context/EditorContext'
import { PreviewPane } from './PreviewPane'

afterEach(cleanup)

vi.mock('@liquid-ai/core', () => ({
  generateMockData: vi.fn(() => ({ title: 'Mock' })),
}))

vi.mock('@liquid-ai/renderer', () => ({
  LiquidRenderer: ({
    template,
    instrumentSourceMap,
  }: {
    template: string
    instrumentSourceMap?: boolean
  }) => (
    <div
      data-testid="mock-renderer"
      data-template={template}
      data-instrument={String(instrumentSourceMap)}
    />
  ),
}))

const schema = z.object({ title: z.string() })

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <EditorContextProvider template="<h1>{{ title }}</h1>" schema={schema}>
      {children}
    </EditorContextProvider>
  )
}

describe('PreviewPane', () => {
  it('renders LiquidRenderer with correct props from context', () => {
    render(<PreviewPane />, { wrapper: Wrapper })
    const renderer = screen.getByTestId('mock-renderer')
    expect(renderer).toBeDefined()
    expect(renderer.getAttribute('data-template')).toBe('<h1>{{ title }}</h1>')
    expect(renderer.getAttribute('data-instrument')).toBe('true')
  })
})
