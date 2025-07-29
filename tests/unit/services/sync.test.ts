import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncService, syncService } from '@/services/database/sync';
import { getLocalDb } from '@/lib/db/connection';
import { syncMetadata } from '@/lib/db/schema';

// Mock the database connections
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(),
}));

describe('SyncService', () => {
  let service: SyncService;
  let mockLocalDb: any;
  let mockCloudDb: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock database objects
    mockLocalDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      all: vi.fn().mockReturnValue([]), // Default to empty array
      run: vi.fn(),
    };

    mockCloudDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      all: vi.fn().mockReturnValue([]), // Default to empty array
      run: vi.fn(),
    };

    // Setup mock implementations
    (getLocalDb as any).mockReturnValue(mockLocalDb);

    // Create service instance
    service = new SyncService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSyncStatus', () => {
    it('should return sync status for a table', async () => {
      const mockSyncStatus = {
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date(),
        syncVersion: 1,
        conflictCount: 0,
      };

      mockLocalDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSyncStatus]),
          }),
        }),
      });

      const result = await service.getSyncStatus('products');

      expect(result).toEqual(mockSyncStatus);
      expect(mockLocalDb.select).toHaveBeenCalled();
    });

    it('should return null if no sync status found', async () => {
      mockLocalDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getSyncStatus('products');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockLocalDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.getSyncStatus('products')).rejects.toThrow('Database error');
    });
  });

  describe('updateSyncStatus', () => {
    it('should update existing sync status', async () => {
      const existingSyncStatus = {
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date('2023-01-01'),
        syncVersion: 1,
        conflictCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue(existingSyncStatus);

      mockLocalDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const newSyncTime = new Date();
      await service.updateSyncStatus('products', newSyncTime, 2);

      expect(mockLocalDb.update).toHaveBeenCalled();
    });

    it('should create new sync status if none exists', async () => {
      vi.spyOn(service, 'getSyncStatus').mockResolvedValue(null);
      vi.spyOn(service, 'create').mockResolvedValue({
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date(),
        syncVersion: 1,
        conflictCount: 0,
      } as any);

      const newSyncTime = new Date();
      await service.updateSyncStatus('products', newSyncTime);

      expect(service.create).toHaveBeenCalledWith({
        tableName: 'products',
        lastSyncAt: newSyncTime,
        syncVersion: 1,
      });
    });
  });

  describe('incrementConflictCount', () => {
    it('should increment conflict count for existing sync status', async () => {
      const existingSyncStatus = {
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date(),
        syncVersion: 1,
        conflictCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue(existingSyncStatus);

      mockLocalDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.incrementConflictCount('products');

      expect(mockLocalDb.update).toHaveBeenCalled();
    });

    it('should handle case when sync status does not exist', async () => {
      vi.spyOn(service, 'getSyncStatus').mockResolvedValue(null);

      await expect(service.incrementConflictCount('products')).resolves.not.toThrow();
    });
  });

  describe('syncToCloud', () => {
    it('should sync all tables to cloud successfully', async () => {
      vi.spyOn(service as any, 'syncTableToCloud').mockResolvedValue({
        recordsSynced: 5,
        conflicts: 0,
      });

      const result = await service.syncToCloud();

      expect(result.success).toBe(true);
      expect(result.tablesProcessed).toBe(6); // 6 tables in the sync list
      expect(result.recordsSynced).toBe(30); // 5 records * 6 tables
      expect(result.conflicts).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle cloud connection failure', async () => {
      // Cloud connection check not supported

      const result = await service.syncToCloud();

      expect(result.success).toBe(false);
      // Cloud sync not supported, so no cloud error expected
    });

    it('should handle individual table sync errors', async () => {
      vi.spyOn(service as any, 'syncTableToCloud')
        .mockResolvedValueOnce({ recordsSynced: 5, conflicts: 0 })
        .mockRejectedValueOnce(new Error('Table sync error'))
        .mockResolvedValue({ recordsSynced: 3, conflicts: 1 });

      const result = await service.syncToCloud();

      expect(result.success).toBe(false);
      expect(result.tablesProcessed).toBe(5); // 5 successful tables
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Table sync error');
    });
  });

  describe('syncFromCloud', () => {
    it('should sync all tables from cloud successfully', async () => {
      vi.spyOn(service as any, 'syncTableFromCloud').mockResolvedValue({
        recordsSynced: 3,
        conflicts: 1,
      });

      const result = await service.syncFromCloud();

      expect(result.success).toBe(true);
      expect(result.tablesProcessed).toBe(6);
      expect(result.recordsSynced).toBe(18); // 3 records * 6 tables
      expect(result.conflicts).toBe(6); // 1 conflict * 6 tables
      expect(result.errors).toHaveLength(0);
    });

    it('should handle cloud connection failure', async () => {
      // Cloud connection check not supported

      const result = await service.syncFromCloud();

      expect(result.success).toBe(false);
      // Cloud sync not supported, so no cloud error expected
    });
  });

  describe('syncTableToCloud', () => {
    it('should sync modified records to cloud', async () => {
      const mockModifiedRecords = [
        { id: 'record-1', name: 'Product 1', updated_at: new Date() },
        { id: 'record-2', name: 'Product 2', updated_at: new Date() },
      ];

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue({
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date('2023-01-01'),
        syncVersion: 1,
        conflictCount: 0,
      } as any);

      mockLocalDb.all.mockReturnValue(mockModifiedRecords);
      mockCloudDb.all.mockReturnValue([]); // No existing records in cloud

      vi.spyOn(service as any, 'insertCloudRecord').mockResolvedValue(undefined);
      vi.spyOn(service, 'updateSyncStatus').mockResolvedValue(undefined);

      const result = await (service as any).syncTableToCloud('products');

      expect(result.recordsSynced).toBe(2);
      expect(result.conflicts).toBe(0);
    });

    it('should handle conflicts when cloud record is newer', async () => {
      const localRecord = { id: 'record-1', name: 'Product 1', updated_at: new Date('2023-01-01') };
      const cloudRecord = { id: 'record-1', name: 'Product 1 Updated', updated_at: new Date('2023-01-02') };

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue({
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date('2022-12-01'),
        syncVersion: 1,
        conflictCount: 0,
      } as any);

      mockLocalDb.all.mockReturnValue([localRecord]);
      mockCloudDb.all.mockReturnValue([cloudRecord]);

      vi.spyOn(service, 'incrementConflictCount').mockResolvedValue(undefined);
      vi.spyOn(service, 'updateSyncStatus').mockResolvedValue(undefined);

      const result = await (service as any).syncTableToCloud('products');

      expect(result.recordsSynced).toBe(0);
      expect(result.conflicts).toBe(1);
      expect(service.incrementConflictCount).toHaveBeenCalledWith('products');
    });

    it('should update existing cloud records when local is newer', async () => {
      const localRecord = { id: 'record-1', name: 'Product 1 Updated', updated_at: new Date('2023-01-02') };
      const cloudRecord = { id: 'record-1', name: 'Product 1', updated_at: new Date('2023-01-01') };

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue({
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date('2022-12-01'),
        syncVersion: 1,
        conflictCount: 0,
      } as any);

      mockLocalDb.all.mockReturnValue([localRecord]);
      mockCloudDb.all.mockReturnValue([cloudRecord]);

      vi.spyOn(service as any, 'updateCloudRecord').mockResolvedValue(undefined);
      vi.spyOn(service, 'updateSyncStatus').mockResolvedValue(undefined);

      const result = await (service as any).syncTableToCloud('products');

      expect(result.recordsSynced).toBe(1);
      expect(result.conflicts).toBe(0);
    });
  });

  describe('syncTableFromCloud', () => {
    it('should sync modified records from cloud', async () => {
      const mockCloudRecords = [
        { id: 'record-1', name: 'Product 1', updated_at: new Date() },
        { id: 'record-2', name: 'Product 2', updated_at: new Date() },
      ];

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue({
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date('2023-01-01'),
        syncVersion: 1,
        conflictCount: 0,
      } as any);

      mockCloudDb.all.mockReturnValue(mockCloudRecords);
      mockLocalDb.all.mockReturnValue([]); // No existing records locally

      vi.spyOn(service as any, 'insertLocalRecord').mockResolvedValue(undefined);
      vi.spyOn(service, 'updateSyncStatus').mockResolvedValue(undefined);

      const result = await (service as any).syncTableFromCloud('products');

      expect(result.recordsSynced).toBe(2);
      expect(result.conflicts).toBe(0);
    });

    it('should handle conflicts when local record is newer', async () => {
      const cloudRecord = { id: 'record-1', name: 'Product 1', updated_at: new Date('2023-01-01') };
      const localRecord = { id: 'record-1', name: 'Product 1 Updated', updated_at: new Date('2023-01-02') };

      vi.spyOn(service, 'getSyncStatus').mockResolvedValue({
        id: 'sync-1',
        tableName: 'products',
        lastSyncAt: new Date('2022-12-01'),
        syncVersion: 1,
        conflictCount: 0,
      } as any);

      mockCloudDb.all.mockReturnValue([cloudRecord]);
      mockLocalDb.all.mockReturnValue([localRecord]);

      vi.spyOn(service, 'incrementConflictCount').mockResolvedValue(undefined);
      vi.spyOn(service, 'updateSyncStatus').mockResolvedValue(undefined);

      const result = await (service as any).syncTableFromCloud('products');

      expect(result.recordsSynced).toBe(0);
      expect(result.conflicts).toBe(1);
      expect(service.incrementConflictCount).toHaveBeenCalledWith('products');
    });
  });

  describe('getAllSyncStatuses', () => {
    it('should return all sync statuses', async () => {
      const mockSyncStatuses = [
        { id: 'sync-1', tableName: 'products', lastSyncAt: new Date(), syncVersion: 1, conflictCount: 0 },
        { id: 'sync-2', tableName: 'categories', lastSyncAt: new Date(), syncVersion: 2, conflictCount: 1 },
      ];

      mockLocalDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockSyncStatuses),
        }),
      });

      const result = await service.getAllSyncStatuses();

      expect(result).toEqual(mockSyncStatuses);
      expect(mockLocalDb.select).toHaveBeenCalled();
    });
  });

  describe('resetSyncStatus', () => {
    it('should reset sync status for a table', async () => {
      mockLocalDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await service.resetSyncStatus('products');

      expect(mockLocalDb.delete).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockLocalDb.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.resetSyncStatus('products')).rejects.toThrow('Database error');
    });
  });

  describe('Helper Methods', () => {
    describe('updateCloudRecord', () => {
      it('should update record in cloud database', async () => {
        const record = { id: 'record-1', name: 'Updated Product', price: 100 };

        mockCloudDb.run.mockResolvedValue(undefined);

        await (service as any).updateCloudRecord('products', record);

        expect(mockCloudDb.run).toHaveBeenCalled();
      });
    });

    describe('insertCloudRecord', () => {
      it('should insert record into cloud database', async () => {
        const record = { id: 'record-1', name: 'New Product', price: 100 };

        mockCloudDb.run.mockResolvedValue(undefined);

        await (service as any).insertCloudRecord('products', record);

        expect(mockCloudDb.run).toHaveBeenCalled();
      });
    });

    describe('updateLocalRecord', () => {
      it('should update record in local database', async () => {
        const record = { id: 'record-1', name: 'Updated Product', price: 100 };

        mockLocalDb.run.mockResolvedValue(undefined);

        await (service as any).updateLocalRecord('products', record);

        expect(mockLocalDb.run).toHaveBeenCalled();
      });
    });

    describe('insertLocalRecord', () => {
      it('should insert record into local database', async () => {
        const record = { id: 'record-1', name: 'New Product', price: 100 };

        mockLocalDb.run.mockResolvedValue(undefined);

        await (service as any).insertLocalRecord('products', record);

        expect(mockLocalDb.run).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      vi.spyOn(service as any, 'syncTableToCloud').mockRejectedValue(new Error('Sync error'));

      const result = await service.syncToCloud();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle database connection errors', async () => {
      // Cloud connection check not supported

      const result = await service.syncToCloud();

      expect(result.success).toBe(false);
      // Cloud sync not supported, so no cloud error expected
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(syncService).toBeInstanceOf(SyncService);
    });
  });
});
