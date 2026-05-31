import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { WorkspacePane } from './WorkspacePane'

afterEach(cleanup)

vi.mock('./PreviewPane', () => ({
  PreviewPane: () => <div data-testid="preview-pane">Preview</div>,
}))

vi.mock('./CodePane', () => ({
  CodePane: () => <div data-testid="code-pane">Code</div>,
}))

vi.mock('./ContextPane', () => ({
  ContextPane: () => <div data-testid="context-pane">Context</div>,
}))

describe('WorkspacePane', () => {
  it('preview pane visible when activeSegment=preview', () => {
    const { container } = render(<WorkspacePane activeSegment="preview" />)
    const previewWrapper = container.querySelector('[data-testid="pane-preview"]') as HTMLElement
    const codeWrapper = container.querySelector('[data-testid="pane-code"]') as HTMLElement
    expect(previewWrapper.style.display).not.toBe('none')
    expect(codeWrapper.style.display).toBe('none')
  })

  it('code pane visible when activeSegment=code', () => {
    const { container } = render(<WorkspacePane activeSegment="code" />)
    const previewWrapper = container.querySelector('[data-testid="pane-preview"]') as HTMLElement
    const codeWrapper = container.querySelector('[data-testid="pane-code"]') as HTMLElement
    expect(previewWrapper.style.display).toBe('none')
    expect(codeWrapper.style.display).not.toBe('none')
  })

  it('all panes are mounted in the DOM simultaneously', () => {
    const { container } = render(<WorkspacePane activeSegment="preview" />)
    expect(container.querySelector('[data-testid="pane-preview"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pane-code"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pane-context"]')).not.toBeNull()
  })
})
