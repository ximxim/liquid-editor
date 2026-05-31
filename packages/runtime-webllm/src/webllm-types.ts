export interface InitProgressReport {
  text: string
  progress: number
}

export type InitProgressCallback = (report: InitProgressReport) => void

export interface ChatCompletionChunk {
  choices: Array<{
    delta: { content?: string }
    finish_reason?: string | null
  }>
}

export interface MLCEngine {
  chat: {
    completions: {
      create(opts: {
        messages: Array<{ role: string; content: string }>
        stream: boolean
        response_format?: { type: string; schema?: object }
      }): AsyncIterable<ChatCompletionChunk>
    }
  }
  interruptGenerate(): void
}
