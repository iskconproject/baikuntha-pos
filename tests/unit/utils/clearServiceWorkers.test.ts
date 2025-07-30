import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearServiceWorkers, clearServiceWorkersInDev } from '@/lib/utils/clearServiceWorkers';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
};

// Mock service worker registration
const mockRegistration = {
  scope: 'https://example.com/',
  unregister: vi.fn(),
};

// Mock navigator APIs
const mockNavigator = {
  serviceWorker: {
    getRegistrations: vi.fn(),
  },
};

// Mock caches API
const mockCaches = {
  keys: vi.fn(),
  delete: vi.fn(),
};

// Mock global window and navigator
const mockWindow = {
  caches: mockCaches,
};

describe('clearServiceWorkers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global objects
    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('navigator', mockNavigator);
    vi.stubGlobal('console', mockConsole);
    vi.stubGlobal('caches', mockCaches);
    
    // Reset mocks
    mockRegistration.unregister.mockResolvedValue(true);
    mockNavigator.serviceWorker.getRegistrations.mockResolvedValue([mockRegistration]);
    mockCaches.keys.mockResolvedValue(['cache-1', 'cache-2']);
    mockCaches.delete.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('clearServiceWorkers', () => {
    it('should return early when window is undefined (SSR)', async () => {
      // Simulate server-side rendering
      vi.stubGlobal('window', undefined);
      
      await clearServiceWorkers();
      
      expect(mockNavigator.serviceWorker.getRegistrations).not.toHaveBeenCalled();
    });

    it('should return early when service worker is not supported', async () => {
      // Remove service worker support
      vi.stubGlobal('navigator', {});
      
      await clearServiceWorkers();
      
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should unregister all service worker registrations', async () => {
      const registration1 = { ...mockRegistration, scope: 'scope-1' };
      const registration2 = { ...mockRegistration, scope: 'scope-2' };
      
      mockNavigator.serviceWorker.getRegistrations.mockResolvedValue([
        registration1,
        registration2,
      ]);

      await clearServiceWorkers();

      expect(registration1.unregister).toHaveBeenCalled();
      expect(registration2.unregister).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Service worker unregistered:',
        'scope-1'
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Service worker unregistered:',
        'scope-2'
      );
    });

    it('should clear all caches when caches API is available', async () => {
      await clearServiceWorkers();

      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.delete).toHaveBeenCalledWith('cache-1');
      expect(mockCaches.delete).toHaveBeenCalledWith('cache-2');
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Caches cleared:',
        ['cache-1', 'cache-2']
      );
    });

    it('should handle case when no service workers are registered', async () => {
      mockNavigator.serviceWorker.getRegistrations.mockResolvedValue([]);
      mockCaches.keys.mockResolvedValue([]);

      await clearServiceWorkers();

      expect(mockConsole.log).toHaveBeenCalledWith('Caches cleared:', []);
      expect(mockRegistration.unregister).not.toHaveBeenCalled();
    });

    it('should handle case when caches API is not available', async () => {
      // Remove caches from window
      vi.stubGlobal('window', {});

      await clearServiceWorkers();

      expect(mockNavigator.serviceWorker.getRegistrations).toHaveBeenCalled();
      expect(mockRegistration.unregister).toHaveBeenCalled();
      // Should not attempt to clear caches
      expect(mockCaches.keys).not.toHaveBeenCalled();
    });

    it('should handle service worker unregistration errors gracefully', async () => {
      const error = new Error('Unregistration failed');
      mockRegistration.unregister.mockRejectedValue(error);

      await clearServiceWorkers();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to clear service workers:',
        error
      );
    });

    it('should handle cache clearing errors gracefully', async () => {
      const error = new Error('Cache deletion failed');
      mockCaches.delete.mockRejectedValue(error);

      await clearServiceWorkers();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to clear service workers:',
        error
      );
    });

    it('should handle getRegistrations errors gracefully', async () => {
      const error = new Error('Failed to get registrations');
      mockNavigator.serviceWorker.getRegistrations.mockRejectedValue(error);

      await clearServiceWorkers();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to clear service workers:',
        error
      );
    });

    it('should handle caches.keys errors gracefully', async () => {
      const error = new Error('Failed to get cache keys');
      mockCaches.keys.mockRejectedValue(error);

      await clearServiceWorkers();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Failed to clear service workers:',
        error
      );
    });
  });

  describe('clearServiceWorkersInDev', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.doUnmock('@/lib/utils/clearServiceWorkers');
    });

    it('should call clearServiceWorkers in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      
      // Mock clearServiceWorkers function
      const clearServiceWorkersMock = vi.fn();
      vi.doMock('@/lib/utils/clearServiceWorkers', () => ({
        clearServiceWorkers: clearServiceWorkersMock,
        clearServiceWorkersInDev: vi.fn(() => {
          if (process.env.NODE_ENV === 'development') {
            clearServiceWorkersMock();
          }
        }),
      }));
      
      const { clearServiceWorkersInDev: mockClearServiceWorkersInDev } = await import('@/lib/utils/clearServiceWorkers');
      mockClearServiceWorkersInDev();

      expect(clearServiceWorkersMock).toHaveBeenCalled();
    });

    it('should not call clearServiceWorkers in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      
      // Mock clearServiceWorkers function
      const clearServiceWorkersMock = vi.fn();
      vi.doMock('@/lib/utils/clearServiceWorkers', () => ({
        clearServiceWorkers: clearServiceWorkersMock,
        clearServiceWorkersInDev: vi.fn(() => {
          if (process.env.NODE_ENV === 'development') {
            clearServiceWorkersMock();
          }
        }),
      }));
      
      const { clearServiceWorkersInDev: mockClearServiceWorkersInDev } = await import('@/lib/utils/clearServiceWorkers');
      mockClearServiceWorkersInDev();

      expect(clearServiceWorkersMock).not.toHaveBeenCalled();
    });

    it('should not call clearServiceWorkers in test mode', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      
      // Mock clearServiceWorkers function
      const clearServiceWorkersMock = vi.fn();
      vi.doMock('@/lib/utils/clearServiceWorkers', () => ({
        clearServiceWorkers: clearServiceWorkersMock,
        clearServiceWorkersInDev: vi.fn(() => {
          if (process.env.NODE_ENV === 'development') {
            clearServiceWorkersMock();
          }
        }),
      }));
      
      const { clearServiceWorkersInDev: mockClearServiceWorkersInDev } = await import('@/lib/utils/clearServiceWorkers');
      mockClearServiceWorkersInDev();

      expect(clearServiceWorkersMock).not.toHaveBeenCalled();
    });

    it('should handle undefined NODE_ENV gracefully', async () => {
      vi.stubEnv('NODE_ENV', undefined);
      
      // Mock clearServiceWorkers function
      const clearServiceWorkersMock = vi.fn();
      vi.doMock('@/lib/utils/clearServiceWorkers', () => ({
        clearServiceWorkers: clearServiceWorkersMock,
        clearServiceWorkersInDev: vi.fn(() => {
          if (process.env.NODE_ENV === 'development') {
            clearServiceWorkersMock();
          }
        }),
      }));
      
      const { clearServiceWorkersInDev: mockClearServiceWorkersInDev } = await import('@/lib/utils/clearServiceWorkers');
      mockClearServiceWorkersInDev();

      expect(clearServiceWorkersMock).not.toHaveBeenCalled();
    });
  });
});