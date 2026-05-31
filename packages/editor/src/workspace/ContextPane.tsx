import { useState, useCallback, useRef, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { generateMockData, introspectSchema } from '@liquid-ai/core'
import type { FieldInfo } from '@liquid-ai/core'
import { useEditorContext } from '../context/EditorContext'

type ValidationState =
  | { kind: 'valid' }
  | { kind: 'invalid-json' }
  | { kind: 'schema-error'; fieldErrors: string[] }

interface FieldRowProps {
  field: FieldInfo
  required: boolean
  indent?: number
}

function FieldRow({ field, required, indent = 0 }: FieldRowProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 0',
          paddingLeft: `${indent * 16}px`,
        }}
      >
        <span style={{ fontWeight: 500, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
          {field.name}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {field.type}
          {field.isArray ? '[]' : ''}
        </span>
        {required ? (
          <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span>
        ) : (
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>optional</span>
        )}
        {field.description && (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
            — {field.description}
          </span>
        )}
      </div>
      {field.children?.map((child) => (
        <FieldRow key={child.name} field={child} required={false} indent={indent + 1} />
      ))}
    </>
  )
}

export function ContextPane() {
  const { data, schema, updateData } = useEditorContext()
  const [validation, setValidation] = useState<ValidationState>({ kind: 'valid' })
  const [seed, setSeed] = useState<string>('')
  const [requiredOnly, setRequiredOnly] = useState(false)
  const [schemaRefOpen, setSchemaRefOpen] = useState(false)

  const initialDataRef = useRef<Record<string, unknown>>(data)
  const schemaInfo = useMemo(() => introspectSchema(schema), [schema])

  const handleChange = useCallback(
    (value: string) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        setValidation({ kind: 'invalid-json' })
        return
      }

      const result = schema.safeParse(parsed)
      if (result.success) {
        setValidation({ kind: 'valid' })
        updateData(result.data as Record<string, unknown>)
      } else {
        const fieldErrors = result.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        setValidation({ kind: 'schema-error', fieldErrors })
      }
    },
    [schema, updateData]
  )

  const applyFilter = useCallback(
    (mockData: Record<string, unknown>, onlyRequired: boolean): Record<string, unknown> => {
      if (!onlyRequired) return mockData
      const requiredNames = new Set(schemaInfo.required.map((f) => f.name))
      return Object.fromEntries(Object.entries(mockData).filter(([k]) => requiredNames.has(k)))
    },
    [schemaInfo]
  )

  const handleRegenerate = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 999999)
    setSeed(String(newSeed))
    const newData = generateMockData(schema, { seed: newSeed })
    updateData(applyFilter(newData, requiredOnly))
    setValidation({ kind: 'valid' })
  }, [schema, updateData, requiredOnly, applyFilter])

  const handleReset = useCallback(() => {
    updateData(initialDataRef.current)
    setSeed('')
    setValidation({ kind: 'valid' })
  }, [updateData])

  const handleSeedKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      const num = parseInt(seed, 10)
      if (isNaN(num)) return
      const newData = generateMockData(schema, { seed: num })
      updateData(applyFilter(newData, requiredOnly))
      setValidation({ kind: 'valid' })
    },
    [seed, schema, updateData, requiredOnly, applyFilter]
  )

  const handleRequiredOnlyChange = useCallback(
    (checked: boolean) => {
      setRequiredOnly(checked)
      if (checked) {
        updateData(applyFilter(data, true))
      } else {
        const seedNum = seed ? parseInt(seed, 10) : undefined
        const opts = seedNum !== undefined && !isNaN(seedNum) ? { seed: seedNum } : undefined
        updateData(generateMockData(schema, opts))
      }
    },
    [data, schema, updateData, applyFilter, seed]
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px',
          borderBottom: '1px solid #e5e7eb',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleRegenerate}
          style={{
            padding: '4px 10px',
            cursor: 'pointer',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            backgroundColor: '#f9fafb',
          }}
        >
          Regenerate
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '4px 10px',
            cursor: 'pointer',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            backgroundColor: '#f9fafb',
          }}
        >
          Reset to defaults
        </button>
        <input
          type="number"
          placeholder="Seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onKeyDown={handleSeedKeyDown}
          aria-label="Seed"
          style={{
            width: '80px',
            padding: '4px 6px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '0.8125rem',
          }}
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={requiredOnly}
            onChange={(e) => handleRequiredOnlyChange(e.target.checked)}
            aria-label="Required only"
          />
          Required only
        </label>
      </div>

      <CodeMirror
        value={JSON.stringify(data, null, 2)}
        extensions={[json()]}
        onChange={handleChange}
      />

      {validation.kind === 'valid' && (
        <div style={{ padding: '4px 12px', fontSize: '0.8125rem', color: '#16a34a' }}>
          ✓ Valid
        </div>
      )}
      {validation.kind === 'invalid-json' && (
        <div
          role="alert"
          style={{ color: '#ef4444', padding: '8px 12px', fontSize: '0.875rem' }}
        >
          Invalid JSON
        </div>
      )}
      {validation.kind === 'schema-error' && (
        <div role="alert" style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
          {validation.fieldErrors.map((err, i) => (
            <div key={i} style={{ color: '#d97706' }}>
              {err}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
        <button
          onClick={() => setSchemaRefOpen((open) => !open)}
          aria-expanded={schemaRefOpen}
          style={{
            width: '100%',
            padding: '8px 12px',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{schemaRefOpen ? '▾' : '▸'}</span>
          Schema Reference
        </button>
        {schemaRefOpen && (
          <div data-testid="schema-reference-fields" style={{ padding: '4px 12px 12px' }}>
            {schemaInfo.required.map((field) => (
              <FieldRow key={field.name} field={field} required={true} />
            ))}
            {schemaInfo.optional.map((field) => (
              <FieldRow key={field.name} field={field} required={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
