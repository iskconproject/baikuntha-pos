import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncService, type SyncResult } from '@/services/database/sync';
import { connectionMonitor } from '@/lib/utils/connection';
import { offlineQueue } from '@/services/database/offlineQueue';

// Mock dependencies
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => Promise.resolve([])),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

vi.mock('@/lib/db/cloudConnection', () => ({
  getCloudDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  })),
  testCloudConnection: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/utils/connection', () => ({
  connectionMonitor: {
    isOnline: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('@/services/database/offlineQueue', () => ({
  offlineQueue: {
    processQueue: vi.fn(() => Promise.resolve()),
    getStats: vi.fn(() => ({
      pendingOperations: 0,
      totalOperations: 0,
      failedOperations: 0,
      completedOperations: 0,
    })),
    enqueue: vi.fn(() => 'test-id'),
  },
}));

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = new SyncService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    syncService.destroy();
  });

  describe('Sync Status Management', () => {
    it('should get sync status for a table', async () => {
      const status = await syncService.getSyncStatus('users');
      expect(status).toBeNull(); // No sync status initially
    });

    it('should update sync status', async () => {
      const now = new Date();
      await syncService.updateSyncStatus('users', now, 1);
      
      // Verify the sync status was updated
      const status = await syncService.getSyncStatus('users');
      expect(status).toBeDefined();
    });

    it('should increment conflict count', async () => {
      const now = new Date();
      await syncService.updateSyncStatus('users', now, 1);
      await syncService.incrementConflictCount('users');
      
      const status = await syncService.getSyncStatus('users');
      expect(status?.conflictCount).toBe(1);
    });
  });

  describe('Full Sync Process', () => {
    it('should perform full sync when online', async () => {
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(true);
      
      const result = await syncService.performFullSync();
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(offlineQueue.processQueue).toHaveBeenCalled();
    });

    it('should handle sync when offline', async () => {
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(false);
      
      const result = await syncService.performFullSync();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('No internet connection');
    });

    it('should not start sync if already in progress', async () => {
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(true);
      
      // Start first sync
      const firstSync = syncService.performFullSync();
      
      // Try to start second sync immediately
      const secondSync = syncService.performFullSync();
      
      const [firstResult, secondResult] = await Promise.all([firstSync, secondSync]);
      
      expect(firstResult.success).toBeDefined();
      expect(secondResult.success).toBe(false);
      expect(secondResult.errors).toContain('Sync already in progress');
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts correctly', async () => {
      const localRecord = {
        id: '1',
        name: 'Local Name',
        updatedAt: new Date('2023-01-01T10:00:00Z'),
      };
      
      const cloudRecord = {
        id: '1',
        name: 'Cloud Name',
        updatedAt: new Date('2023-01-01T11:00:00Z'),
      };
      
      // Use reflection to access private method for testing
      const detectConflict = (syncService as any).detectConflict.bind(syncService);
      const hasConflict = await detectConflict(localRecord, cloudRecord);
      
      expect(hasConflict).toBe(true);
    });

    it('should resolve conflicts using timestamp priority', async () => {
      const localRecord = {
        id: '1',
        name: 'Local Name',
        updatedAt: new Date('2023-01-01T10:00:00Z'),
      };
      
      const cloudRecord = {
        id: '1',
        name: 'Cloud Name',
        updatedAt: new Date('2023-01-01T11:00:00Z'),
      };
      
      // Use reflection to access private method for testing
      const resolveConflict = (syncService as any).resolveConflict.bind(syncService);
      const resolved = await resolveConflict(localRecord, cloudRecord, 'users');
      
      expect(resolved.name).toBe('Cloud Name'); // Cloud record is newer
      expect(resolved.updatedAt).toBeInstanceOf(Date);
    });

    it('should not detect conflict for identical records', async () => {
      const record1 = {
        id: '1',
        name: 'Same Name',
        updatedAt: new Date('2023-01-01T10:00:00Z'),
      };
      
      const record2 = {
        id: '1',
        name: 'Same Name',
        updatedAt: new Date('2023-01-01T10:00:00Z'),
      };
      
      const detectConflict = (syncService as any).detectConflict.bind(syncService);
      const hasConflict = await detectConflict(record1, record2);
      
      expect(hasConflict).toBe(false);
    });
  });

  describe('Queue Integration', () => {
    it('should queue operations correctly', () => {
      const operationId = syncService.queueOperation('create', 'users', { name: 'Test User' }, 2);
      
      expect(operationId).toBeDefined();
      expect(offlineQueue.enqueue).toHaveBeenCalledWith({
        type: 'create',
        tableName: 'users',
        data: { name: 'Test User' },
        priority: 2,
        maxRetries: 3,
      });
    });

    it('should process offline queue', async () => {
      await syncService.processOfflineQueue();
      
      expect(offlineQueue.processQueue).toHaveBeenCalled();
    });
  });

  describe('Sync Status Subscription', () => {
    it('should allow subscribing to sync status updates', () => {
      const listener = vi.fn();
      const unsubscribe = syncService.subscribeSyncStatus(listener);
      
      expect(listener).toHaveBeenCalledWith({
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        pendingOperations: 0,
        errors: []
      });
      
      unsubscribe();
    });

    it('should notify listeners of sync status changes', async () => {
      const listener = vi.fn();
      syncService.subscribeSyncStatus(listener);
      
      // Clear initial call
      listener.mockClear();
      
      // Trigger sync
      await syncService.performFullSync();
      
      // Should have been called during sync process
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should get all sync statuses', async () => {
      const statuses = await syncService.getAllSyncStatuses();
      expect(Array.isArray(statuses)).toBe(true);
    });

    it('should reset sync status for a table', async () => {
      await syncService.updateSyncStatus('users', new Date(), 1);
      await syncService.resetSyncStatus('users');
      
      const status = await syncService.getSyncStatus('users');
      expect(status).toBeNull();
    });

    it('should get table by name correctly', () => {
      const getTableByName = (syncService as any).getTableByName.bind(syncService);
      
      expect(getTableByName('users')).toBeDefined();
      expect(getTableByName('categories')).toBeDefined();
      expect(getTableByName('products')).toBeDefined();
      expect(getTableByName('product_variants')).toBeDefined();
      expect(getTableByName('transactions')).toBeDefined();
      expect(getTableByName('transaction_items')).toBeDefined();
      expect(getTableByName('unknown_table')).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockError = new Error('Database connection failed');
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(true);
      
      // Mock testCloudConnection to throw error
      const { testCloudConnection } = await import('@/lib/db/cloudConnection');
      vi.mocked(testCloudConnection).mockRejectedValue(mockError);
      
      const result = await syncService.performFullSync();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle cloud connection failures', async () => {
      vi.mocked(connectionMonitor.isOnline).mockReturnValue(true);
      
      const { testCloudConnection } = await import('@/lib/db/cloudConnection');
      vi.mocked(testCloudConnection).mockResolvedValue(false);
      
      const result = await syncService.syncToCloud();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot connect to cloud database');
    });
  });
});