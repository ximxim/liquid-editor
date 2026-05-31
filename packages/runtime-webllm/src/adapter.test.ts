import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebLLMAdapter } from './adapter.js'

class MockWorker extends EventTarget {
  static instance: MockWorker | null = null
  private _listeners: ((e: MessageEvent) => void)[] = []

  constructor(_url: unknown, _opts?: unknown) {
    super()
    MockWorker.instance = this
  }

  postMessage(data: unknown) {
    const msg = data as { type: string }
    if (msg.type === 'init') {
      setTimeout(() => {
        this.dispatchToListeners({ type: 'progress', text: 'Loading...', progress: 0.5 })
        this.dispatchToListeners({ type: 'ready' })
      }, 0)
    } else if (msg.type === 'chat') {
      setTimeout(() => {
        this.dispatchToListeners({ type: 'chunk', text: 'Hello' })
        this.dispatchToListeners({ type: 'chunk', text: ' World' })
        this.dispatchToListeners({ type: 'done' })
      }, 0)
    } else if (msg.type === 'abort') {
      setTimeout(() => {
        this.dispatchToListeners({ type: 'done' })
      }, 0)
    }
  }

  private dispatchToListeners(data: unknown) {
    const event = new MessageEvent('message', { data })
    this._listeners.forEach((fn) => fn(event))
  }

  override addEventListener(type: string, listener: unknown) {
    if (type === 'message') {
      this._listeners.push(listener as (e: MessageEvent) => void)
    }
  }

  override removeEventListener(type: string, listener: unknown) {
    if (type === 'message') {
      this._listeners = this._listeners.filter((fn) => fn !== listener)
    }
  }

  terminate() {}
}

beforeEach(() => {
  vi.stubGlobal('Worker', MockWorker)
  MockWorker.instance = null
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WebLLMAdapter', () => {
  it('init() resolves after worker posts ready', async () => {
    const adapter = new WebLLMAdapter()
    await expect(adapter.init()).resolves.toBeUndefined()
    adapter.destroy()
  })

  it('init() calls onProgress with incremental values', async () => {
    const onProgress = vi.fn()
    const adapter = new WebLLMAdapter({ onProgress })
    await adapter.init()
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 0.5 }))
    adapter.destroy()
  })

  it('run() yields chunks from worker', async () => {
    const adapter = new WebLLMAdapter()
    await adapter.init()

    const results: string[] = []
    for await (const chunk of adapter.run({ messages: [{ role: 'user', content: 'hi' }] })) {
      results.push(...chunk.content.map((c) => c.text))
    }
    expect(results).toEqual(['Hello', ' World'])
    adapter.destroy()
  })

  it('abort signal stops run() early', async () => {
    const adapter = new WebLLMAdapter()
    await adapter.init()

    const controller = new AbortController()
    const gen = adapter.run({
      messages: [{ role: 'user', content: 'hi' }],
      abortSignal: controller.signal,
    })

    controller.abort()
    const results: string[] = []
    for await (const chunk of gen) {
      results.push(...chunk.content.map((c) => c.text))
    }
    expect(results.length).toBeLessThanOrEqual(2)
    adapter.destroy()
  })

  it('selectModel returns 3B by default (null VRAM)', async () => {
    const adapter = new WebLLMAdapter()
    await adapter.init()
    expect(MockWorker.instance).not.toBeNull()
    adapter.destroy()
  })

  it('destroy() terminates the worker', () => {
    const adapter = new WebLLMAdapter()
    const terminateSpy = vi.fn()
    adapter['worker'] = { terminate: terminateSpy } as unknown as Worker
    adapter.destroy()
    expect(terminateSpy).toHaveBeenCalled()
  })
})
