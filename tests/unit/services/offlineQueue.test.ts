import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineQueue, type QueuedOperation } from '@/services/database/offlineQueue';
import { connectionMonitor } from '@/lib/utils/connection';

// Mock dependencies
vi.mock('@/lib/utils/connection', () => ({
  connectionMonitor: {
    isOnline: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock fetch
const mockFetch = vi.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

// Mock AbortSignal.timeout
Object.defineProperty(global.AbortSignal, 'timeout', {
  value: vi.fn(() => new AbortController().signal),
  writable: true,
});

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'server-id' }),
    });
    
    queue = new OfflineQueue();
  });

  afterEach(() => {
    // Clean up any intervals or timeouts
    vi.clearAllTimers();
  });

  describe('Queue Management', () => {
    it('should enqueue operations', () => {
      const operationId = queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      expect(operationId).toBeDefined();
      expect(typeof operationId).toBe('string');
      
      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.pendingOperations).toBe(1);
    });

    it('should dequeue operations', () => {
      const operationId = queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      const removed = queue.dequeue(operationId);
      expect(removed).toBe(true);
      
      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(0);
    });

    it('should return false when dequeuing non-existent operation', () => {
      const removed = queue.dequeue('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should get operation by id', () => {
      const operationId = queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      const operation = queue.getOperation(operationId);
      expect(operation).toBeDefined();
      expect(operation?.type).toBe('create');
      expect(operation?.tableName).toBe('users');
    });

    it('should return undefined for non-existent operation', () => {
      const operation = queue.getOperation('non-existent-id');
      expect(operation).toBeUndefined();
    });
  });

  describe('Operation Sorting', () => {
    it('should sort operations by priority and timestamp', () => {
      // Add operations with different priorities
      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Low Priority' },
        priority: 1,
        maxRetries: 3,
      });

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'High Priority' },
        priority: 5,
        maxRetries: 3,
      });

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Medium Priority' },
        priority: 3,
        maxRetries: 3,
      });

      const operations = queue.getAllOperations();
      expect(operations[0].data.name).toBe('High Priority');
      expect(operations[1].data.name).toBe('Medium Priority');
      expect(operations[2].data.name).toBe('Low Priority');
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      // Add some operations
      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'User 1' },
        priority: 1,
        maxRetries: 3,
      });

      queue.enqueue({
        type: 'update',
        tableName: 'users',
        data: { id: '1', name: 'Updated User' },
        priority: 1,
        maxRetries: 3,
      });

      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(2);
      expect(stats.pendingOperations).toBe(2);
      expect(stats.failedOperations).toBe(0);
      expect(stats.completedOperations).toBe(0);
    });

    it('should count failed operations correctly', () => {
      const operationId = queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'User 1' },
        priority: 1,
        maxRetries: 2,
      });

      // Manually set retry count to max
      const operation = queue.getOperation(operationId);
      if (operation) {
        operation.retryCount = 2;
      }

      const stats = queue.getStats();
      expect(stats.failedOperations).toBe(1);
      expect(stats.pendingOperations).toBe(0);
    });
  });

  describe('Queue Processing', () => {
    beforeEach(() => {
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(true);
    });

    it('should process operations when online', async () => {
      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      await queue.processQueue();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test User' }),
        })
      );

      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(0); // Operation should be removed after success
    });

    it('should not process operations when offline', async () => {
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(false);

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      await queue.processQueue();

      expect(mockFetch).not.toHaveBeenCalled();
      
      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(1); // Operation should remain in queue
    });

    it('should handle operation failures with retry', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      await queue.processQueue();

      expect(mockFetch).toHaveBeenCalled();
      
      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(1); // Operation should remain in queue
      
      const operation = queue.getAllOperations()[0];
      expect(operation.retryCount).toBe(1);
      
      vi.useRealTimers();
    });

    it('should respect dependencies', async () => {
      const firstOpId = queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'First User' },
        priority: 1,
        maxRetries: 3,
      });

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Second User' },
        priority: 1,
        maxRetries: 3,
        dependencies: [firstOpId],
      });

      // Mock first operation to fail
      mockFetch.mockRejectedValueOnce(new Error('First operation failed'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'second-id' }),
      });

      await queue.processQueue();

      // Only first operation should have been attempted
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(2); // Both operations should remain
    });
  });

  describe('API Endpoint Generation', () => {
    it('should generate correct endpoints for different operations', async () => {
      // Test create operation
      queue.enqueue({
        type: 'create',
        tableName: 'products',
        data: { name: 'Test Product' },
        priority: 1,
        maxRetries: 3,
      });

      await queue.processQueue();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products',
        expect.objectContaining({ method: 'POST' })
      );

      mockFetch.mockClear();

      // Test update operation
      queue.enqueue({
        type: 'update',
        tableName: 'products',
        data: { id: '123', name: 'Updated Product' },
        priority: 1,
        maxRetries: 3,
      });

      await queue.processQueue();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/123',
        expect.objectContaining({ method: 'PUT' })
      );

      mockFetch.mockClear();

      // Test delete operation
      queue.enqueue({
        type: 'delete',
        tableName: 'products',
        data: { id: '123' },
        priority: 1,
        maxRetries: 3,
      });

      await queue.processQueue();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/products/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Storage Persistence', () => {
    it('should save to localStorage when enqueuing', () => {
      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.any(String)
      );
    });

    it('should load from localStorage on initialization', () => {
      const storedOperations = [
        {
          id: 'stored-op-1',
          type: 'create',
          tableName: 'users',
          data: { name: 'Stored User' },
          timestamp: Date.now(),
          retryCount: 0,
          priority: 1,
          maxRetries: 3,
        },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedOperations));

      const newQueue = new OfflineQueue();
      const stats = newQueue.getStats();

      expect(stats.totalOperations).toBe(1);
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw
      expect(() => new OfflineQueue()).not.toThrow();
    });
  });

  describe('Queue Management Operations', () => {
    it('should clear all operations', () => {
      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'User 1' },
        priority: 1,
        maxRetries: 3,
      });

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'User 2' },
        priority: 1,
        maxRetries: 3,
      });

      queue.clear();

      const stats = queue.getStats();
      expect(stats.totalOperations).toBe(0);
    });

    it('should retry failed operations', () => {
      const operationId = queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      // Manually set retry count to max
      const operation = queue.getOperation(operationId);
      if (operation) {
        operation.retryCount = 3;
      }

      queue.retryFailed();

      const updatedOperation = queue.getOperation(operationId);
      expect(updatedOperation?.retryCount).toBe(0);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers of queue changes', () => {
      const listener = vi.fn();
      const unsubscribe = queue.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      queue.enqueue({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 1,
        maxRetries: 3,
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          totalOperations: 1,
          pendingOperations: 1,
        })
      );

      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      queue.subscribe(errorListener);

      // Should not throw
      expect(() => {
        queue.enqueue({
          type: 'create',
          tableName: 'users',
          data: { name: 'Test User' },
          priority: 1,
          maxRetries: 3,
        });
      }).not.toThrow();
    });
  });
});