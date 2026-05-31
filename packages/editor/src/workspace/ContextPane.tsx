import { useState, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { generateMockData } from '@liquid-ai/core'
import { useEditorContext } from '../context/EditorContext'

export function ContextPane() {
  const { data, schema, updateData } = useEditorContext()
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(
    (value: string) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        setError('Invalid JSON')
        return
      }

      const result = schema.safeParse(parsed)
      if (result.success) {
        setError(null)
        updateData(result.data as Record<string, unknown>)
      } else {
        setError(result.error.message)
      }
    },
    [schema, updateData]
  )

  const handleRegenerate = useCallback(() => {
    const newData = generateMockData(schema)
    updateData(newData)
    setError(null)
  }, [schema, updateData])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <CodeMirror
        value={JSON.stringify(data, null, 2)}
        extensions={[json()]}
        onChange={handleChange}
      />
      {error && (
        <div
          role="alert"
          style={{ color: '#ef4444', padding: '8px 12px', fontSize: '0.875rem' }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handleRegenerate}
        style={{
          margin: '8px',
          padding: '6px 12px',
          cursor: 'pointer',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          fontSize: '0.875rem',
          backgroundColor: '#f9fafb',
        }}
      >
        Regenerate Mock Data
      </button>
    </div>
  )
}
