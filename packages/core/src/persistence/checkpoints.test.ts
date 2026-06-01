import { describe, it, expect, vi } from 'vitest'
import {
  createCheckpoint,
  getCheckpoints,
  getCheckpoint,
  restoreCheckpoint,
} from './checkpoints.js'
import type { DbInstance } from './db.js'

function makeDb(overrides?: Partial<DbInstance>): DbInstance {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    exec: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

const sampleRow = {
  id: 'ckpt-aaaaaaaa-0000-0000-0000-000000000001',
  session_id: 'sess-0000-0000-0000-000000000001',
  parent_id: null,
  template_text: '<h1>{{ title }}</h1>',
  context_data: { title: 'Test' },
  description: 'Initial checkpoint',
  created_at: '2024-01-01T00:00:00.000Z',
  seq: 0,
}

describe('createCheckpoint', () => {
  it('returns a checkpoint with correct fields', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [sampleRow] }),
    })
    const ckpt = await createCheckpoint(
      db,
      sampleRow.session_id,
      sampleRow.template_text,
      sampleRow.context_data,
      sampleRow.description
    )
    expect(ckpt.id).toBe(sampleRow.id)
    expect(ckpt.templateText).toBe(sampleRow.template_text)
    expect(ckpt.description).toBe(sampleRow.description)
    expect(ckpt.seq).toBe(0)
  })

  it('assigns seq=0 when no previous checkpoints', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [sampleRow] }),
    })
    await createCheckpoint(db, sampleRow.session_id, '<p>test</p>')
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as unknown[]
    expect(params[5]).toBe(0)
  })

  it('increments seq from existing max', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: 2 }] })
        .mockResolvedValueOnce({ rows: [{ ...sampleRow, seq: 3 }] }),
    })
    await createCheckpoint(db, sampleRow.session_id, '<p>test</p>')
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as unknown[]
    expect(params[5]).toBe(3)
  })

  it('passes parentId when provided', async () => {
    const db = makeDb({
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ max: null }] })
        .mockResolvedValueOnce({ rows: [sampleRow] }),
    })
    await createCheckpoint(db, sampleRow.session_id, '<p>test</p>', undefined, undefined, 'parent-id')
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as unknown[]
    expect(params[1]).toBe('parent-id')
  })
})

describe('getCheckpoints', () => {
  it('returns checkpoints ordered by seq', async () => {
    const rows = [
      { ...sampleRow, seq: 0, description: 'first' },
      { ...sampleRow, id: 'ckpt-2', seq: 1, description: 'second' },
    ]
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows }) })
    const checkpoints = await getCheckpoints(db, sampleRow.session_id)
    expect(checkpoints[0]?.description).toBe('first')
    expect(checkpoints[1]?.description).toBe('second')
  })

  it('returns empty array when no checkpoints', async () => {
    const db = makeDb()
    const checkpoints = await getCheckpoints(db, 'unknown-session')
    expect(checkpoints).toHaveLength(0)
  })
})

describe('getCheckpoint', () => {
  it('returns null for unknown id', async () => {
    const db = makeDb()
    const result = await getCheckpoint(db, 'nonexistent-id')
    expect(result).toBeNull()
  })

  it('returns checkpoint when found', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    const ckpt = await getCheckpoint(db, sampleRow.id)
    expect(ckpt).not.toBeNull()
    expect(ckpt!.id).toBe(sampleRow.id)
  })
})

describe('restoreCheckpoint', () => {
  it('returns template and data for a valid checkpoint', async () => {
    const db = makeDb({ query: vi.fn().mockResolvedValue({ rows: [sampleRow] }) })
    const result = await restoreCheckpoint(db, sampleRow.id)
    expect(result.template).toBe(sampleRow.template_text)
    expect(result.data).toEqual(sampleRow.context_data)
  })

  it('returns empty data object when context_data is null', async () => {
    const db = makeDb({
      query: vi.fn().mockResolvedValue({ rows: [{ ...sampleRow, context_data: null }] }),
    })
    const result = await restoreCheckpoint(db, sampleRow.id)
    expect(result.data).toEqual({})
  })

  it('throws when checkpoint not found', async () => {
    const db = makeDb()
    await expect(restoreCheckpoint(db, 'nonexistent-id')).rejects.toThrow('not found')
  })
})
