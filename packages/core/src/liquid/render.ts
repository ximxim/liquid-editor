import type { ZodType } from 'zod'
import { createLiquidEngine } from './engine.js'
import { instrumentTemplate } from '../sourcemap/instrument.js'
import { generateMockData } from '../zod/mock.js'

export interface RenderResult {
  html: string
  instrumentedHtml: string
  errors: string[]
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function renderTemplate(
  template: string,
  schema: ZodType,
  data?: Record<string, unknown>
): Promise<RenderResult> {
  const errors: string[] = []
  let renderData: Record<string, unknown>

  if (data !== undefined) {
    const parseResult = schema.safeParse(data)
    if (!parseResult.success) {
      parseResult.error.errors.forEach((err) => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
        errors.push(`${path}${err.message}`)
      })
      renderData = generateMockData(schema)
    } else {
      renderData = parseResult.data as Record<string, unknown>
    }
  } else {
    renderData = generateMockData(schema)
  }

  const engine = createLiquidEngine({ strictVariables: false })
  const instrumentedTemplate = instrumentTemplate(template)

  let html = ''
  let instrumentedHtml = ''

  try {
    html = await engine.parseAndRender(template, renderData)
  } catch (err) {
    errors.push(getErrorMessage(err))
  }

  try {
    instrumentedHtml = await engine.parseAndRender(instrumentedTemplate, renderData)
  } catch (err) {
    errors.push(getErrorMessage(err))
  }

  return { html, instrumentedHtml, errors }
}
