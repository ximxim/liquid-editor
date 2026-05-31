/**
 * Integration tests for LiquidRenderer XSS safety.
 * This file intentionally does NOT mock @liquid-ai/core so that the real
 * renderTemplate (with LiquidJS outputEscape:'escape') is exercised.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import { z } from 'zod'
import { LiquidRenderer } from './LiquidRenderer'

afterEach(() => {
  cleanup()
})

describe('LiquidRenderer — XSS safety (integration, real renderTemplate)', () => {
  it('HTML-escapes an XSS payload in data before it reaches the iframe srcdoc', async () => {
    const schema = z.object({ title: z.string() })
    const template = '<h1>{{ title }}</h1>'
    const xssPayload = '<img src=x onerror="alert(1)">'

    const { container } = render(
      <LiquidRenderer
        template={template}
        schema={schema}
        data={{ title: xssPayload }}
      />
    )

    await waitFor(() => {
      const iframe = container.querySelector('iframe')
      expect(iframe).not.toBeNull()

      const srcdoc = iframe?.getAttribute('srcdoc') ?? ''

      // The raw, executable payload must not appear anywhere in the document
      expect(srcdoc).not.toContain('onerror="alert(1)"')

      // The content should appear as safe escaped text instead
      expect(srcdoc).toContain('&lt;img')
    })
  })
})
