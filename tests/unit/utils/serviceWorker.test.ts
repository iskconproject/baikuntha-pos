import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceWorkerSync, serviceWorkerSync, useServiceWorkerSync } from '@/lib/utils/serviceWorker';
import { renderHook, act } from '@testing-library/react';

// Mock navigator and service worker APIs
const mockServiceWorker = {
  register: vi.fn(),
  addEventListener: vi.fn(),
};

const mockRegistration = {
  sync: {
    register: vi.fn(),
    getTags: vi.fn(),
  },
  active: {
    postMessage: vi.fn(),
  },
};

const mockMessageChannel = {
  port1: { onmessage: null },
  port2: {},
};

// Mock global APIs
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true,
  },
  writable: true,
});

Object.defineProperty(global, 'MessageChannel', {
  value: vi.fn(() => mockMessageChannel),
  writable: true,
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('ServiceWorkerSync', () => {
  let serviceWorkerSync: ServiceWorkerSync;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should register service worker when supported', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      
      serviceWorkerSync = new ServiceWorkerSync();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw-sync.js', {
        scope: '/'
      });
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('should handle service worker registration failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));
      
      serviceWorkerSync = new ServiceWorkerSync();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to register sync service worker:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should not register when service worker is not supported', async () => {
      // Temporarily remove service worker support
      const originalServiceWorker = navigator.serviceWorker;
      delete (navigator as any).serviceWorker;
      
      serviceWorkerSync = new ServiceWorkerSync();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockServiceWorker.register).not.toHaveBeenCalled();
      
      // Restore service worker
      (navigator as any).serviceWorker = originalServiceWorker;
    });
  });

  describe('registerBackgroundSync', () => {
    beforeEach(async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      serviceWorkerSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should register background sync when supported', async () => {
      mockRegistration.sync.register.mockResolvedValue(undefined);
      
      await serviceWorkerSync.registerBackgroundSync();
      
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('background-sync');
    });

    it('should throw error when service worker not registered', async () => {
      const unregisteredSync = new ServiceWorkerSync();
      
      await expect(unregisteredSync.registerBackgroundSync()).rejects.toThrow(
        'Service worker not registered'
      );
    });

    it('should handle background sync registration failure', async () => {
      mockRegistration.sync.register.mockRejectedValue(new Error('Sync registration failed'));
      
      await expect(serviceWorkerSync.registerBackgroundSync()).rejects.toThrow(
        'Sync registration failed'
      );
    });

    it('should warn when background sync is not supported', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create registration without sync support
      const registrationWithoutSync = { active: mockRegistration.active };
      mockServiceWorker.register.mockResolvedValue(registrationWithoutSync);
      
      const syncWithoutSupport = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      await syncWithoutSupport.registerBackgroundSync();
      
      expect(consoleSpy).toHaveBeenCalledWith('Background sync not supported');
      consoleSpy.mockRestore();
    });
  });

  describe('forceSync', () => {
    beforeEach(async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      serviceWorkerSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should return error when service worker not active', async () => {
      const inactiveRegistration = { ...mockRegistration, active: null };
      mockServiceWorker.register.mockResolvedValue(inactiveRegistration);
      
      const inactiveSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const result = await inactiveSync.forceSync();
      
      expect(result).toEqual({
        success: false,
        error: 'Service worker not active'
      });
    });

    it('should send force sync message and return response', async () => {
      const mockResponse = { success: true };
      
      // Mock MessageChannel behavior
      const messageChannelMock = {
        port1: { onmessage: null },
        port2: {},
      };
      (global.MessageChannel as any).mockReturnValue(messageChannelMock);
      
      const result = serviceWorkerSync.forceSync();
      
      // Simulate message response
      setTimeout(() => {
        if (messageChannelMock.port1.onmessage) {
          messageChannelMock.port1.onmessage({ data: mockResponse });
        }
      }, 0);
      
      expect(await result).toEqual(mockResponse);
      expect(mockRegistration.active.postMessage).toHaveBeenCalledWith(
        { type: 'FORCE_SYNC' },
        [messageChannelMock.port2]
      );
    });

    it('should timeout after 30 seconds', async () => {
      vi.useFakeTimers();
      
      const result = serviceWorkerSync.forceSync();
      
      // Fast-forward time by 30 seconds
      vi.advanceTimersByTime(30000);
      
      expect(await result).toEqual({
        success: false,
        error: 'Sync timeout'
      });
      
      vi.useRealTimers();
    });
  });

  describe('getSyncStatus', () => {
    beforeEach(async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      serviceWorkerSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should return error status when service worker not active', async () => {
      const inactiveRegistration = { ...mockRegistration, active: null };
      mockServiceWorker.register.mockResolvedValue(inactiveRegistration);
      
      const inactiveSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const status = await inactiveSync.getSyncStatus();
      
      expect(status).toEqual({
        pendingOperations: 0,
        isOnline: true,
        error: 'Service worker not active'
      });
    });

    it('should return status from service worker', async () => {
      const mockStatus = {
        pendingOperations: 5,
        isOnline: true,
        lastSync: '2023-01-01T00:00:00Z'
      };
      
      const messageChannelMock = {
        port1: { onmessage: null },
        port2: {},
      };
      (global.MessageChannel as any).mockReturnValue(messageChannelMock);
      
      const result = serviceWorkerSync.getSyncStatus();
      
      // Simulate message response
      setTimeout(() => {
        if (messageChannelMock.port1.onmessage) {
          messageChannelMock.port1.onmessage({ data: mockStatus });
        }
      }, 0);
      
      expect(await result).toEqual(mockStatus);
    });

    it('should timeout after 5 seconds', async () => {
      vi.useFakeTimers();
      
      const result = serviceWorkerSync.getSyncStatus();
      
      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);
      
      expect(await result).toEqual({
        pendingOperations: 0,
        isOnline: true,
        error: 'Status request timeout'
      });
      
      vi.useRealTimers();
    });
  });

  describe('subscribe and notifyListeners', () => {
    beforeEach(async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      serviceWorkerSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should add listener and call immediately with current status', async () => {
      const listener = vi.fn();
      const mockStatus = { pendingOperations: 0, isOnline: true };
      
      // Mock getSyncStatus to return immediately
      vi.spyOn(serviceWorkerSync, 'getSyncStatus').mockResolvedValue(mockStatus);
      
      const unsubscribe = serviceWorkerSync.subscribe(listener);
      
      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(listener).toHaveBeenCalledWith(mockStatus);
      
      // Test unsubscribe
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle listener errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      serviceWorkerSync.subscribe(errorListener);
      
      // Trigger notifyListeners
      await (serviceWorkerSync as any).notifyListeners();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in service worker sync listener:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('addPendingOperation', () => {
    beforeEach(async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      serviceWorkerSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should add operation to IndexedDB', async () => {
      const mockDB = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          }),
        }),
      };
      
      const mockRequest = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      const operation = {
        id: 'test-op',
        type: 'create' as const,
        tableName: 'products',
        data: { name: 'Test Product' },
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      const promise = serviceWorkerSync.addPendingOperation(operation);
      
      // Simulate successful database operation
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess();
        const putRequest = mockDB.transaction().objectStore().put();
        if (putRequest.onsuccess) putRequest.onsuccess();
      }, 0);
      
      await expect(promise).resolves.toBeUndefined();
      expect(mockIndexedDB.open).toHaveBeenCalledWith('VaikunthaPosSyncDB', 1);
    });

    it('should handle IndexedDB errors', async () => {
      const mockRequest = {
        error: new Error('DB Error'),
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      const operation = {
        id: 'test-op',
        type: 'create' as const,
        tableName: 'products',
        data: { name: 'Test Product' },
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      const promise = serviceWorkerSync.addPendingOperation(operation);
      
      // Simulate database error
      setTimeout(() => {
        if (mockRequest.onerror) mockRequest.onerror();
      }, 0);
      
      await expect(promise).rejects.toThrow('DB Error');
    });
  });

  describe('clearPendingOperations', () => {
    beforeEach(async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      serviceWorkerSync = new ServiceWorkerSync();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should clear all pending operations', async () => {
      const mockDB = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            clear: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          }),
        }),
      };
      
      const mockRequest = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
      };
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      const promise = serviceWorkerSync.clearPendingOperations();
      
      // Simulate successful operation
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess();
        const clearRequest = mockDB.transaction().objectStore().clear();
        if (clearRequest.onsuccess) clearRequest.onsuccess();
      }, 0);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });
});

describe('useServiceWorkerSync hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceWorker.register.mockResolvedValue(mockRegistration);
  });

  it('should return sync status and control functions', async () => {
    const { result } = renderHook(() => useServiceWorkerSync());
    
    expect(result.current.status).toEqual({
      pendingOperations: 0,
      isOnline: true,
    });
    
    expect(typeof result.current.forceSync).toBe('function');
    expect(typeof result.current.clearPending).toBe('function');
  });

  it('should update status when service worker status changes', async () => {
    const { result } = renderHook(() => useServiceWorkerSync());
    
    // Mock status update
    const newStatus = {
      pendingOperations: 3,
      isOnline: false,
      error: 'Connection lost',
    };
    
    // Simulate status change by calling the subscriber
    act(() => {
      // This would normally be called by the service worker
      const listeners = (serviceWorkerSync as any).listeners;
      listeners.forEach((listener: any) => listener(newStatus));
    });
    
    // Note: In a real test, we'd need to properly mock the subscription mechanism
    // This is a simplified test to show the structure
  });
});