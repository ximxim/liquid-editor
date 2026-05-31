// Web Worker entry point — runs off the main thread.
// In production this file is loaded as a Worker via new Worker(new URL('./worker.ts', import.meta.url)).
// Tests mock the Worker class and never import this file directly.

interface WorkerMessage {
  type: 'init' | 'chat' | 'abort'
  modelId?: string
  messages?: Array<{ role: string; content: string }>
}

let abortRequested = false

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data

  if (type === 'init') {
    handleInit(event.data.modelId ?? '')
  } else if (type === 'chat') {
    abortRequested = false
    handleChat(event.data.messages ?? [])
  } else if (type === 'abort') {
    abortRequested = true
  }
})

async function handleInit(modelId: string): Promise<void> {
  // In a real deployment this would call:
  //   const engine = await CreateMLCEngine(modelId, { initProgressCallback })
  // For now report progress steps and signal readiness.
  self.postMessage({ type: 'progress', text: `Loading ${modelId}...`, progress: 0 })
  self.postMessage({ type: 'progress', text: `Loading ${modelId}...`, progress: 0.5 })
  self.postMessage({ type: 'ready' })
}

async function handleChat(messages: Array<{ role: string; content: string }>): Promise<void> {
  void messages
  // Real implementation would stream from engine.chat.completions.create({ stream: true, ... })
  // Stub: immediately done
  self.postMessage({ type: 'done' })
}
