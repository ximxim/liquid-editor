import { jsonrepair } from 'jsonrepair'
import { createLiquidEngine } from '@liquid-ai/core'

export interface HandleResult {
  success: boolean
  template?: string
  explanation?: string
  contextUpdates?: Record<string, unknown>
  error?: string
}

export function handleAssistantResponse(
  responseText: string,
  updateTemplate: (t: string) => void
): HandleResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(responseText)
  } catch {
    try {
      const repaired = jsonrepair(responseText)
      parsed = JSON.parse(repaired)
    } catch {
      return { success: false, error: 'Could not parse AI response' }
    }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['template'] !== 'string'
  ) {
    return { success: false, error: 'Could not parse AI response' }
  }

  const data = parsed as Record<string, unknown>
  const template = data['template'] as string
  const explanation = typeof data['explanation'] === 'string' ? data['explanation'] : undefined
  const rawContextUpdates = data['context_updates']
  const contextUpdates =
    typeof rawContextUpdates === 'object' &&
    rawContextUpdates !== null &&
    !Array.isArray(rawContextUpdates)
      ? (rawContextUpdates as Record<string, unknown>)
      : undefined

  const engine = createLiquidEngine({ strictVariables: false, strictFilters: false })
  try {
    engine.parse(template)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Invalid Liquid: ${msg}` }
  }

  updateTemplate(template)
  return { success: true, template, explanation, contextUpdates }
}
