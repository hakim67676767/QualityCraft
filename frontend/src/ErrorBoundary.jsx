import { Component } from 'react'

// Catches render errors anywhere in the tree below it and shows a recoverable
// message instead of blanking the whole single-page app. Without this, a single
// uncaught error in one view unmounts the React root and leaves a white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Keep the failure visible for support while staying out of the user's way.
    console.error('QualityCraft render error:', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div role="alert" className="error-boundary" style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '32px 20px', boxSizing: 'border-box', textAlign: 'center', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
        <div style={{ maxWidth: '420px' }}>
          <h1 style={{ margin: '0 0 12px', fontSize: '24px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', color: '#667085', fontSize: '15px', lineHeight: 1.6 }}>
            The page hit an unexpected error. Try reloading to continue your learning.
          </p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '11px 20px', border: 0, borderRadius: '6px', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
