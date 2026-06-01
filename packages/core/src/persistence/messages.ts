import type { DbInstance } from './db.js'

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: unknown
  createdAt: Date
  seq: number
}

interface MessageRow {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls: unknown | null
  created_at: string
  seq: number
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    toolCalls: row.tool_calls ?? undefined,
    createdAt: new Date(row.created_at),
    seq: row.seq,
  }
}

export async function appendMessage(
  db: DbInstance,
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  toolCalls?: unknown
): Promise<Message> {
  const seqResult = await db.query<{ max: number | null }>(
    'SELECT MAX(seq) as max FROM messages WHERE session_id = $1',
    [sessionId]
  )
  const [seqRow] = seqResult.rows
  const nextSeq = (seqRow?.max ?? -1) + 1

  const result = await db.query<MessageRow>(
    `INSERT INTO messages (session_id, role, content, tool_calls, seq)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sessionId, role, content, toolCalls !== undefined ? JSON.stringify(toolCalls) : null, nextSeq]
  )
  const [row] = result.rows
  if (row === undefined) throw new Error('appendMessage: INSERT returned no rows')
  return rowToMessage(row)
}

export async function getMessages(db: DbInstance, sessionId: string): Promise<Message[]> {
  const result = await db.query<MessageRow>(
    'SELECT * FROM messages WHERE session_id = $1 ORDER BY seq ASC',
    [sessionId]
  )
  return result.rows.map(rowToMessage)
}

export async function clearMessages(db: DbInstance, sessionId: string): Promise<void> {
  await db.query('DELETE FROM messages WHERE session_id = $1', [sessionId])
}
