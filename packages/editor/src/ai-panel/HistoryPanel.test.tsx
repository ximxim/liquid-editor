import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { HistoryPanel } from './HistoryPanel'

const mockLoadCheckpoints = vi.fn()
const mockRestoreFromCheckpoint = vi.fn()

vi.mock('../context/EditorContext.js', () => ({
  useEditorContext: () => ({
    loadCheckpoints: mockLoadCheckpoints,
    restoreFromCheckpoint: mockRestoreFromCheckpoint,
    template: '',
    data: {},
    schema: null,
    selectedElement: null,
    updateTemplate: vi.fn(),
    updateData: vi.fn(),
    setSelectedElement: vi.fn(),
  }),
}))

const sampleCheckpoints = [
  {
    id: 'ckpt-1',
    sessionId: 'sess-1',
    templateText: '<h1>{{ title }}</h1>',
    description: 'Initial draft',
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    seq: 0,
  },
  {
    id: 'ckpt-2',
    sessionId: 'sess-1',
    templateText: '<h2>Updated</h2>',
    description: 'Added header',
    createdAt: new Date('2024-01-01T11:00:00.000Z'),
    seq: 1,
  },
]

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadCheckpoints.mockResolvedValue([])
  mockRestoreFromCheckpoint.mockResolvedValue(undefined)
})

describe('HistoryPanel', () => {
  it('shows empty state when no checkpoints exist', async () => {
    mockLoadCheckpoints.mockResolvedValue([])

    await act(async () => {
      render(<HistoryPanel />)
      await Promise.resolve()
    })

    expect(screen.getByText('No checkpoints yet')).toBeDefined()
  })

  it('renders checkpoint list with descriptions and timestamps', async () => {
    mockLoadCheckpoints.mockResolvedValue(sampleCheckpoints)

    await act(async () => {
      render(<HistoryPanel />)
      await Promise.resolve()
    })

    expect(screen.getByText('Initial draft')).toBeDefined()
    expect(screen.getByText('Added header')).toBeDefined()
  })

  it('clicking a checkpoint calls restoreFromCheckpoint with its id', async () => {
    mockLoadCheckpoints.mockResolvedValue(sampleCheckpoints)

    await act(async () => {
      render(<HistoryPanel />)
      await Promise.resolve()
    })

    const firstCheckpoint = screen.getByTestId('checkpoint-ckpt-1')
    await act(async () => {
      fireEvent.click(firstCheckpoint)
      await Promise.resolve()
    })

    expect(mockRestoreFromCheckpoint).toHaveBeenCalledWith('ckpt-1')
  })

  it('renders buttons for each checkpoint', async () => {
    mockLoadCheckpoints.mockResolvedValue(sampleCheckpoints)

    await act(async () => {
      render(<HistoryPanel />)
      await Promise.resolve()
    })

    const panel = screen.getByTestId('history-panel')
    const buttons = panel.querySelectorAll('button')
    expect(buttons.length).toBe(2)
  })

  it('uses seq number as fallback description when description is missing', async () => {
    const ckptsWithoutDesc = [
      {
        id: 'ckpt-nodesc',
        sessionId: 'sess-1',
        templateText: '<p>x</p>',
        description: undefined,
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        seq: 0,
      },
    ]
    mockLoadCheckpoints.mockResolvedValue(ckptsWithoutDesc)

    await act(async () => {
      render(<HistoryPanel />)
      await Promise.resolve()
    })

    expect(screen.getByText('Checkpoint #0')).toBeDefined()
  })
})
