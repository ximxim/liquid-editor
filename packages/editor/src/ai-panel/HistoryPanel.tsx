import { useState, useEffect } from 'react'
import type { Checkpoint } from '@liquid-ai/core'
import { useEditorContext } from '../context/EditorContext.js'

export function HistoryPanel() {
  const { loadCheckpoints, restoreFromCheckpoint } = useEditorContext()
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadCheckpoints().then((ckpts) => {
      if (!cancelled) {
        setCheckpoints(ckpts)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [loadCheckpoints])

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    await restoreFromCheckpoint(id)
    setRestoringId(null)
  }

  if (loading) {
    return (
      <div
        data-testid="history-panel"
        style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.875rem' }}
      >
        Loading checkpoints...
      </div>
    )
  }

  if (checkpoints.length === 0) {
    return (
      <div
        data-testid="history-panel"
        style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.875rem' }}
      >
        No checkpoints yet
      </div>
    )
  }

  return (
    <div
      data-testid="history-panel"
      style={{ flex: 1, overflow: 'auto', padding: '8px' }}
    >
      {checkpoints.map((ckpt) => (
        <button
          key={ckpt.id}
          data-testid={`checkpoint-${ckpt.id}`}
          disabled={restoringId === ckpt.id}
          onClick={() => handleRestore(ckpt.id)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '8px 12px',
            marginBottom: '4px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            background: restoringId === ckpt.id ? '#f3f4f6' : '#ffffff',
            cursor: restoringId === ckpt.id ? 'wait' : 'pointer',
          }}
        >
          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
            {ckpt.description ?? `Checkpoint #${ckpt.seq}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
            {ckpt.createdAt.toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  )
}
