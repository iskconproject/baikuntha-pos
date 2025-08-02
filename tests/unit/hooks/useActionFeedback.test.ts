import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionFeedback, useFormSubmission, useConfirmAction } from '@/hooks/useActionFeedback';
import { AppError } from '@/lib/errors/AppError';

// Mock useToast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useActionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useActionFeedback());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should execute successful action', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockAction = vi.fn().mockResolvedValue('success result');
    const mockOnSuccess = vi.fn();

    let actionResult: any;
    await act(async () => {
      actionResult = await result.current.executeAction(mockAction, {
        successMessage: 'Action completed',
        onSuccess: mockOnSuccess,
      });
    });

    expect(mockAction).toHaveBeenCalledOnce();
    expect(mockOnSuccess).toHaveBeenCalledOnce();
    expect(actionResult).toBe('success result');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle action failure', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockError = new Error('Action failed');
    const mockAction = vi.fn().mockRejectedValue(mockError);
    const mockOnError = vi.fn();

    let actionResult: any;
    await act(async () => {
      actionResult = await result.current.executeAction(mockAction, {
        errorMessage: 'Action failed',
        onError: mockOnError,
      });
    });

    expect(mockAction).toHaveBeenCalledOnce();
    expect(mockOnError).toHaveBeenCalledWith(expect.any(AppError));
    expect(actionResult).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).toBeInstanceOf(AppError);
  });

  it('should set loading state during action execution', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockAction = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('result'), 100))
    );

    const actionPromise = act(async () => {
      return result.current.executeAction(mockAction);
    });

    // Check loading state is set
    expect(result.current.isLoading).toBe(true);

    await actionPromise;

    expect(result.current.isLoading).toBe(false);
  });

  it('should clear state', () => {
    const { result } = renderHook(() => useActionFeedback());

    act(() => {
      result.current.setError('Test error');
      result.current.setSuccess(true);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.success).toBe(true);

    act(() => {
      result.current.clearState();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should set loading state manually', () => {
    const { result } = renderHook(() => useActionFeedback());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set error manually', () => {
    const { result } = renderHook(() => useActionFeedback());

    act(() => {
      result.current.setError('Test error message');
    });

    expect(result.current.error).toBeInstanceOf(AppError);
    expect(result.current.error?.message).toBe('Test error message');
    expect(result.current.hasError).toBe(true);
    expect(result.current.success).toBe(false);
  });

  it('should set success state manually', () => {
    const { result } = renderHook(() => useActionFeedback());

    act(() => {
      result.current.setSuccess(true);
    });

    expect(result.current.success).toBe(true);

    act(() => {
      result.current.setSuccess(false);
    });

    expect(result.current.success).toBe(false);
  });

  it('should clear error when setting success', () => {
    const { result } = renderHook(() => useActionFeedback());

    act(() => {
      result.current.setError('Test error');
      result.current.setSuccess(true);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(true);
  });
});

describe('useFormSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit form successfully', async () => {
    const { result } = renderHook(() => useFormSubmission());
    const formData = { name: 'John', email: 'john@example.com' };
    const mockSubmitAction = vi.fn().mockResolvedValue('success');

    let submitResult: any;
    await act(async () => {
      submitResult = await result.current.submitForm(
        formData,
        mockSubmitAction,
        { successMessage: 'Form submitted' }
      );
    });

    expect(mockSubmitAction).toHaveBeenCalledWith(formData);
    expect(submitResult).toBe('success');
    expect(result.current.success).toBe(true);
  });

  it('should handle form submission failure', async () => {
    const { result } = renderHook(() => useFormSubmission());
    const formData = { name: 'John', email: 'john@example.com' };
    const mockSubmitAction = vi.fn().mockRejectedValue(new Error('Submission failed'));

    let submitResult: any;
    await act(async () => {
      submitResult = await result.current.submitForm(
        formData,
        mockSubmitAction
      );
    });

    expect(mockSubmitAction).toHaveBeenCalledWith(formData);
    expect(submitResult).toBe(null);
    expect(result.current.hasError).toBe(true);
  });
});

describe('useConfirmAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show confirmation dialog', () => {
    const { result } = renderHook(() => useConfirmAction());
    const mockAction = vi.fn().mockResolvedValue('result');

    act(() => {
      result.current.confirmAndExecute(mockAction, {
        successMessage: 'Action completed',
      });
    });

    expect(result.current.showConfirmation).toBe(true);
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should execute confirmed action', async () => {
    const { result } = renderHook(() => useConfirmAction());
    const mockAction = vi.fn().mockResolvedValue('result');

    act(() => {
      result.current.confirmAndExecute(mockAction);
    });

    expect(result.current.showConfirmation).toBe(true);

    let actionResult: any;
    await act(async () => {
      actionResult = await result.current.executeConfirmedAction();
    });

    expect(mockAction).toHaveBeenCalledOnce();
    expect(actionResult).toBe('result');
    expect(result.current.showConfirmation).toBe(false);
    expect(result.current.success).toBe(true);
  });

  it('should cancel action', () => {
    const { result } = renderHook(() => useConfirmAction());
    const mockAction = vi.fn().mockResolvedValue('result');

    act(() => {
      result.current.confirmAndExecute(mockAction);
    });

    expect(result.current.showConfirmation).toBe(true);

    act(() => {
      result.current.cancelAction();
    });

    expect(result.current.showConfirmation).toBe(false);
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should not execute action if no pending action', async () => {
    const { result } = renderHook(() => useConfirmAction());

    let actionResult: any;
    await act(async () => {
      actionResult = await result.current.executeConfirmedAction();
    });

    expect(actionResult).toBeUndefined();
  });
});