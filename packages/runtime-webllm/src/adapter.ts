import { selectModel } from './model-picker.js'
import { detectVRAM } from './model-picker.js'

export interface LoadProgress {
  text: string
  progress: number
}

export interface ChatMessage {
  role: string
  content: string
}

export interface ChatModelRunResult {
  content: Array<{ type: 'text'; text: string }>
}

export interface ChatModelAdapter {
  run(options: {
    messages: ChatMessage[]
    abortSignal?: AbortSignal
  }): AsyncGenerator<ChatModelRunResult>
}

export interface WebLLMAdapterOptions {
  modelId?: string
  onProgress?: (p: LoadProgress) => void
}

export class WebLLMAdapter implements ChatModelAdapter {
  private worker: Worker | null = null
  private selectedModelId: string | null = null
  private readonly options: WebLLMAdapterOptions

  constructor(options?: WebLLMAdapterOptions) {
    this.options = options ?? {}
  }

  async init(): Promise<void> {
    const vram = await detectVRAM()
    const model = selectModel(vram, this.options.modelId)
    this.selectedModelId = model.id

    return new Promise((resolve, reject) => {
      // vite-ignore: worker URL resolved at runtime in the browser, not at library build time
      const worker = new Worker(/* @vite-ignore */ new URL('./worker.ts', import.meta.url), { type: 'module' })
      this.worker = worker

      worker.addEventListener('message', (event: MessageEvent) => {
        const { type, text, progress } = event.data as { type: string; text?: string; progress?: number }
        if (type === 'progress' && this.options.onProgress) {
          this.options.onProgress({ text: text ?? '', progress: progress ?? 0 })
        } else if (type === 'ready') {
          resolve()
        } else if (type === 'error') {
          reject(new Error(text ?? 'Worker error'))
        }
      })

      worker.addEventListener('error', (err) => {
        reject(new Error(`Worker failed: ${err.message}`))
      })

      worker.postMessage({ type: 'init', modelId: this.selectedModelId })
    })
  }

  async *run(options: {
    messages: ChatMessage[]
    abortSignal?: AbortSignal
  }): AsyncGenerator<ChatModelRunResult> {
    if (!this.worker) throw new Error('WebLLMAdapter: call init() before run()')

    const { messages, abortSignal } = options
    const worker = this.worker

    const chunks: string[] = []
    let done = false
    let error: Error | null = null

    const messageHandler = (event: MessageEvent) => {
      const data = event.data as { type: string; text?: string; error?: string }
      if (data.type === 'chunk' && data.text) {
        chunks.push(data.text)
      } else if (data.type === 'done') {
        done = true
      } else if (data.type === 'error') {
        error = new Error(data.error ?? 'Worker error')
        done = true
      }
    }

    worker.addEventListener('message', messageHandler)

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        worker.postMessage({ type: 'abort' })
        done = true
      })
    }

    worker.postMessage({ type: 'chat', messages })

    try {
      while (!done || chunks.length > 0) {
        if (chunks.length > 0) {
          const text = chunks.shift()!
          yield { content: [{ type: 'text' as const, text }] }
        } else if (!done) {
          await new Promise<void>((resolve) => setTimeout(resolve, 10))
        }
      }
      if (error) throw error
    } finally {
      worker.removeEventListener('message', messageHandler)
    }
  }

  destroy(): void {
    this.worker?.terminate()
    this.worker = null
  }
}
