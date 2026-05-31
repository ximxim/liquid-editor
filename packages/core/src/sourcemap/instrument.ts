import { Liquid } from 'liquidjs'

export interface SourceRange {
  start: number
  end: number
  snippet: string
}

interface TokenData {
  begin: number
  end: number
}

function hasToken(node: unknown): node is { token: TokenData } {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>
  if (!('token' in n)) return false
  const token = n['token']
  if (!token || typeof token !== 'object') return false
  const t = token as Record<string, unknown>
  if (!('begin' in t) || !('end' in t)) return false
  return typeof t['begin'] === 'number' && typeof t['end'] === 'number'
}

function collectOutputRanges(nodes: unknown[], source: string): TokenData[] {
  const result: TokenData[] = []

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const n = node as Record<string, unknown>

    if (hasToken(node)) {
      const { begin, end } = node.token
      const slice = source.slice(begin, end).trimStart()
      if (slice.startsWith('{{')) {
        result.push({ begin, end })
      }
    }

    // Recurse into block templates (for, capture, tablerow, etc.)
    if ('templates' in n && Array.isArray(n['templates'])) {
      result.push(...collectOutputRanges(n['templates'] as unknown[], source))
    }

    // Recurse into branches (if/elsif/else, unless, case/when)
    if ('branches' in n && Array.isArray(n['branches'])) {
      for (const branch of n['branches']) {
        if (branch && typeof branch === 'object') {
          const b = branch as Record<string, unknown>
          if ('templates' in b && Array.isArray(b['templates'])) {
            result.push(...collectOutputRanges(b['templates'] as unknown[], source))
          }
        }
      }
    }

    // Recurse into else branch
    if ('elseTemplates' in n && Array.isArray(n['elseTemplates'])) {
      result.push(...collectOutputRanges(n['elseTemplates'] as unknown[], source))
    }
  }

  return result
}

const _parserEngine = new Liquid()

export function instrumentTemplate(template: string): string {
  if (!template.trim()) return template

  let parsed: unknown[]
  try {
    parsed = _parserEngine.parse(template) as unknown[]
  } catch {
    return template
  }

  const ranges = collectOutputRanges(parsed, template)

  if (ranges.length === 0) return template

  // Sort in reverse order to preserve offsets while inserting
  const sorted = [...ranges].sort((a, b) => b.begin - a.begin)

  let result = template
  for (const { begin, end } of sorted) {
    const before = result.slice(0, begin)
    const inner = result.slice(begin, end)
    const after = result.slice(end)
    result = `${before}<span data-loc="${begin}:${end}">${inner}</span>${after}`
  }

  return result
}

export function mapDomLocToSource(dataLocValue: string, templateSource: string): SourceRange {
  const parts = dataLocValue.split(':')
  const start = parseInt(parts[0] ?? '0', 10)
  const end = parseInt(parts[1] ?? '0', 10)
  return {
    start,
    end,
    snippet: templateSource.slice(start, end),
  }
}
