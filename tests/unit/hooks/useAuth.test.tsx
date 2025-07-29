import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with loading state', () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('loads authenticated user on mount', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('handles login successfully', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    // Mock initial auth check (not authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock login request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: mockUser }),
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('testuser', '1234');
    });

    expect(loginResult).toEqual({ success: true });
    expect(result.current.user).toEqual(mockUser);
  });

  it('handles login failure', async () => {
    // Mock initial auth check (not authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock failed login request
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('testuser', 'wrong');
    });

    expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' });
    expect(result.current.user).toBe(null);
  });

  it('handles logout', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    // Mock initial auth check (authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Mock logout request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBe(null);
    expect(result.current.timeUntilLogout).toBe(null);
  });

  it('tracks session timeout', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    // Mock initial auth check (authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Should have initial timeout value
    expect(result.current.timeUntilLogout).toBeGreaterThan(0);

    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Timeout should decrease
    await waitFor(() => {
      expect(result.current.timeUntilLogout).toBeLessThan(30 * 60); // Less than 30 minutes
    });
  });

  it('auto-logout when session expires', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    // Mock initial auth check (authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Mock logout request for auto-logout
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Advance time beyond session timeout (30 minutes)
    act(() => {
      vi.advanceTimersByTime(31 * 60 * 1000);
    });

    await waitFor(() => {
      expect(result.current.user).toBe(null);
    });
  });

  it('refreshes auth status', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    // Mock initial auth check (not authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toBe(null);
    });

    // Mock refresh auth request (now authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    await act(async () => {
      await result.current.refreshAuth();
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('handles network errors gracefully', async () => {
    // Mock initial auth check (network error)
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBe(null);
    });

    // Mock login with network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('testuser', '1234');
    });

    expect(loginResult).toEqual({ 
      success: false, 
      error: 'Network error. Please try again.' 
    });
  });

  it('updates activity on user interaction', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };

    // Mock initial auth check (authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    const initialTimeout = result.current.timeUntilLogout;

    // Simulate user activity
    act(() => {
      const event = new Event('mousedown');
      document.dispatchEvent(event);
    });

    // Advance time slightly
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Timeout should be reset due to activity
    await waitFor(() => {
      expect(result.current.timeUntilLogout).toBeGreaterThan(initialTimeout! - 2);
    });
  });
});