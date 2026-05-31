export interface ModelConfig {
  id: string
  vramMB: number
  downloadSizeMB: number
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
    vramMB: 5107,
    downloadSizeMB: 4400,
  },
  {
    id: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
    vramMB: 2505,
    downloadSizeMB: 1900,
  },
  {
    id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    vramMB: 1630,
    downloadSizeMB: 1000,
  },
]

const DEFAULT_MODEL = MODEL_CONFIGS[1]! // 3B as safe default

export async function detectVRAM(): Promise<number | null> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return null
  try {
    const adapter = await (navigator as unknown as { gpu: { requestAdapter(): Promise<{ limits?: { maxBufferSize?: number } } | null> } }).gpu.requestAdapter()
    if (!adapter) return null
    const maxBufferSize = adapter.limits?.maxBufferSize
    if (typeof maxBufferSize === 'number') return Math.round(maxBufferSize / (1024 * 1024))
    return null
  } catch {
    return null
  }
}

export function selectModel(vramMB: number | null, preferredId?: string): ModelConfig {
  if (preferredId) {
    const found = MODEL_CONFIGS.find((m) => m.id === preferredId)
    if (found) return found
  }
  if (vramMB === null) return DEFAULT_MODEL
  const sorted = [...MODEL_CONFIGS].sort((a, b) => b.vramMB - a.vramMB)
  return sorted.find((m) => vramMB >= m.vramMB) ?? DEFAULT_MODEL
}
