import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../theme.js'

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
      role="toolbar"
      aria-label="Editor toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '48px',
        borderBottom: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.bgSurface,
        padding: `0 ${SPACING.lg}`,
        gap: SPACING.sm,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: 1 }}>
        {label && (
          <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 500 }}>{label}</span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '2px',
          background: COLORS.bgSegmentGroup,
          borderRadius: RADIUS.md,
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
                padding: `${SPACING.xs} 12px`,
                border: 'none',
                borderRadius: RADIUS.sm,
                cursor: 'pointer',
                fontSize: FONT_SIZE.sm,
                backgroundColor: isActive ? COLORS.bgSegmentActive : 'transparent',
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
          aria-label="Save and close editor"
          onClick={onSave}
          style={{
            padding: `6px 14px`,
            backgroundColor: COLORS.bgButtonPrimary,
            color: COLORS.textOnPrimary,
            border: 'none',
            borderRadius: RADIUS.md,
            cursor: 'pointer',
            fontSize: FONT_SIZE.sm,
            fontWeight: 500,
          }}
        >
          {'Save & Close'}
        </button>
      </div>
    </div>
  )
}
