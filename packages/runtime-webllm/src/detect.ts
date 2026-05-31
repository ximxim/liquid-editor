import { useState, useEffect } from 'react'

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

export interface WebGPUStatus {
  available: boolean
  adapter: unknown
}

export function useWebGPUStatus(): WebGPUStatus {
  const [status, setStatus] = useState<WebGPUStatus>({
    available: false,
    adapter: null,
  })

  useEffect(() => {
    if (!isWebGPUAvailable()) return
    const gpu = (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu
    gpu.requestAdapter().then((adapter) => {
      setStatus({ available: adapter !== null, adapter })
    }).catch(() => {
      setStatus({ available: false, adapter: null })
    })
  }, [])

  return status
}
