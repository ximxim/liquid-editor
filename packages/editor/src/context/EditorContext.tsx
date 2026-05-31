import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ZodType } from 'zod'
import { generateMockData } from '@liquid-ai/core'

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
}

const EditorContext = createContext<EditorContextValue | null>(null)

interface EditorContextProviderProps {
  template: string
  schema: ZodType
  children: ReactNode
}

export function EditorContextProvider({
  template: initialTemplate,
  schema,
  children,
}: EditorContextProviderProps) {
  const [template, setTemplate] = useState(initialTemplate)
  const [data, setData] = useState<Record<string, unknown>>(() => generateMockData(schema))
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null)

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
