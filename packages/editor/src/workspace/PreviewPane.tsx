import type { SourceRange } from '@liquid-ai/renderer'
import { LiquidRenderer } from '@liquid-ai/renderer'
import { useEditorContext } from '../context/EditorContext'
import type { SelectedElementInfo } from '../context/EditorContext'

export function PreviewPane() {
  const { template, schema, data, setSelectedElement, selectedElement } = useEditorContext()
  const selectedLoc = selectedElement?.loc ?? null

  function handleElementSelect(range: SourceRange) {
    const info: SelectedElementInfo = {
      start: range.start,
      end: range.end,
      snippet: range.snippet,
      loc: `${String(range.start)}:${String(range.end)}`,
      tagName: '',
      computedStyles: {},
    }
    setSelectedElement(info)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <LiquidRenderer
        template={template}
        schema={schema}
        data={data}
        instrumentSourceMap={true}
        onElementSelect={handleElementSelect}
        selectedLoc={selectedLoc}
      />
    </div>
  )
}
