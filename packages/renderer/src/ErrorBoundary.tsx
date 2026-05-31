import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Intentionally silent — caller receives error UI via render
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          data-testid="error-boundary"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '12px 16px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <strong>Template Error:</strong> {this.state.error.message}
        </div>
      )
    }

    return this.props.children
  }
}
