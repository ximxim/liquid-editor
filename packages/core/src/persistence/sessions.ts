import type { DbInstance } from './db.js'

export interface Session {
  id: string
  createdAt: Date
  updatedAt: Date
  templateInitial: string
  schemaJson: object
  systemPrompt?: string
}

interface SessionRow {
  id: string
  created_at: string
  updated_at: string
  template_initial: string
  schema_json: object
  system_prompt: string | null
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    templateInitial: row.template_initial,
    schemaJson: row.schema_json,
    systemPrompt: row.system_prompt ?? undefined,
  }
}

export async function createSession(
  db: DbInstance,
  templateInitial: string,
  schemaJson: object,
  systemPrompt?: string
): Promise<Session> {
  const result = await db.query<SessionRow>(
    `INSERT INTO sessions (template_initial, schema_json, system_prompt)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [templateInitial, JSON.stringify(schemaJson), systemPrompt ?? null]
  )
  const [row] = result.rows
  if (row === undefined) throw new Error('createSession: INSERT returned no rows')
  return rowToSession(row)
}

export async function getSession(db: DbInstance, id: string): Promise<Session | null> {
  const result = await db.query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id])
  const [row] = result.rows
  return row !== undefined ? rowToSession(row) : null
}

export async function listSessions(
  db: DbInstance,
  limit = 20,
  offset = 0
): Promise<Session[]> {
  const result = await db.query<SessionRow>(
    'SELECT * FROM sessions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  return result.rows.map(rowToSession)
}

export async function updateSession(
  db: DbInstance,
  id: string,
  updates: Partial<Pick<Session, 'updatedAt' | 'systemPrompt'>>
): Promise<void> {
  const fields: string[] = []
  const params: unknown[] = []
  let paramIdx = 1

  if (updates.updatedAt !== undefined) {
    fields.push(`updated_at = $${paramIdx++}`)
    params.push(updates.updatedAt.toISOString())
  }
  if (updates.systemPrompt !== undefined) {
    fields.push(`system_prompt = $${paramIdx++}`)
    params.push(updates.systemPrompt)
  }

  if (fields.length === 0) return

  params.push(id)
  await db.query(`UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramIdx}`, params)
}
