import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AiPanel } from './AiPanel'

afterEach(cleanup)

describe('AiPanel', () => {
  it('renders AI Assistant heading', () => {
    render(<AiPanel />)
    expect(screen.getByText('AI Assistant')).toBeDefined()
  })

  it('renders placeholder message', () => {
    render(<AiPanel />)
    expect(screen.getByText('AI features coming in Phase 5')).toBeDefined()
  })
})
