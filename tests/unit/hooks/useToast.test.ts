import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '@/hooks/useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast with addToast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({
        type: 'success',
        title: 'Test Toast',
        message: 'Test message',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      title: 'Test Toast',
      message: 'Test message',
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('should add multiple toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({
        type: 'success',
        title: 'Toast 1',
      });
      result.current.addToast({
        type: 'error',
        title: 'Toast 2',
      });
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].title).toBe('Toast 1');
    expect(result.current.toasts[1].title).toBe('Toast 2');
  });

  it('should remove a toast by id', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;
    
    act(() => {
      toastId = result.current.addToast({
        type: 'success',
        title: 'Test Toast',
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should remove all toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({ type: 'success', title: 'Toast 1' });
      result.current.addToast({ type: 'error', title: 'Toast 2' });
      result.current.addToast({ type: 'warning', title: 'Toast 3' });
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.removeAllToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should add success toast with convenience method', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.success('Success Title', 'Success message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      title: 'Success Title',
      message: 'Success message',
    });
  });

  it('should add error toast with convenience method and longer duration', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.error('Error Title', 'Error message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'error',
      title: 'Error Title',
      message: 'Error message',
      duration: 7000,
    });
  });

  it('should add warning toast with convenience method', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.warning('Warning Title', 'Warning message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'warning',
      title: 'Warning Title',
      message: 'Warning message',
    });
  });

  it('should add info toast with convenience method', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.info('Info Title', 'Info message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'info',
      title: 'Info Title',
      message: 'Info message',
    });
  });

  it('should override default options with convenience methods', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.success('Success Title', 'Success message', {
        duration: 10000,
        action: {
          label: 'Undo',
          onClick: vi.fn(),
        },
      });
    });

    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      title: 'Success Title',
      message: 'Success message',
      duration: 10000,
      action: {
        label: 'Undo',
        onClick: expect.any(Function),
      },
    });
  });

  it('should return toast id from addToast', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;
    
    act(() => {
      toastId = result.current.addToast({
        type: 'success',
        title: 'Test Toast',
      });
    });

    expect(toastId).toBeDefined();
    expect(typeof toastId).toBe('string');
    expect(result.current.toasts[0].id).toBe(toastId);
  });

  it('should return toast id from convenience methods', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;
    
    act(() => {
      toastId = result.current.success('Success Title');
    });

    expect(toastId).toBeDefined();
    expect(typeof toastId).toBe('string');
    expect(result.current.toasts[0].id).toBe(toastId);
  });
});