import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Toolbar } from './Toolbar'

afterEach(cleanup)

describe('Toolbar', () => {
  it('renders three segment buttons', () => {
    render(<Toolbar activeSegment="preview" onSegmentChange={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Preview')).toBeDefined()
    expect(screen.getByText('Code')).toBeDefined()
    expect(screen.getByText('Context')).toBeDefined()
  })

  it('clicking a segment calls onSegmentChange with correct value', () => {
    const onSegmentChange = vi.fn()
    render(<Toolbar activeSegment="preview" onSegmentChange={onSegmentChange} onSave={vi.fn()} />)
    screen.getByText('Code').click()
    expect(onSegmentChange).toHaveBeenCalledWith('code')
  })

  it('clicking Save & Close calls onSave', () => {
    const onSave = vi.fn()
    render(<Toolbar activeSegment="preview" onSegmentChange={vi.fn()} onSave={onSave} />)
    screen.getByText('Save & Close').click()
    expect(onSave).toHaveBeenCalled()
  })

  it('active segment button has aria-pressed=true and data-active attribute', () => {
    render(<Toolbar activeSegment="code" onSegmentChange={vi.fn()} onSave={vi.fn()} />)
    const codeBtn = screen.getByText('Code').closest('button')
    expect(codeBtn?.getAttribute('aria-pressed')).toBe('true')
    expect(codeBtn?.getAttribute('data-active')).toBe('true')
  })

  it('root element has role="toolbar" and aria-label="Editor toolbar"', () => {
    const { container } = render(<Toolbar activeSegment="preview" onSegmentChange={vi.fn()} onSave={vi.fn()} />)
    const toolbar = container.firstChild as HTMLElement
    expect(toolbar.getAttribute('role')).toBe('toolbar')
    expect(toolbar.getAttribute('aria-label')).toBe('Editor toolbar')
  })

  it('Save & Close button has aria-label="Save and close editor"', () => {
    render(<Toolbar activeSegment="preview" onSegmentChange={vi.fn()} onSave={vi.fn()} />)
    const saveBtn = screen.getByText('Save & Close').closest('button')
    expect(saveBtn?.getAttribute('aria-label')).toBe('Save and close editor')
  })
})
