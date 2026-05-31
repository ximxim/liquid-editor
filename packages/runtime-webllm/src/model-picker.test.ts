import { describe, it, expect, vi, afterEach } from 'vitest'
import { selectModel, detectVRAM, MODEL_CONFIGS } from './model-picker.js'

describe('selectModel', () => {
  it('selects 7B model when VRAM >= 5107 MB', () => {
    const model = selectModel(6000)
    expect(model.id).toContain('7B')
  })

  it('selects 3B model when VRAM is 3000 MB', () => {
    const model = selectModel(3000)
    expect(model.id).toContain('3B')
  })

  it('selects 1.5B model when VRAM is 2000 MB', () => {
    const model = selectModel(2000)
    expect(model.id).toContain('1.5B')
  })

  it('defaults to 3B when VRAM is null', () => {
    const model = selectModel(null)
    expect(model.id).toContain('3B')
  })

  it('returns preferred model by id regardless of VRAM', () => {
    const sevenB = MODEL_CONFIGS.find((m) => m.id.includes('7B'))!
    const model = selectModel(null, sevenB.id)
    expect(model.id).toBe(sevenB.id)
  })

  it('falls back to default when preferredId is not found', () => {
    const model = selectModel(null, 'nonexistent-model-id')
    expect(model.id).toContain('3B')
  })
})

describe('detectVRAM', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null in jsdom where navigator.gpu is undefined', async () => {
    const result = await detectVRAM()
    expect(result).toBeNull()
  })

  it('returns null when navigator.gpu.requestAdapter() returns null', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      gpu: { requestAdapter: async () => null },
    })
    const result = await detectVRAM()
    expect(result).toBeNull()
  })

  it('returns MB value when adapter has maxBufferSize', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      gpu: {
        requestAdapter: async () => ({
          limits: { maxBufferSize: 6 * 1024 * 1024 * 1024 },
        }),
      },
    })
    const result = await detectVRAM()
    expect(result).toBe(6144)
  })
})
