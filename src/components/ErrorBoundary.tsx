import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. Defaults to a friendly crash screen. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * F-2 FIX — React Error Boundary
 * Catches unhandled render-time exceptions and shows a friendly fallback
 * instead of crashing the entire app to a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send this to an error-tracking service (Sentry, etc.)
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            padding: '2rem',
            background: 'var(--rs-bg, #0e1116)',
            color: 'var(--rs-ink, #d4dde8)',
            fontFamily: 'IBM Plex Mono, monospace',
            textAlign: 'center',
          }}
        >
          {/* Red signal lamp icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--rs-red-core, #e05252)',
              boxShadow: '0 0 24px var(--rs-red-core, #e05252)',
            }}
          />

          <div>
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Render Error
            </h1>
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--rs-muted, #617489)',
              }}
            >
              Something went wrong while rendering this view.
            </p>
          </div>

          {this.state.error && (
            <pre
              style={{
                maxWidth: '640px',
                overflow: 'auto',
                background: 'var(--rs-surface-2, #181d24)',
                border: '1px solid var(--rs-line, #2a3340)',
                borderRadius: 6,
                padding: '0.75rem 1rem',
                fontSize: '0.7rem',
                color: 'var(--rs-signal-red-text, #e05252)',
                textAlign: 'left',
                lineHeight: 1.5,
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--rs-brass, #b49040)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
