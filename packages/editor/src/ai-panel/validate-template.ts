import type { ZodType } from 'zod'
import { introspectSchema } from '@liquid-ai/core'

export interface ValidateResult {
  valid: boolean
  missing: string[]
}

export function validateRequiredFields(template: string, schema: ZodType): ValidateResult {
  const info = introspectSchema(schema)
  const missing: string[] = []

  for (const field of info.required) {
    // Check for {{ fieldName }} or {{ fieldName | filter }} or {% assign x = fieldName %}
    const namePattern = field.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const used =
      new RegExp(`\\{\\{\\s*${namePattern}[^}]*\\}\\}`).test(template) ||
      new RegExp(`\\{%-?\\s[^}]*${namePattern}[^}]*-?%\\}`).test(template)

    if (!used) {
      missing.push(field.name)
    }
  }

  return { valid: missing.length === 0, missing }
}
