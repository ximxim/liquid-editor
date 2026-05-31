import { LiquidRenderer } from '@liquid-ai/renderer'
import { useEditorContext } from '../context/EditorContext'

export function PreviewPane() {
  const { template, schema, data, setSelectedElement } = useEditorContext()

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <LiquidRenderer
        template={template}
        schema={schema}
        data={data}
        instrumentSourceMap={true}
        onElementSelect={setSelectedElement}
      />
    </div>
  )
}
