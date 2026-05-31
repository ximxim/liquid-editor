import { describe, it, expect, vi, afterEach } from 'vitest'
import { isWebGPUAvailable } from './detect.js'

describe('isWebGPUAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false in jsdom where navigator.gpu is undefined', () => {
    expect(isWebGPUAvailable()).toBe(false)
  })

  it('returns true when navigator.gpu is present', () => {
    vi.stubGlobal('navigator', { ...navigator, gpu: {} })
    expect(isWebGPUAvailable()).toBe(true)
  })
})
