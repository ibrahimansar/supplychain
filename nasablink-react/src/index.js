import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global error boundary to suppress ResizeObserver errors
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    const roPatterns = [
      /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
      /ResizeObserver loop/i,
      /ResizeObserver.*loop/i,
      /loop.*ResizeObserver/i
    ];

    const isResizeObserverError = error?.message && (
      roPatterns.some(pattern => pattern.test(error.message)) ||
      error.name === 'ResizeObserverLoopError'
    );

    if (isResizeObserverError) {
      // Silently ignore ResizeObserver errors
      return { hasError: false };
    }

    // For other errors, show the error boundary
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const roPatterns = [
      /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
      /ResizeObserver loop/i,
      /ResizeObserver.*loop/i,
      /loop.*ResizeObserver/i
    ];

    const isResizeObserverError = error?.message && (
      roPatterns.some(pattern => pattern.test(error.message)) ||
      error.name === 'ResizeObserverLoopError'
    );

    if (isResizeObserverError) {
      // Silently ignore ResizeObserver errors
      return;
    }

    // For other errors, log them
    console.error('Global Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}

// Suppress benign ResizeObserver errors seen in Chrome when layout updates
// occur during observation cycles (common with graph/layout libraries).
if (typeof window !== 'undefined') {
  const roPatterns = [
    /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
    /ResizeObserver loop/i,
    /ResizeObserver.*loop/i,
    /loop.*ResizeObserver/i
  ];

  const isResizeObserverError = (arg) => {
    if (typeof arg === 'string') {
      return roPatterns.some(pattern => pattern.test(arg));
    }
    if (arg && typeof arg.message === 'string') {
      return roPatterns.some(pattern => pattern.test(arg.message));
    }
    if (arg && arg.name === 'ResizeObserverLoopError') {
      return true;
    }
    return false;
  };

  // Override console methods to suppress ResizeObserver errors
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args) => {
    if (args.some(isResizeObserverError)) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args) => {
    if (args.some(isResizeObserverError)) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Also suppress unhandled errors and promise rejections
  window.addEventListener('error', (event) => {
    if (isResizeObserverError(event.message) || isResizeObserverError(event.error)) {
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (isResizeObserverError(event.reason) || isResizeObserverError(event.reason.message))) {
      event.preventDefault();
      return false;
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
