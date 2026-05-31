import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QuestionFlow } from './QuestionFlow.js'
import { QuestionFlowArgsSchema, QuestionFlowReceiptSchema } from './schema.js'

afterEach(cleanup)

const DEFAULT_PROPS = {
  question: 'Which layout do you prefer?',
  options: [
    { id: 'opt-1', label: 'Single column', description: 'A simple vertical layout' },
    { id: 'opt-2', label: 'Two columns', description: 'Side-by-side layout' },
    { id: 'opt-3', label: 'Grid' },
  ],
  onChange: vi.fn(),
}

describe('QuestionFlow', () => {
  it('renders question and all option cards', () => {
    render(<QuestionFlow {...DEFAULT_PROPS} onChange={vi.fn()} />)
    expect(screen.getByText('Which layout do you prefer?')).toBeDefined()
    expect(screen.getByText('Single column')).toBeDefined()
    expect(screen.getByText('Two columns')).toBeDefined()
    expect(screen.getByText('Grid')).toBeDefined()
    expect(screen.getByText('A simple vertical layout')).toBeDefined()
  })

  it('clicking an option calls onChange with selectedId', () => {
    const onChange = vi.fn()
    render(<QuestionFlow {...DEFAULT_PROPS} onChange={onChange} />)
    const card = screen.getByText('Two columns').closest('[role="button"]')
    expect(card).toBeDefined()
    fireEvent.click(card!)
    expect(onChange).toHaveBeenCalledWith({ selectedId: 'opt-2' })
  })

  it('clicking a different option updates the selection', () => {
    const onChange = vi.fn()
    render(<QuestionFlow {...DEFAULT_PROPS} onChange={onChange} />)
    fireEvent.click(screen.getByText('Single column').closest('[role="button"]')!)
    fireEvent.click(screen.getByText('Grid').closest('[role="button"]')!)
    expect(onChange).toHaveBeenLastCalledWith({ selectedId: 'opt-3' })
  })

  it('args schema validates correctly', () => {
    const result = QuestionFlowArgsSchema.safeParse({
      question: 'Pick one',
      options: [{ id: 'a', label: 'Option A' }],
    })
    expect(result.success).toBe(true)
  })

  it('args schema rejects missing question', () => {
    const result = QuestionFlowArgsSchema.safeParse({ options: [] })
    expect(result.success).toBe(false)
  })

  it('receipt schema validates correctly', () => {
    const receipt = QuestionFlowReceiptSchema.parse({ selectedId: 'opt-1' })
    expect(receipt).toEqual({ selectedId: 'opt-1' })
  })
})
