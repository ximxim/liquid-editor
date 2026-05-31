export type Segment = 'preview' | 'code' | 'context'

export interface ToolbarProps {
  activeSegment: Segment
  onSegmentChange: (segment: Segment) => void
  onSave: () => void
  label?: string
}

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
  { id: 'context', label: 'Context' },
]

export function Toolbar({ activeSegment, onSegmentChange, onSave, label }: ToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '48px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        padding: '0 16px',
        gap: '8px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: 1 }}>
        {label && (
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '2px',
          background: '#e5e7eb',
          borderRadius: '6px',
          padding: '2px',
        }}
      >
        {SEGMENTS.map((seg) => {
          const isActive = activeSegment === seg.id
          return (
            <button
              key={seg.id}
              data-active={isActive ? 'true' : undefined}
              aria-pressed={isActive}
              onClick={() => onSegmentChange(seg.id)}
              style={{
                padding: '4px 12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {seg.label}
            </button>
          )
        })}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onSave}
          style={{
            padding: '6px 14px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {'Save & Close'}
        </button>
      </div>
    </div>
  )
}
