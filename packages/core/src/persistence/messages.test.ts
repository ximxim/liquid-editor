import { describe, it, expect, vi } from 'vitest'
import { appendMessage, getMessages, clearMessages } from './messages.js'
import type { DbInstance } from './db.js'

function makeDb(overrides?: Partial<DbInstance>): DbInstance {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

const sampleRow = {
  id: 'msg-aaaaaaaa-0000-0000-0000-000000000001',
  session_id: 'sess-0000-0000-0000-000000000001',
  role: 'user' as const,
  content: 'Hello',
  tool_calls: null,
  created_at: '2024-01-01T00:00:00.000Z',
  seq: 0,
}

describe('appendMessage', () => {
  it('inserts the message and returns it', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [sampleRow] }),
    })
    const msg = await appendMessage(db, sampleRow.session_id, 'user', 'Hello')
    expect(msg.id).toBe(sampleRow.id)
    expect(msg.content).toBe('Hello')
  })

  it('assigns seq=0 when no previous messages', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [sampleRow] }),
    })
    await appendMessage(db, sampleRow.session_id, 'user', 'Hello')
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as unknown[]
    expect(params[4]).toBe(0)
  })

  it('increments seq from max', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: 3 }] })
        .mockResolvedValueOnce({ rows: [{ ...sampleRow, seq: 4 }] }),
    })
    await appendMessage(db, sampleRow.session_id, 'user', 'Hello')
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as unknown[]
    expect(params[4]).toBe(4)
  })

  it('serializes toolCalls when provided', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [sampleRow] }),
    })
    const toolCalls = { name: 'my-tool', args: {} }
    await appendMessage(db, sampleRow.session_id, 'user', 'Hello', toolCalls)
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as unknown[]
    expect(params[3]).toBe(JSON.stringify(toolCalls))
  })
})

describe('getMessages', () => {
  it('returns messages ordered by seq', async () => {
    const rows = [
      { ...sampleRow, seq: 0, content: 'first' },
      { ...sampleRow, id: 'msg-2', seq: 1, content: 'second' },
    ]
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows }) })
    const messages = await getMessages(db, sampleRow.session_id)
    expect(messages[0]?.content).toBe('first')
    expect(messages[1]?.content).toBe('second')
  })

  it('returns empty array when no messages', async () => {
    const db = makeDb()
    const messages = await getMessages(db, 'unknown-session')
    expect(messages).toHaveLength(0)
  })
})

describe('clearMessages', () => {
  it('calls delete with the session id', async () => {
    const db = makeDb()
    await clearMessages(db, 'sess-123')
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      ['sess-123']
    )
  })
})
