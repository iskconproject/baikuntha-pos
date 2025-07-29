import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionMonitor, isOnline, waitForConnection } from '@/lib/utils/connection';

// Mock global objects
const mockNavigator = {
  onLine: true,
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockFetch = vi.fn();

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator.onLine = true;
    monitor = new ConnectionMonitor();
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with current online status', () => {
      const status = monitor.getStatus();
      expect(status.isOnline).toBe(true);
    });

    it('should set up event listeners', () => {
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should set up connection change listener if available', () => {
      expect(mockNavigator.connection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Status Updates', () => {
    it('should update status when going online', () => {
      const listener = vi.fn();
      monitor.subscribe(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Simulate going offline then online
      mockNavigator.onLine = false;
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];
      
      mockNavigator.onLine = true;
      onlineHandler?.();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: true })
      );
    });

    it('should update status when going offline', () => {
      const listener = vi.fn();
      monitor.subscribe(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Simulate going offline
      mockNavigator.onLine = false;
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];
      
      offlineHandler?.();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: false })
      );
    });

    it('should include connection details when available', () => {
      const status = monitor.getStatus();
      
      expect(status.connectionType).toBe('wifi');
      expect(status.effectiveType).toBe('4g');
      expect(status.downlink).toBe(10);
      expect(status.rtt).toBe(50);
    });
  });

  describe('Subscription Management', () => {
    it('should allow subscribing to status changes', () => {
      const listener = vi.fn();
      const unsubscribe = monitor.subscribe(listener);
      
      // Should call immediately with current status
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: true })
      );
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from status changes', () => {
      const listener = vi.fn();
      const unsubscribe = monitor.subscribe(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Unsubscribe
      unsubscribe();
      
      // Trigger status change
      mockNavigator.onLine = false;
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];
      offlineHandler?.();
      
      // Listener should not be called
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      monitor.subscribe(errorListener);
      monitor.subscribe(normalListener);
      
      // Both should be called initially despite error
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('Periodic Connection Check', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should perform periodic health checks', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      // Wait for any pending promises
      await vi.runAllTimersAsync();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal),
      });
    });

    it('should detect connection loss during health check', async () => {
      const listener = vi.fn();
      monitor.subscribe(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Mock fetch failure
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: false })
      );
    });

    it('should detect connection restoration during health check', async () => {
      // Start offline
      mockNavigator.onLine = false;
      const offlineMonitor = new ConnectionMonitor();
      
      const listener = vi.fn();
      offlineMonitor.subscribe(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Mock successful fetch
      mockFetch.mockResolvedValue({ ok: true });
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: true })
      );
      
      offlineMonitor.destroy();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      monitor.destroy();
      
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockNavigator.connection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clear interval on destroy', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      monitor.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should clear listeners on destroy', () => {
      const listener = vi.fn();
      monitor.subscribe(listener);
      
      monitor.destroy();
      
      // Verify listeners are cleared by checking internal state
      expect(monitor['listeners'].size).toBe(0);
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    mockNavigator.onLine = true;
  });

  describe('isOnline', () => {
    it('should return current online status', () => {
      expect(isOnline()).toBe(true);
      
      mockNavigator.onLine = false;
      // Note: This might not immediately reflect since it uses the singleton
      // In real usage, the monitor would update its status
    });
  });

  describe('waitForConnection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve immediately if already online', async () => {
      mockNavigator.onLine = true;
      
      const promise = waitForConnection();
      const result = await promise;
      
      expect(result).toBeUndefined(); // Resolves with no value
    });

    it('should wait for connection and resolve when online', async () => {
      // Start offline
      mockNavigator.onLine = false;
      
      const promise = waitForConnection();
      
      // Simulate going online after 1 second
      setTimeout(() => {
        mockNavigator.onLine = true;
        // Trigger the connection monitor's online handler
        const onlineHandler = mockWindow.addEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1];
        onlineHandler?.();
      }, 1000);
      
      vi.advanceTimersByTime(1000);
      
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('should reject on timeout', async () => {
      mockNavigator.onLine = false;
      
      const promise = waitForConnection(1000); // 1 second timeout
      
      vi.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow('Connection timeout');
    });
  });
});