import type { ZodType } from 'zod'
import { introspectSchema } from '@liquid-ai/core'

export function buildSystemPrompt(schema: ZodType, customPrompt?: string): string {
  const info = introspectSchema(schema)
  const jsonSchemaStr = JSON.stringify(info.jsonSchema, null, 2)
  const requiredFieldNames = info.required.map((f) => f.name)

  const parts: string[] = []

  parts.push(
    'You are a Liquid template builder. You generate and edit Liquid templates.'
  )

  parts.push(`## Template Data Schema\n\`\`\`json\n${jsonSchemaStr}\n\`\`\``)

  if (requiredFieldNames.length > 0) {
    parts.push(
      `## Required Fields\nThese fields MUST appear in every template: ${requiredFieldNames.join(', ')}`
    )
  }

  parts.push(`## Examples

### Example 1: Create a product card
User: Create a product card
Response:
\`\`\`json
{
  "template": "<div class=\\"card\\"><img src=\\"{{ image_url }}\\" alt=\\"{{ title }}\\" /><h2>{{ title }}</h2><p>{{ price }}</p></div>",
  "explanation": "Created a product card with title, price, and image."
}
\`\`\`

### Example 2: Add a description below the title
User: Add a description section below the title
Response:
\`\`\`json
{
  "template": "<div class=\\"card\\"><h2>{{ title }}</h2><p class=\\"desc\\">{{ description }}</p><p>{{ price }}</p></div>",
  "explanation": "Added a description paragraph below the title."
}
\`\`\`

### Example 3: Change background to dark theme
User: Change the background to dark theme
Response:
\`\`\`json
{
  "template": "<div class=\\"card\\" style=\\"background:#1a1a1a;color:#fff\\"><h2>{{ title }}</h2><p>{{ price }}</p></div>",
  "explanation": "Changed the background to dark theme with white text."
}
\`\`\``)

  parts.push(
    '## Output Format\nAlways respond with JSON in this exact format:\n```json\n{\n  "template": "your Liquid template here",\n  "explanation": "brief description of what you did"\n}\n```'
  )

  if (customPrompt) {
    parts.push(`## Additional Instructions\n${customPrompt}`)
  }

  return parts.join('\n\n')
}
