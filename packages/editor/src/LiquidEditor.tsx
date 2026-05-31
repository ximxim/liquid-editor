import { useState } from 'react'
import type { ZodType } from 'zod'
import { EditorContextProvider, useEditorContext } from './context/EditorContext'
import { Toolbar } from './layout/Toolbar'
import type { Segment } from './layout/Toolbar'
import { WorkspacePane } from './workspace/WorkspacePane'
import { AiPanel } from './ai-panel/AiPanel'

export interface LiquidEditorProps {
  template: string
  schema: ZodType
  onSave: (updatedTemplate: string) => void
  systemPrompt?: string
  modelId?: string
  className?: string
}

function EditorShell({
  onSave,
  className,
}: {
  onSave: (t: string) => void
  className?: string
}) {
  const { template } = useEditorContext()
  const [activeSegment, setActiveSegment] = useState<Segment>('preview')

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateRows: '48px 1fr',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        onSave={() => onSave(template)}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          overflow: 'hidden',
        }}
      >
        <WorkspacePane activeSegment={activeSegment} />
        <AiPanel />
      </div>
    </div>
  )
}

export function LiquidEditor({
  template,
  schema,
  onSave,
  className,
}: LiquidEditorProps) {
  return (
    <EditorContextProvider template={template} schema={schema}>
      <EditorShell onSave={onSave} className={className} />
    </EditorContextProvider>
  )
}
