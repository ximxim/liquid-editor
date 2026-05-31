import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodType } from 'zod'

export interface FieldInfo {
  name: string
  type: string
  description?: string
  isArray: boolean
  children?: FieldInfo[]
  enumValues?: string[]
}

export interface SchemaInfo {
  required: FieldInfo[]
  optional: FieldInfo[]
  jsonSchema: object
}

interface JsonSchemaProp {
  type?: string | string[]
  description?: string
  enum?: string[]
  items?: JsonSchemaProp
  properties?: Record<string, JsonSchemaProp>
  required?: string[]
  anyOf?: JsonSchemaProp[]
}

interface JsonSchemaRoot {
  type?: string
  properties?: Record<string, JsonSchemaProp>
  required?: string[]
  additionalProperties?: boolean
}

function unwrapOptional(prop: JsonSchemaProp): JsonSchemaProp {
  // zod-to-json-schema represents optional fields as anyOf: [type, {not:{}}]
  // or simply emits them without the required list
  if (prop.anyOf) {
    const real = prop.anyOf.find((s) => s.type !== undefined || s.properties !== undefined || s.enum !== undefined)
    return real ?? prop
  }
  return prop
}

function extractFieldInfo(name: string, prop: JsonSchemaProp): FieldInfo {
  const unwrapped = unwrapOptional(prop)

  if (unwrapped.type === 'array' && unwrapped.items) {
    const inner = extractFieldInfo(name, unwrapped.items)
    return {
      ...inner,
      isArray: true,
    }
  }

  if (unwrapped.type === 'object' && unwrapped.properties) {
    const requiredInner = unwrapped.required ?? []
    const children = Object.entries(unwrapped.properties).map(([k, v]) =>
      extractFieldInfo(k, v)
    )
    return {
      name,
      type: 'object',
      isArray: false,
      description: unwrapped.description ?? prop.description,
      children,
    }
  }

  if (unwrapped.enum) {
    return {
      name,
      type: 'enum',
      isArray: false,
      description: unwrapped.description ?? prop.description,
      enumValues: unwrapped.enum,
    }
  }

  const rawType = unwrapped.type ?? prop.type
  const type = Array.isArray(rawType)
    ? rawType.filter((t) => t !== 'null').join('|')
    : (rawType ?? 'unknown')

  return {
    name,
    type,
    isArray: false,
    description: unwrapped.description ?? prop.description,
  }
}

export function introspectSchema(schema: ZodType): SchemaInfo {
  const jsonSchema = zodToJsonSchema(schema) as JsonSchemaRoot

  if (!jsonSchema.properties) {
    return { required: [], optional: [], jsonSchema }
  }

  const requiredNames = jsonSchema.required ?? []
  const required: FieldInfo[] = []
  const optional: FieldInfo[] = []

  for (const [name, prop] of Object.entries(jsonSchema.properties)) {
    const field = extractFieldInfo(name, prop)
    if (requiredNames.includes(name)) {
      required.push(field)
    } else {
      optional.push(field)
    }
  }

  return { required, optional, jsonSchema }
}
