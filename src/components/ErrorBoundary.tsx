import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { sanitizeErrorMessage } from '../utils/sanitize';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = sanitizeErrorMessage(
      error,
      'An unexpected application error occurred.'
    );
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(_error: unknown, _errorInfo: React.ErrorInfo): void {
    // Error details intentionally masked from browser console and DOM in production
  }

  handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex items-center justify-center p-6"
          style={{
            backgroundColor: '#0a0a0c',
            color: '#f4f4f5',
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="max-w-md w-full rounded-2xl border border-red-500/30 bg-neutral-900/90 p-6 text-center shadow-2xl"
            style={{
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: '#17171c',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '1rem',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400"
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                color: '#f87171',
              }}
            >
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-white mb-2" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
              Something went wrong rendering Niruvi Store
            </h1>
            <p className="text-xs text-neutral-300 leading-relaxed mb-5" style={{ fontSize: '0.75rem', color: '#d4d4d8', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              {this.state.errorMessage || 'An unexpected client-side error occurred.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const log = `[${new Date().toISOString()}] CLIENT RENDER ERROR\nMessage: ${this.state.errorMessage}`;
                    navigator.clipboard.writeText(log);
                    alert('Client error log copied to clipboard.');
                  } catch {}
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 text-neutral-200 font-mono text-xs hover:bg-neutral-700 transition-colors cursor-pointer border border-neutral-700"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#26262e',
                  color: '#e4e4e7',
                  fontSize: '0.75rem',
                  border: '1px solid #3f3f46',
                  cursor: 'pointer',
                }}
              >
                Copy Error Log
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
