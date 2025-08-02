import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkError } from '@/hooks/useNetworkError';

// Mock useToast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('useNetworkError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    navigator.onLine = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with online state', () => {
    const { result } = renderHook(() => useNetworkError());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.hasNetworkError).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastError).toBe(null);
  });

  it('should initialize with offline state when navigator is offline', () => {
    navigator.onLine = false;
    const { result } = renderHook(() => useNetworkError());

    expect(result.current.isOnline).toBe(false);
  });

  it('should set network error', () => {
    const { result } = renderHook(() => useNetworkError());
    const testError = new Error('Network error');

    act(() => {
      result.current.setNetworkError(testError);
    });

    expect(result.current.hasNetworkError).toBe(true);
    expect(result.current.lastError).toBe(testError);
  });

  it('should clear network error', () => {
    const { result } = renderHook(() => useNetworkError());
    const testError = new Error('Network error');

    act(() => {
      result.current.setNetworkError(testError);
    });

    expect(result.current.hasNetworkError).toBe(true);

    act(() => {
      result.current.clearNetworkError();
    });

    expect(result.current.hasNetworkError).toBe(false);
    expect(result.current.lastError).toBe(null);
    expect(result.current.retryCount).toBe(0);
  });

  it('should retry operation with exponential backoff', async () => {
    const { result } = renderHook(() => useNetworkError());
    let attemptCount = 0;
    const mockOperation = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Attempt ${attemptCount} failed`);
      }
      return Promise.resolve('success');
    });

    let operationResult: any;
    await act(async () => {
      operationResult = await result.current.retryWithBackoff(mockOperation, {
        maxRetries: 3,
        retryDelay: 100,
        backoffMultiplier: 2,
      });
    });

    expect(mockOperation).toHaveBeenCalledTimes(3);
    expect(operationResult).toBe('success');
  });

  it('should fail after max retries', async () => {
    const { result } = renderHook(() => useNetworkError());
    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

    await act(async () => {
      try {
        await result.current.retryWithBackoff(mockOperation, {
          maxRetries: 2,
          retryDelay: 10,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Always fails');
      }
    });

    expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(result.current.hasNetworkError).toBe(true);
  });

  it('should check connectivity', async () => {
    const { result } = renderHook(() => useNetworkError());
    
    mockFetch.mockResolvedValueOnce({ ok: true });

    let isConnected: boolean;
    await act(async () => {
      isConnected = await result.current.checkConnectivity();
    });

    expect(isConnected).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
    });
  });

  it('should return false when connectivity check fails', async () => {
    const { result } = renderHook(() => useNetworkError());
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    let isConnected: boolean;
    await act(async () => {
      isConnected = await result.current.checkConnectivity();
    });

    expect(isConnected).toBe(false);
  });

  it('should fetch with retry', async () => {
    const { result } = renderHook(() => useNetworkError());
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'test' }) };
    
    mockFetch.mockResolvedValueOnce(mockResponse);

    let response: any;
    await act(async () => {
      response = await result.current.fetchWithRetry('/api/test');
    });

    expect(response).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should throw error for non-ok response', async () => {
    const { result } = renderHook(() => useNetworkError());
    const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
    
    mockFetch.mockResolvedValueOnce(mockResponse);

    await act(async () => {
      try {
        await result.current.fetchWithRetry('/api/test');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('HTTP 404: Not Found');
      }
    });
  });

  it('should call retry callback', async () => {
    const { result } = renderHook(() => useNetworkError());
    const onRetry = vi.fn();
    let attemptCount = 0;
    
    const mockOperation = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Retry test');
      }
      return Promise.resolve('success');
    });

    await act(async () => {
      await result.current.retryWithBackoff(mockOperation, {
        maxRetries: 2,
        retryDelay: 10,
        onRetry,
      });
    });

    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it('should call max retries reached callback', async () => {
    const { result } = renderHook(() => useNetworkError());
    const onMaxRetriesReached = vi.fn();
    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

    await act(async () => {
      try {
        await result.current.retryWithBackoff(mockOperation, {
          maxRetries: 1,
          retryDelay: 10,
          onMaxRetriesReached,
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(onMaxRetriesReached).toHaveBeenCalledOnce();
  });
});