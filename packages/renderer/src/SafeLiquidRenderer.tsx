import { ErrorBoundary } from './ErrorBoundary'
import { LiquidRenderer } from './LiquidRenderer'
import type { LiquidRendererProps } from './LiquidRenderer'

export function SafeLiquidRenderer(props: LiquidRendererProps) {
  return (
    <ErrorBoundary>
      <LiquidRenderer {...props} />
    </ErrorBoundary>
  )
}
