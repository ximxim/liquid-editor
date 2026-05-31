import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, act } from '@testing-library/react'
import { z } from 'zod'
import { LiquidRenderer } from './LiquidRenderer'

vi.mock('@liquid-ai/core', () => ({
  renderTemplate: vi.fn(),
  mapDomLocToSource: vi.fn(),
  instrumentTemplate: vi.fn(),
  createLiquidEngine: vi.fn(),
  introspectSchema: vi.fn(),
  generateMockData: vi.fn(),
}))

import { renderTemplate, mapDomLocToSource } from '@liquid-ai/core'

const mockRenderTemplate = vi.mocked(renderTemplate)
const mockMapDomLocToSource = vi.mocked(mapDomLocToSource)

const schema = z.object({ title: z.string() })
const template = '<h1>{{ title }}</h1>'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('LiquidRenderer', () => {
  it('renders template+data and shows the renderer container', async () => {
    mockRenderTemplate.mockResolvedValue({
      html: '<h1>Test Title</h1>',
      instrumentedHtml: '<h1><span data-loc="4:14">Test Title</span></h1>',
      errors: [],
    })

    render(<LiquidRenderer template={template} schema={schema} data={{ title: 'Test Title' }} />)

    await waitFor(() => {
      expect(screen.getByTestId('liquid-renderer')).toBeDefined()
    })
  })

  it('shows error panel for invalid data', async () => {
    mockRenderTemplate.mockResolvedValue({
      html: '<h1>Mock Title</h1>',
      instrumentedHtml: '',
      errors: ['title: Expected string, received number'],
    })

    render(<LiquidRenderer template={template} schema={schema} data={{ title: 123 } as unknown as Record<string, unknown>} />)

    await waitFor(() => {
      expect(screen.getByTestId('liquid-renderer-errors')).toBeDefined()
      expect(screen.getByText(/title: Expected string, received number/)).toBeDefined()
    })
  })

  it('still renders iframe alongside error panel (not instead of it)', async () => {
    mockRenderTemplate.mockResolvedValue({
      html: '<h1>Mock Title</h1>',
      instrumentedHtml: '',
      errors: ['title: Expected string, received number'],
    })

    const { container } = render(
      <LiquidRenderer template={template} schema={schema} data={{ title: 123 } as unknown as Record<string, unknown>} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('liquid-renderer-errors')).toBeDefined()
      expect(container.querySelector('iframe')).not.toBeNull()
    })
  })

  it('renders with undefined data (auto-generates mock)', async () => {
    mockRenderTemplate.mockResolvedValue({
      html: '<h1>Mock Title</h1>',
      instrumentedHtml: '',
      errors: [],
    })

    render(<LiquidRenderer template={template} schema={schema} />)

    await waitFor(() => {
      expect(mockRenderTemplate).toHaveBeenCalledWith(template, schema, undefined)
      expect(screen.getByTestId('liquid-renderer')).toBeDefined()
    })
  })

  it('passes html (no data-loc attrs) to iframe when instrumentSourceMap is false', async () => {
    const html = '<h1>Rendered</h1>'
    const instrumentedHtml = '<h1><span data-loc="4:14">Rendered</span></h1>'
    mockRenderTemplate.mockResolvedValue({ html, instrumentedHtml, errors: [] })

    const { container } = render(
      <LiquidRenderer
        template={template}
        schema={schema}
        data={{ title: 'Rendered' }}
        instrumentSourceMap={false}
      />
    )

    await waitFor(() => {
      const iframe = container.querySelector('iframe')
      const srcdoc = iframe?.getAttribute('srcdoc') ?? ''
      expect(srcdoc).toContain('<h1>Rendered</h1>')
      expect(srcdoc).not.toContain('data-loc="4:14"')
    })
  })

  it('passes instrumentedHtml (with data-loc attrs) to iframe when instrumentSourceMap is true', async () => {
    const instrumentedHtml = '<h1><span data-loc="4:14">Rendered</span></h1>'
    mockRenderTemplate.mockResolvedValue({
      html: '<h1>Rendered</h1>',
      instrumentedHtml,
      errors: [],
    })

    const { container } = render(
      <LiquidRenderer
        template={template}
        schema={schema}
        data={{ title: 'Rendered' }}
        instrumentSourceMap={true}
      />
    )

    await waitFor(() => {
      const iframe = container.querySelector('iframe')
      const srcdoc = iframe?.getAttribute('srcdoc') ?? ''
      expect(srcdoc).toContain('data-loc="4:14"')
    })
  })

  it('calls onElementSelect with SourceRange when element-select message received', async () => {
    mockRenderTemplate.mockResolvedValue({
      html: '<h1>Test</h1>',
      instrumentedHtml: '',
      errors: [],
    })
    const sourceRange = { start: 4, end: 14, snippet: '{{ title }}' }
    mockMapDomLocToSource.mockReturnValue(sourceRange)

    const onElementSelect = vi.fn()
    render(
      <LiquidRenderer template={template} schema={schema} onElementSelect={onElementSelect} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('liquid-renderer')).toBeDefined()
    })

    // Flush all pending microtasks and effects (IframeSandbox's useEffect registers
    // the window message listener asynchronously after render).
    await act(async () => {
      await Promise.resolve()
    })

    // Dispatch inside act so React processes any resulting state updates.
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'element-select', loc: '4:14', tagName: 'h1', computedStyles: {} },
        })
      )
    })

    await waitFor(() => {
      expect(mockMapDomLocToSource).toHaveBeenCalledWith('4:14', template)
      expect(onElementSelect).toHaveBeenCalledWith(sourceRange)
    })
  })

  it('shows loading state while render is in progress', () => {
    let resolve: (val: { html: string; instrumentedHtml: string; errors: string[] }) => void
    const promise = new Promise<{ html: string; instrumentedHtml: string; errors: string[] }>((r) => {
      resolve = r
    })
    mockRenderTemplate.mockReturnValue(promise)

    render(<LiquidRenderer template={template} schema={schema} />)

    expect(screen.getByTestId('liquid-renderer-loading')).toBeDefined()

    resolve!({ html: '', instrumentedHtml: '', errors: [] })
  })
})
