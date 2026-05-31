import { generateMock } from '@anatine/zod-mock'
import { faker } from '@faker-js/faker'
import type { ZodType } from 'zod'

export interface MockOptions {
  seed?: number
  overrides?: Record<string, unknown>
}

export function generateMockData(schema: ZodType, options?: MockOptions): Record<string, unknown> {
  if (options?.seed !== undefined) {
    faker.seed(options.seed)
  }

  const mock = generateMock(schema, { faker }) as Record<string, unknown>

  if (options?.overrides) {
    return { ...mock, ...options.overrides }
  }

  return mock
}
