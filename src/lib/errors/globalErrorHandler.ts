import { errorLogger } from '@/services/logging/errorLogger';
import { AppError, normalizeError } from './AppError';

/**
 * Global error handler for unhandled errors and promise rejections
 */
class GlobalErrorHandler {
  private initialized = false;

  /**
   * Initialize global error handling
   */
  initialize() {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    // Handle unhandled JavaScript errors
    window.addEventListener('error', this.handleError);

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);

    this.initialized = true;
  }

  /**
   * Clean up global error handlers
   */
  cleanup() {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);

    this.initialized = false;
  }

  /**
   * Handle JavaScript errors
   */
  private handleError = (event: ErrorEvent) => {
    const error = normalizeError(event.error || new Error(event.message));
    
    errorLogger.logError(error, {
      url: event.filename,
      line: event.lineno,
      column: event.colno,
      component: 'GlobalErrorHandler',
      action: 'unhandled_error',
    });

    // Prevent default browser error handling in production
    if (process.env.NODE_ENV === 'production') {
      event.preventDefault();
    }
  };

  /**
   * Handle unhandled promise rejections
   */
  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const error = normalizeError(event.reason);
    
    errorLogger.logError(error, {
      component: 'GlobalErrorHandler',
      action: 'unhandled_promise_rejection',
    });

    // Prevent default browser handling in production
    if (process.env.NODE_ENV === 'production') {
      event.preventDefault();
    }
  };

  /**
   * Manually report an error
   */
  reportError(error: Error | AppError, context?: Record<string, any>) {
    const normalizedError = normalizeError(error);
    return errorLogger.logError(normalizedError, {
      ...context,
      component: 'ManualReport',
      action: 'manual_error_report',
    });
  }
}

export const globalErrorHandler = new GlobalErrorHandler();