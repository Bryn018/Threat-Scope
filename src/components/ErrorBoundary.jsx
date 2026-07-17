import { Component } from 'react'
import { captureException } from '../utils/errorReporting'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Threat Scope runtime error:', error, info)
    captureException(error, { componentStack: info?.componentStack })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold text-fg">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            The dashboard hit an unexpected error while loading. Your data and session are safe — try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg border border-sky-500/70 bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:bg-sky-500/20"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
