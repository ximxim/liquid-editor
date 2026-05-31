import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { IframeSandbox } from './IframeSandbox'

afterEach(() => {
  cleanup()
})

describe('IframeSandbox', () => {
  it('renders an iframe element', () => {
    const { container } = render(<IframeSandbox html="<p>Hello</p>" />)
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
  })

  it('has the correct sandbox attribute', () => {
    const { container } = render(<IframeSandbox html="<p>Hello</p>" />)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin')
  })

  it('srcdoc contains the html prop content', () => {
    const { container } = render(<IframeSandbox html="<p>Hello World</p>" />)
    const iframe = container.querySelector('iframe')
    const srcdoc = iframe?.getAttribute('srcdoc') ?? ''
    expect(srcdoc).toContain('<p>Hello World</p>')
  })

  it('srcdoc contains the selection-handler script with data-loc and postMessage', () => {
    const { container } = render(<IframeSandbox html="<p>Test</p>" />)
    const iframe = container.querySelector('iframe')
    const srcdoc = iframe?.getAttribute('srcdoc') ?? ''
    expect(srcdoc).toContain('data-loc')
    expect(srcdoc).toContain('postMessage')
  })

  it('calls onMessage when window receives a message event', () => {
    const onMessage = vi.fn()
    render(<IframeSandbox html="<p>Test</p>" onMessage={onMessage} />)

    const event = new MessageEvent('message', {
      data: { type: 'element-select', loc: '0:5', tagName: 'h1', computedStyles: {} },
    })
    window.dispatchEvent(event)

    expect(onMessage).toHaveBeenCalledWith(event)
  })

  it('applies className to container', () => {
    const { container } = render(<IframeSandbox html="<p>Test</p>" className="my-class" />)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('class')).toBe('my-class')
  })
})
