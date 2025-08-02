"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "./useToast";

export interface NetworkErrorState {
  isOnline: boolean;
  hasNetworkError: boolean;
  retryCount: number;
  lastError: Error | null;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

export function useNetworkError() {
  const [state, setState] = useState<NetworkErrorState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    hasNetworkError: false,
    retryCount: 0,
    lastError: null,
  });

  const {
    error: showErrorToast,
    warning: showWarningToast,
    success: showSuccessToast,
  } = useToast();

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true, hasNetworkError: false }));
      showSuccessToast("Connection restored", "You are back online");
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false, hasNetworkError: true }));
      showWarningToast("Connection lost", "Working in offline mode");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showErrorToast, showWarningToast, showSuccessToast]);

  // Set network error
  const setNetworkError = useCallback((error: Error) => {
    setState((prev) => ({
      ...prev,
      hasNetworkError: true,
      lastError: error,
    }));
  }, []);

  // Clear network error
  const clearNetworkError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasNetworkError: false,
      lastError: null,
      retryCount: 0,
    }));
  }, []);

  // Retry with exponential backoff
  const retryWithBackoff = useCallback(
    async function <T>(
      operation: () => Promise<T>,
      options: RetryOptions = {}
    ): Promise<T> {
      const {
        maxRetries = 3,
        retryDelay = 1000,
        backoffMultiplier = 2,
        onRetry,
        onMaxRetriesReached,
      } = options;

      let lastError: Error;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          const result = await operation();

          // Success - clear any previous errors
          if (attempt > 0) {
            clearNetworkError();
            showSuccessToast(
              "Operation successful",
              "The operation completed after retry"
            );
          }

          return result;
        } catch (error) {
          lastError = error as Error;
          attempt++;

          setState((prev) => ({ ...prev, retryCount: attempt }));

          if (attempt <= maxRetries) {
            onRetry?.(attempt);

            // Calculate delay with exponential backoff
            const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);

            showWarningToast(
              `Retry attempt ${attempt}`,
              `Retrying in ${delay / 1000} seconds...`
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // Max retries reached
      setNetworkError(lastError!);
      onMaxRetriesReached?.();

      showErrorToast(
        "Operation failed",
        `Failed after ${maxRetries} attempts. Please check your connection.`,
        {
          action: {
            label: "Retry",
            onClick: () => retryWithBackoff(operation, options),
          },
        }
      );

      throw lastError!;
    },
    [
      clearNetworkError,
      setNetworkError,
      showErrorToast,
      showWarningToast,
      showSuccessToast,
    ]
  );

  // Check network connectivity
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Handle fetch with automatic retry
  const fetchWithRetry = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      retryOptions?: RetryOptions
    ): Promise<Response> => {
      return retryWithBackoff(async () => {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      }, retryOptions);
    },
    [retryWithBackoff]
  );

  return {
    // State
    isOnline: state.isOnline,
    hasNetworkError: state.hasNetworkError,
    retryCount: state.retryCount,
    lastError: state.lastError,

    // Actions
    setNetworkError,
    clearNetworkError,
    retryWithBackoff,
    checkConnectivity,
    fetchWithRetry,
  };
}

// Network error component
export function NetworkErrorIndicator() {
  const { isOnline, hasNetworkError } = useNetworkError();

  if (isOnline && !hasNetworkError) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm">
      {!isOnline ? (
        <span>⚠️ You are offline. Changes will be saved locally.</span>
      ) : (
        <span>⚠️ Network issues detected. Some features may be limited.</span>
      )}
    </div>
  );
}
