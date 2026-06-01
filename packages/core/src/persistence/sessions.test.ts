import { describe, it, expect, vi } from 'vitest'
import { createSession, getSession, listSessions, updateSession } from './sessions.js'
import type { DbInstance } from './db.js'

function makeDb(overrides?: Partial<DbInstance>): DbInstance {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

const sampleRow = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  template_initial: '<h1>{{ title }}</h1>',
  schema_json: { type: 'object' },
  system_prompt: null,
}

describe('createSession', () => {
  it('returns a session with an id', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    const session = await createSession(db, '<h1>{{ title }}</h1>', { type: 'object' })
    expect(session.id).toBe('aaaaaaaa-0000-0000-0000-000000000001')
    expect(session.templateInitial).toBe('<h1>{{ title }}</h1>')
  })

  it('maps dates correctly', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    const session = await createSession(db, '', {})
    expect(session.createdAt).toBeInstanceOf(Date)
    expect(session.updatedAt).toBeInstanceOf(Date)
  })

  it('passes systemPrompt to query when provided', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    await createSession(db, '', {}, 'my-prompt')
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as unknown[]
    expect(params[2]).toBe('my-prompt')
  })

  it('passes null for systemPrompt when omitted', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    await createSession(db, '', {})
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as unknown[]
    expect(params[2]).toBeNull()
  })
})

describe('getSession', () => {
  it('returns null for unknown id', async () => {
    const db = makeDb()
    const result = await getSession(db, 'nonexistent-id')
    expect(result).toBeNull()
  })

  it('returns a session when found', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    const session = await getSession(db, sampleRow.id)
    expect(session).not.toBeNull()
    expect(session!.id).toBe(sampleRow.id)
  })
})

describe('listSessions', () => {
  it('returns sessions ordered by created_at desc', async () => {
    const rows = [
      { ...sampleRow, id: 'id-1', created_at: '2024-01-02T00:00:00.000Z' },
      { ...sampleRow, id: 'id-2', created_at: '2024-01-01T00:00:00.000Z' },
    ]
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows }) })
    const sessions = await listSessions(db)
    expect(sessions).toHaveLength(2)
    expect(sessions[0]?.id).toBe('id-1')
  })

  it('passes limit and offset to query', async () => {
    const db = makeDb()
    await listSessions(db, 5, 10)
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as unknown[]
    expect(params[0]).toBe(5)
    expect(params[1]).toBe(10)
  })
})

describe('updateSession', () => {
  it('does nothing when no updates provided', async () => {
    const db = makeDb()
    await updateSession(db, 'some-id', {})
    expect(db.query).not.toHaveBeenCalled()
  })

  it('updates updatedAt when provided', async () => {
    const db = makeDb()
    const now = new Date()
    await updateSession(db, 'some-id', { updatedAt: now })
    expect(db.query).toHaveBeenCalledOnce()
    const sql = (db.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    expect(sql).toContain('updated_at')
  })

  it('updates systemPrompt when provided', async () => {
    const db = makeDb()
    await updateSession(db, 'some-id', { systemPrompt: 'new-prompt' })
    expect(db.query).toHaveBeenCalledOnce()
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as unknown[]
    expect(params).toContain('new-prompt')
  })
})
