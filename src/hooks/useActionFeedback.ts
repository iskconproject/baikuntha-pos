'use client';

import { useState, useCallback } from 'react';
import { useToast } from './useToast';
import { AppError, normalizeError } from '@/lib/errors/AppError';

export interface ActionState {
  isLoading: boolean;
  error: AppError | null;
  success: boolean;
}

export interface ActionOptions {
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  loadingMessage?: string;
  onSuccess?: () => void;
  onError?: (error: AppError) => void;
}

export function useActionFeedback() {
  const [state, setState] = useState<ActionState>({
    isLoading: false,
    error: null,
    success: false,
  });

  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const executeAction = useCallback(
    async <T>(
      action: () => Promise<T>,
      options: ActionOptions = {}
    ): Promise<T | null> => {
      const {
        successMessage,
        errorMessage,
        showToast = true,
        onSuccess,
        onError,
      } = options;

      setState({
        isLoading: true,
        error: null,
        success: false,
      });

      try {
        const result = await action();

        setState({
          isLoading: false,
          error: null,
          success: true,
        });

        if (showToast && successMessage) {
          showSuccessToast('Success', successMessage);
        }

        onSuccess?.();
        return result;
      } catch (error) {
        const appError = normalizeError(error);

        setState({
          isLoading: false,
          error: appError,
          success: false,
        });

        if (showToast) {
          showErrorToast(
            'Error',
            errorMessage || appError.getUserMessage()
          );
        }

        onError?.(appError);
        return null;
      }
    },
    [showSuccessToast, showErrorToast]
  );

  const clearState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: Error | AppError | string) => {
    const appError = typeof error === 'string' 
      ? new AppError(error, 'CUSTOM_ERROR', 400, error)
      : normalizeError(error);

    setState(prev => ({
      ...prev,
      error: appError,
      success: false,
    }));
  }, []);

  const setSuccess = useCallback((success: boolean = true) => {
    setState(prev => ({
      ...prev,
      success,
      error: success ? null : prev.error,
    }));
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    success: state.success,
    hasError: !!state.error,

    // Actions
    executeAction,
    clearState,
    setLoading,
    setError,
    setSuccess,
  };
}

// Higher-order hook for form submissions
export function useFormSubmission<T extends Record<string, any>>() {
  const actionFeedback = useActionFeedback();

  const submitForm = useCallback(
    async (
      formData: T,
      submitAction: (data: T) => Promise<any>,
      options: ActionOptions = {}
    ) => {
      return actionFeedback.executeAction(
        () => submitAction(formData),
        {
          successMessage: 'Form submitted successfully',
          errorMessage: 'Failed to submit form',
          ...options,
        }
      );
    },
    [actionFeedback]
  );

  return {
    ...actionFeedback,
    submitForm,
  };
}

// Hook for async operations with confirmation
export function useConfirmAction() {
  const actionFeedback = useActionFeedback();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: () => Promise<any>;
    options: ActionOptions;
  } | null>(null);

  const confirmAndExecute = useCallback(
    (action: () => Promise<any>, options: ActionOptions = {}) => {
      setPendingAction({ action, options });
      setShowConfirmation(true);
    },
    []
  );

  const executeConfirmedAction = useCallback(async () => {
    if (!pendingAction) return;

    setShowConfirmation(false);
    const result = await actionFeedback.executeAction(
      pendingAction.action,
      pendingAction.options
    );
    setPendingAction(null);
    return result;
  }, [pendingAction, actionFeedback]);

  const cancelAction = useCallback(() => {
    setShowConfirmation(false);
    setPendingAction(null);
  }, []);

  return {
    ...actionFeedback,
    showConfirmation,
    confirmAndExecute,
    executeConfirmedAction,
    cancelAction,
  };
}