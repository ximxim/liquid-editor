import type { DbInstance } from './db.js'

export interface Checkpoint {
  id: string
  sessionId: string
  parentId?: string
  templateText: string
  contextData?: Record<string, unknown>
  description?: string
  createdAt: Date
  seq: number
}

interface CheckpointRow {
  id: string
  session_id: string
  parent_id: string | null
  template_text: string
  context_data: Record<string, unknown> | null
  description: string | null
  created_at: string
  seq: number
}

function rowToCheckpoint(row: CheckpointRow): Checkpoint {
  return {
    id: row.id,
    sessionId: row.session_id,
    parentId: row.parent_id ?? undefined,
    templateText: row.template_text,
    contextData: row.context_data ?? undefined,
    description: row.description ?? undefined,
    createdAt: new Date(row.created_at),
    seq: row.seq,
  }
}

export async function createCheckpoint(
  db: DbInstance,
  sessionId: string,
  templateText: string,
  contextData?: Record<string, unknown>,
  description?: string,
  parentId?: string
): Promise<Checkpoint> {
  const seqResult = await db.query<{ max: number | null }>(
    'SELECT MAX(seq) as max FROM checkpoints WHERE session_id = $1',
    [sessionId]
  )
  const [seqRow] = seqResult.rows
  const nextSeq = (seqRow?.max ?? -1) + 1

  const result = await db.query<CheckpointRow>(
    `INSERT INTO checkpoints (session_id, parent_id, template_text, context_data, description, seq)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      sessionId,
      parentId ?? null,
      templateText,
      contextData !== undefined ? JSON.stringify(contextData) : null,
      description ?? null,
      nextSeq,
    ]
  )
  const [row] = result.rows
  if (row === undefined) throw new Error('createCheckpoint: INSERT returned no rows')
  return rowToCheckpoint(row)
}

export async function getCheckpoints(db: DbInstance, sessionId: string): Promise<Checkpoint[]> {
  const result = await db.query<CheckpointRow>(
    'SELECT * FROM checkpoints WHERE session_id = $1 ORDER BY seq ASC',
    [sessionId]
  )
  return result.rows.map(rowToCheckpoint)
}

export async function getCheckpoint(db: DbInstance, id: string): Promise<Checkpoint | null> {
  const result = await db.query<CheckpointRow>('SELECT * FROM checkpoints WHERE id = $1', [id])
  const [row] = result.rows
  return row !== undefined ? rowToCheckpoint(row) : null
}

export async function restoreCheckpoint(
  db: DbInstance,
  checkpointId: string
): Promise<{ template: string; data: Record<string, unknown> }> {
  const result = await db.query<CheckpointRow>(
    'SELECT * FROM checkpoints WHERE id = $1',
    [checkpointId]
  )
  const [row] = result.rows
  if (row === undefined) {
    throw new Error(`Checkpoint ${checkpointId} not found`)
  }
  return {
    template: row.template_text,
    data: row.context_data ?? {},
  }
}
