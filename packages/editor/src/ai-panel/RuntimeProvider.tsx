import { useState, useEffect, useRef, type ReactNode } from 'react'
import type { ZodType } from 'zod'
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  ThreadMessage,
} from '@assistant-ui/react'
import { useLocalRuntime, AssistantRuntimeProvider } from '@assistant-ui/react'
import {
  WebLLMAdapter,
  isWebGPUAvailable,
  ModelLoadProgress,
} from '@liquid-ai/runtime-webllm'
import type { LoadProgress, ChatMessage } from '@liquid-ai/runtime-webllm'
import { buildSystemPrompt } from './system-prompt.js'

export interface RuntimeProviderProps {
  schema: ZodType
  systemPrompt?: string
  modelId?: string
  onAssistantMessage?: (text: string) => void
  children: ReactNode
}

function extractTextFromMessage(msg: ThreadMessage): string {
  return msg.content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

class WrappedAdapter implements ChatModelAdapter {
  constructor(
    private readonly inner: WebLLMAdapter,
    private readonly getSystemPrompt: () => string,
    private readonly getOnComplete: () => ((text: string) => void) | undefined,
  ) {}

  async *run(options: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void> {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
    ]

    for (const msg of options.messages) {
      const content = extractTextFromMessage(msg)
      if (content) {
        messages.push({ role: msg.role, content })
      }
    }

    let fullText = ''

    for await (const chunk of this.inner.run({
      messages,
      abortSignal: options.abortSignal,
    })) {
      const textParts = chunk.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => ({ type: 'text' as const, text: p.text }))

      for (const p of textParts) {
        fullText += p.text
      }

      yield { content: textParts }
    }

    const onComplete = this.getOnComplete()
    if (fullText && onComplete) {
      onComplete(fullText)
    }
  }
}

function InnerProvider({
  schema,
  systemPrompt,
  modelId,
  onAssistantMessage,
  children,
}: RuntimeProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [progress, setProgress] = useState<LoadProgress | null>(null)

  // Mutable refs so closures always see the latest values without recreating adapters
  const onAssistantMessageRef = useRef(onAssistantMessage)
  const systemPromptRef = useRef('')
  const setProgressRef = useRef((p: LoadProgress) => setProgress(p))

  // Keep refs current on every render
  onAssistantMessageRef.current = onAssistantMessage
  setProgressRef.current = (p: LoadProgress) => setProgress(p)

  useEffect(() => {
    systemPromptRef.current = buildSystemPrompt(schema, systemPrompt)
  }, [schema, systemPrompt])

  const [{ adapter, webllm }] = useState(() => {
    const w = new WebLLMAdapter({
      modelId,
      onProgress: (p) => setProgressRef.current(p),
    })
    const a = new WrappedAdapter(
      w,
      () => systemPromptRef.current,
      () => onAssistantMessageRef.current,
    )
    return { adapter: a, webllm: w }
  })

  useEffect(() => {
    webllm
      .init()
      .then(() => setIsReady(true))
      .catch(() => setIsReady(true))
    return () => webllm.destroy()
  }, [webllm])

  const runtime = useLocalRuntime(adapter)

  if (!isReady) {
    return (
      <ModelLoadProgress
        modelId={modelId ?? 'Qwen2.5-Coder'}
        progress={progress?.progress ?? 0}
        text={progress?.text}
      />
    )
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  )
}

export function RuntimeProvider(props: RuntimeProviderProps) {
  if (!isWebGPUAvailable()) {
    return (
      <p style={{ padding: '12px', fontSize: '0.875rem', color: '#6b7280' }}>
        WebGPU is required for AI features. Preview, Code, and Context tabs work without AI.
      </p>
    )
  }
  return <InnerProvider {...props} />
}
