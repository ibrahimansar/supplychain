import React from 'react';
import { ERROR_TYPES } from '../contexts/ErrorContext';
import errorReporter from '../utils/errorReporter';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Suppress benign ResizeObserver errors
    const roPattern = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i;
    if (roPattern.test(error.message)) {
      // Silently ignore ResizeObserver loop errors
      return;
    }

    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report error to error monitoring service
    errorReporter.captureError(error, {
      type: 'react_error',
      componentStack: errorInfo.componentStack,
      source: 'error_boundary'
    });

    // Store error details
    this.setState({
      error,
      errorInfo
    });

    // Report error to global error handler if available
    if (this.props.onError) {
      this.props.onError({
        type: ERROR_TYPES.UNKNOWN,
        message: error.message,
        userMessage: 'Something went wrong with this component. Please refresh the page.',
        originalError: error,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          retry: this.handleRetry
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ms-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
