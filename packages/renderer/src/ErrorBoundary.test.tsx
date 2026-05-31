import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(() => {
  cleanup()
})

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error')
  }
  return <div data-testid="normal-child">Normal content</div>
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByTestId('normal-child')).toBeDefined()
    expect(screen.getByText('Normal content')).toBeDefined()
  })

  it('shows friendly error UI when child throws during render', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('error-boundary')).toBeDefined()
    expect(screen.getByText(/Template Error:/)).toBeDefined()
    expect(screen.getByText(/Test render error/)).toBeDefined()

    consoleError.mockRestore()
  })

  it('error UI has role="alert" for accessibility', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeDefined()

    consoleError.mockRestore()
  })
})
