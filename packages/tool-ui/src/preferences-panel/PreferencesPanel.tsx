import { useState } from 'react'
import type { PreferencesPanelArgs, PreferencesPanelField, PreferencesPanelReceipt } from './schema.js'

export interface PreferencesPanelProps extends PreferencesPanelArgs {
  onChange: (receipt: PreferencesPanelReceipt) => void
}

function FieldInput({
  field,
  value,
  onFieldChange,
}: {
  field: PreferencesPanelField
  value: string | number | boolean
  onFieldChange: (id: string, v: string | number | boolean) => void
}) {
  if (field.type === 'slider') {
    return (
      <input
        type="range"
        min={field.min ?? 0}
        max={field.max ?? 100}
        value={Number(value)}
        onChange={(e) => onFieldChange(field.id, Number(e.target.value))}
        style={{ width: '100%' }}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={String(value)}
        onChange={(e) => onFieldChange(field.id, e.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          fontSize: '0.875rem',
        }}
      >
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type="checkbox"
      checked={Boolean(value)}
      onChange={(e) => onFieldChange(field.id, e.target.checked)}
    />
  )
}

export function PreferencesPanel({ title, fields, onChange }: PreferencesPanelProps) {
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, f.value])),
  )

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    const newValues = { ...values, [id]: value }
    setValues(newValues)
    onChange({ values: newValues })
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {fields.map((field) => (
          <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              htmlFor={field.id}
              style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}
            >
              {field.label}
            </label>
            <FieldInput field={field} value={values[field.id] ?? field.value} onFieldChange={handleFieldChange} />
          </div>
        ))}
      </div>
    </div>
  )
}
