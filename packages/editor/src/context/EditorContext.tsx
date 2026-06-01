import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { ZodType } from 'zod'
import { generateMockData } from '@liquid-ai/core'
import type { DbInstance, Checkpoint } from '@liquid-ai/core'

export interface SelectedElementInfo {
  start: number
  end: number
  snippet: string
  loc: string
  tagName: string
  computedStyles: Record<string, string>
}

export interface EditorContextValue {
  template: string
  data: Record<string, unknown>
  schema: ZodType
  selectedElement: SelectedElementInfo | null
  updateTemplate: (t: string) => void
  updateData: (d: Record<string, unknown>) => void
  setSelectedElement: (el: SelectedElementInfo | null) => void
  loadCheckpoints: () => Promise<Checkpoint[]>
  restoreFromCheckpoint: (id: string) => Promise<void>
}

const EditorContext = createContext<EditorContextValue | null>(null)

interface EditorContextProviderProps {
  template: string
  schema: ZodType
  children: ReactNode
}

const CHECKPOINT_DEBOUNCE_MS = 5000

export function EditorContextProvider({
  template: initialTemplate,
  schema,
  children,
}: EditorContextProviderProps) {
  const [template, setTemplate] = useState(initialTemplate)
  const [data, setData] = useState<Record<string, unknown>>(() => generateMockData(schema))
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null)

  const dbRef = useRef<DbInstance | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const checkpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize persistence on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { initDatabase, createSession } = await import('@liquid-ai/core')
        const db = await initDatabase()
        if (cancelled) return
        dbRef.current = db
        const session = await createSession(db, initialTemplate, {})
        if (cancelled) return
        sessionIdRef.current = session.id
      } catch (err) {
        console.error('Failed to initialize persistence:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced checkpoint on template/data change
  useEffect(() => {
    if (checkpointTimerRef.current !== null) {
      clearTimeout(checkpointTimerRef.current)
    }

    checkpointTimerRef.current = setTimeout(() => {
      const db = dbRef.current
      const sessionId = sessionIdRef.current
      if (!db || !sessionId) return
      ;(async () => {
        try {
          const { createCheckpoint } = await import('@liquid-ai/core')
          await createCheckpoint(db, sessionId, template, data, 'Manual edit')
        } catch (err) {
          console.error('Failed to create checkpoint:', err)
        }
      })()
    }, CHECKPOINT_DEBOUNCE_MS)

    return () => {
      if (checkpointTimerRef.current !== null) {
        clearTimeout(checkpointTimerRef.current)
      }
    }
  }, [template, data])

  const loadCheckpoints = useCallback(async (): Promise<Checkpoint[]> => {
    const db = dbRef.current
    const sessionId = sessionIdRef.current
    if (!db || !sessionId) return []
    try {
      const { getCheckpoints } = await import('@liquid-ai/core')
      return await getCheckpoints(db, sessionId)
    } catch (err) {
      console.error('Failed to load checkpoints:', err)
      return []
    }
  }, [])

  const restoreFromCheckpoint = useCallback(async (id: string): Promise<void> => {
    const db = dbRef.current
    if (!db) return
    try {
      const { restoreCheckpoint } = await import('@liquid-ai/core')
      const { template: restoredTemplate, data: restoredData } = await restoreCheckpoint(db, id)
      setTemplate(restoredTemplate)
      setData(restoredData)
    } catch (err) {
      console.error('Failed to restore checkpoint:', err)
    }
  }, [])

  return (
    <EditorContext.Provider
      value={{
        template,
        data,
        schema,
        selectedElement,
        updateTemplate: setTemplate,
        updateData: setData,
        setSelectedElement,
        loadCheckpoints,
        restoreFromCheckpoint,
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditorContext must be used within EditorContextProvider')
  return ctx
}

export { EditorContext }
