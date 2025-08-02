'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // This would integrate with your error logging service
    // For now, we'll just log to console
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const errorReport = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    alert('Error report copied to clipboard. Please share this with support.');
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', showDetails = false } = this.props;
      const { error, errorInfo, errorId } = this.state;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200">
            <div className="p-6">
              {/* Error Icon */}
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              {/* Error Title */}
              <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {level === 'critical' ? 'Critical Error' : 'Something went wrong'}
              </h2>

              {/* Error Message */}
              <p className="text-sm text-gray-600 text-center mb-6">
                {level === 'critical'
                  ? 'A critical error occurred that requires a page reload.'
                  : level === 'page'
                  ? 'This page encountered an error. You can try refreshing or go back to the home page.'
                  : 'This component encountered an error. You can try again or refresh the page.'}
              </p>

              {/* Error Details (Development/Debug) */}
              {showDetails && error && (
                <div className="mb-6 p-3 bg-gray-50 rounded-md">
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                      Error Details (ID: {errorId})
                    </summary>
                    <div className="space-y-2">
                      <div>
                        <strong>Message:</strong>
                        <pre className="mt-1 text-red-600 whitespace-pre-wrap">{error.message}</pre>
                      </div>
                      {error.stack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="mt-1 text-gray-600 whitespace-pre-wrap text-xs overflow-x-auto">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {level === 'component' && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full"
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Try Again
                  </Button>
                )}

                {level === 'page' && (
                  <div className="space-y-2">
                    <Button
                      onClick={this.handleReload}
                      className="w-full"
                      icon={<RefreshCw className="w-4 h-4" />}
                    >
                      Refresh Page
                    </Button>
                    <Button
                      onClick={this.handleGoHome}
                      variant="outline"
                      className="w-full"
                      icon={<Home className="w-4 h-4" />}
                    >
                      Go to Home
                    </Button>
                  </div>
                )}

                {level === 'critical' && (
                  <Button
                    onClick={this.handleReload}
                    className="w-full"
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Reload Application
                  </Button>
                )}

                {/* Report Error Button */}
                <Button
                  onClick={this.handleReportError}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  icon={<Bug className="w-4 h-4" />}
                >
                  Report Error
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specialized error boundaries for different contexts
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="component" showDetails={process.env.NODE_ENV === 'development'}>
      {children}
    </ErrorBoundary>
  );
}

export function CriticalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="critical" showDetails={process.env.NODE_ENV === 'development'}>
      {children}
    </ErrorBoundary>
  );
}