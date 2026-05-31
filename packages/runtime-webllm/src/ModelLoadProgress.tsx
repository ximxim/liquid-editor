export interface ModelLoadProgressProps {
  modelId: string
  progress: number
  text?: string
}

export function ModelLoadProgress({ modelId, progress, text }: ModelLoadProgressProps) {
  const pct = Math.round(Math.min(100, Math.max(0, progress * 100)))

  return (
    <div
      style={{
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.875rem',
      }}
    >
      <div style={{ marginBottom: '8px', color: '#374151' }}>
        {text ?? `Downloading ${modelId}...`}
      </div>
      <div
        style={{
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="progress-bar"
          style={{
            height: '100%',
            width: `${String(pct)}%`,
            background: '#3b82f6',
            borderRadius: '4px',
            transition: 'width 200ms ease',
          }}
        />
      </div>
      <div style={{ marginTop: '4px', color: '#6b7280' }}>{pct}%</div>
    </div>
  )
}
