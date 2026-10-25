/**
 * Error reporting utility for client-side error monitoring
 */

import { API_BASE_URL } from '../config/env';

class ErrorReporter {
    constructor() {
        this.errors = [];
        this.maxErrors = 50; // Limit stored errors to prevent memory issues
        this.reportingEnabled = true;

        // Set up global error handlers
        this.setupGlobalHandlers();
    }

    /**
     * Set up global error handlers for unhandled errors
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError(event.reason, {
                type: 'unhandledrejection',
                source: 'promise'
            });
        });

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.captureError(event.error, {
                type: 'uncaughterror',
                source: 'global',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Handle React errors (if using ErrorBoundary)
        window.addEventListener('reactError', (event) => {
            this.captureError(event.detail.error, {
                type: 'react',
                componentStack: event.detail.componentStack
            });
        });
    }

    /**
     * Capture and report an error
     * @param {Error} error - The error object
     * @param {Object} context - Additional context information
     */
    captureError(error, context = {}) {
        if (!this.reportingEnabled) return;

        // Suppress benign ResizeObserver errors
        const roPattern = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i;
        if (roPattern.test(error?.message || '')) {
            return; // Silently ignore ResizeObserver loop errors
        }

        const errorData = {
            message: error?.message || 'Unknown error',
            stack: error?.stack || '',
            name: error?.name || 'Error',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: this.getCurrentUserId(),
            sessionId: this.getSessionId(),
            ...context
        };

        // Store error locally
        this.errors.push(errorData);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift(); // Remove oldest error
        }

        // Report to backend
        this.reportToBackend(errorData);

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error captured:', errorData);
        }
    }

    /**
     * Report error to backend monitoring endpoint
     * @param {Object} errorData - The error data to report
     */
    async reportToBackend(errorData) {
        // Server-side error/performance monitoring (/monitoring/*) was not ported to CAP.
        if (!process.env.REACT_APP_ENABLE_MONITORING) return;
        try {
            const response = await fetch(`${API_BASE_URL}/monitoring/errors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(errorData),
                // Don't block the main thread
                keepalive: true
            });

            if (!response.ok) {
                console.warn('Failed to report error to backend:', response.status);
            }
        } catch (fetchError) {
            // Silently fail if we can't report the error
            console.warn('Error reporting failed:', fetchError);
        }
    }

    /**
     * Get current user ID from local storage or context
     */
    getCurrentUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.uid || null;
        } catch {
            return null;
        }
    }

    /**
     * Get or create session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    /**
     * Manually report an error
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Additional context
     */
    report(error, context = {}) {
        const errorObj = error instanceof Error ? error : new Error(error);
        this.captureError(errorObj, { type: 'manual', ...context });
    }

    /**
     * Get stored errors (for debugging)
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * Clear stored errors
     */
    clearErrors() {
        this.errors = [];
    }

    /**
     * Enable or disable error reporting
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.reportingEnabled = enabled;
    }

    /**
     * Send performance metrics
     * @param {Object} metrics - Performance metrics
     */
    reportPerformance(metrics) {
        if (!this.reportingEnabled) return;

        const performanceData = {
            ...metrics,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: this.getCurrentUserId(),
            sessionId: this.getSessionId()
        };

        if (!process.env.REACT_APP_ENABLE_MONITORING) return;
        fetch(`${API_BASE_URL}/monitoring/performance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(performanceData),
            keepalive: true
        }).catch(() => {
            // Silently fail
        });
    }
}

// Create singleton instance
const errorReporter = new ErrorReporter();

export default errorReporter;

// Export convenience functions
export const reportError = (error, context) => errorReporter.report(error, context);
export const reportPerformance = (metrics) => errorReporter.reportPerformance(metrics);
