import { Liquid } from 'liquidjs'

export interface EngineConfig {
  strictFilters?: boolean
  strictVariables?: boolean
  outputEscape?: 'escape' | 'json' | ((value: unknown) => string)
}

export function createLiquidEngine(config?: EngineConfig): Liquid {
  return new Liquid({
    strictFilters: config?.strictFilters ?? true,
    strictVariables: config?.strictVariables ?? true,
    outputEscape: config?.outputEscape ?? 'escape',
  })
}
