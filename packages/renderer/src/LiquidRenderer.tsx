import { useState, useEffect } from 'react'
import type { ZodType } from 'zod'
import { renderTemplate, mapDomLocToSource } from '@liquid-ai/core'
import type { SourceRange } from '@liquid-ai/core'
import { IframeSandbox } from './IframeSandbox'

export interface LiquidRendererProps {
  template: string
  schema: ZodType
  data?: Record<string, unknown>
  onElementSelect?: (loc: SourceRange) => void
  className?: string
  instrumentSourceMap?: boolean
}

interface RenderState {
  html: string
  instrumentedHtml: string
  errors: string[]
}

export function LiquidRenderer({
  template,
  schema,
  data,
  onElementSelect,
  className,
  instrumentSourceMap = false,
}: LiquidRendererProps) {
  const [renderState, setRenderState] = useState<RenderState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setRenderState(null)

    renderTemplate(template, schema, data)
      .then((result) => {
        if (!cancelled) {
          setRenderState(result)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderState({ html: '', instrumentedHtml: '', errors: ['Failed to render template'] })
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [template, schema, data])

  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'element-select' && onElementSelect) {
      const sourceRange = mapDomLocToSource(event.data.loc as string, template)
      onElementSelect(sourceRange)
    }
  }

  if (isLoading) {
    return (
      <div className={className} data-testid="liquid-renderer-loading">
        Loading...
      </div>
    )
  }

  const htmlToRender = instrumentSourceMap
    ? (renderState?.instrumentedHtml ?? '')
    : (renderState?.html ?? '')

  const errors = renderState?.errors ?? []

  return (
    <div className={className} data-testid="liquid-renderer">
      {errors.length > 0 && (
        <div
          role="alert"
          data-testid="liquid-renderer-errors"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '8px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <strong>Validation errors:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <IframeSandbox html={htmlToRender} onMessage={handleMessage} />
    </div>
  )
}
