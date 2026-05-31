import { useCallback, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { liquid } from '@codemirror/lang-liquid'
import { useEditorContext } from '../context/EditorContext'

export function CodePane() {
  const { template, updateTemplate } = useEditorContext()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        updateTemplate(value)
      }, 300)
    },
    [updateTemplate]
  )

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <CodeMirror value={template} extensions={[liquid()]} onChange={handleChange} />
    </div>
  )
}
