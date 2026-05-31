import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelLoadProgress } from './ModelLoadProgress.js'

describe('ModelLoadProgress', () => {
  it('renders the model id in the label', () => {
    render(<ModelLoadProgress modelId="Qwen2.5-Coder-3B" progress={0} />)
    expect(screen.getByText(/Qwen2\.5-Coder-3B/)).toBeDefined()
  })

  it('shows 0% when progress is 0', () => {
    render(<ModelLoadProgress modelId="model" progress={0} />)
    expect(screen.getByText('0%')).toBeDefined()
    const bar = screen.getByTestId('progress-bar')
    expect(bar.style.width).toBe('0%')
  })

  it('shows 50% when progress is 0.5', () => {
    render(<ModelLoadProgress modelId="model" progress={0.5} />)
    expect(screen.getByText('50%')).toBeDefined()
    const bar = screen.getByTestId('progress-bar')
    expect(bar.style.width).toBe('50%')
  })

  it('shows custom text when provided', () => {
    render(<ModelLoadProgress modelId="model" progress={0.3} text="Loading model (300/1000 MB)" />)
    expect(screen.getByText('Loading model (300/1000 MB)')).toBeDefined()
  })

  it('clamps progress bar to 100% max', () => {
    render(<ModelLoadProgress modelId="model" progress={1.5} />)
    const bar = screen.getByTestId('progress-bar')
    expect(bar.style.width).toBe('100%')
  })
})
