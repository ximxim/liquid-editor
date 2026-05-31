import { useState } from 'react'
import type { QuestionFlowArgs, QuestionFlowReceipt } from './schema.js'

export interface QuestionFlowProps extends QuestionFlowArgs {
  onChange: (receipt: QuestionFlowReceipt) => void
}

export function QuestionFlow({ question, options, onChange }: QuestionFlowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    onChange({ selectedId: id })
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: '#111827',
          lineHeight: 1.4,
        }}
      >
        {question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option) => (
          <div
            key={option.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(option.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelect(option.id)
            }}
            style={{
              padding: '10px 14px',
              border:
                selectedId === option.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedId === option.id ? '#eff6ff' : '#ffffff',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
              {option.label}
            </div>
            {option.description && (
              <div style={{ marginTop: '4px', fontSize: '0.8125rem', color: '#6b7280' }}>
                {option.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
