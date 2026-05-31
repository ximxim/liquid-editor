import { LiquidRenderer } from '@liquid-ai/renderer'
import { useEditorContext } from '../context/EditorContext'

export function PreviewPane() {
  const { template, schema, data, setSelectedElement, selectedElement } = useEditorContext()
  const selectedLoc = selectedElement?.loc ?? null

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <LiquidRenderer
        template={template}
        schema={schema}
        data={data}
        instrumentSourceMap={true}
        onElementSelect={setSelectedElement}
        selectedLoc={selectedLoc}
      />
    </div>
  )
}
