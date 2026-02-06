'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of the crashed component tree.
 *
 * Features:
 * - Catches and displays errors gracefully
 * - Custom fallback UI support
 * - Error reporting to Sentry (if configured)
 * - Retry functionality to attempt recovery
 * - Development mode shows error details
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      if (win.Sentry) {
        const Sentry = win.Sentry as {
          captureException: (error: Error, context?: { extra: ErrorInfo }) => void;
        };
        Sentry.captureException(error, { extra: errorInfo });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-[400px] flex items-center justify-center p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white border rounded-lg p-8 text-center shadow-sm">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try again or contact support.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="p-3 bg-red-50 rounded-lg text-sm text-red-800 overflow-auto max-h-32 mb-4 text-left">
                {this.state.error.message}
                {this.state.error.stack && (
                  <>
                    {'\n\n'}
                    {this.state.error.stack}
                  </>
                )}
              </pre>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors touch-target"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try Again
              </button>
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors touch-target"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with ErrorBoundary.
 * Useful for wrapping page-level components or route boundaries.
 *
 * @example
 * const SafePage = withErrorBoundary(MyPage, { onError: logError });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function ComponentWithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

/**
 * Minimal error fallback component for use in sections that should
 * degrade gracefully without affecting the entire page.
 */
export function SectionErrorFallback({
  title = 'Unable to load',
  onRetry,
}: {
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="p-4 border border-red-200 rounded-lg bg-red-50 text-center"
      role="alert"
    >
      <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" aria-hidden="true" />
      <p className="text-sm text-red-700 mb-2">{title}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 underline hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Try again
        </button>
      )}
    </div>
  );
}
