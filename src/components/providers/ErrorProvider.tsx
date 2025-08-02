'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { NetworkErrorIndicator } from '@/hooks/useNetworkError';
import { globalErrorHandler } from '@/lib/errors/globalErrorHandler';
import { CriticalErrorBoundary } from '@/components/ui/ErrorBoundary';

interface ErrorContextType {
  reportError: (error: Error, context?: Record<string, any>) => string;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useErrorReporting() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorReporting must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    // Initialize global error handling
    globalErrorHandler.initialize();

    return () => {
      globalErrorHandler.cleanup();
    };
  }, []);

  const reportError = (error: Error, context?: Record<string, any>) => {
    return globalErrorHandler.reportError(error, context);
  };

  const contextValue: ErrorContextType = {
    reportError,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      <CriticalErrorBoundary>
        {children}
        
        {/* Global UI Components */}
        <NetworkErrorIndicator />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </CriticalErrorBoundary>
    </ErrorContext.Provider>
  );
}