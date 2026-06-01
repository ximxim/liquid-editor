import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExec, mockQuery, MockPGlite } = vi.hoisted(() => {
  const mockExec = vi.fn().mockResolvedValue([])
  const mockQuery = vi.fn().mockResolvedValue({ rows: [] })
  const MockPGlite = vi.fn().mockImplementation(() => ({ exec: mockExec, query: mockQuery }))
  return { mockExec, mockQuery, MockPGlite }
})

vi.mock('@electric-sql/pglite', () => ({ PGlite: MockPGlite }))

import { initDatabase } from './db.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockExec.mockResolvedValue([])
  mockQuery.mockResolvedValue({ rows: [] })
})

describe('initDatabase', () => {
  it('resolves and returns a db instance', async () => {
    const db = await initDatabase()
    expect(db).toBeDefined()
    expect(typeof db.exec).toBe('function')
    expect(typeof db.query).toBe('function')
  })

  it('constructs PGlite with the correct dataDir', async () => {
    await initDatabase()
    expect(MockPGlite).toHaveBeenCalledWith('idb://liquid-ai-editor')
  })

  it('creates sessions table', async () => {
    await initDatabase()
    const sql = mockExec.mock.calls[0]?.[0] as string
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sessions')
  })

  it('creates messages table', async () => {
    await initDatabase()
    const sql = mockExec.mock.calls[0]?.[0] as string
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS messages')
  })

  it('creates checkpoints table', async () => {
    await initDatabase()
    const sql = mockExec.mock.calls[0]?.[0] as string
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS checkpoints')
  })
})
