import { eq, gt } from "drizzle-orm";
import {
  syncMetadata,
  users,
  categories,
  products,
  productVariants,
  transactions,
  transactionItems,
  type SyncMetadata,
  type NewSyncMetadata,
} from "@/lib/db/schema";
import { getLocalDb } from "@/lib/db/connection";
import { getCloudDb, testCloudConnection } from "@/lib/db/cloudConnection";
import { BaseService } from "./base";
import { connectionMonitor } from "@/lib/utils/connection";
import { offlineQueue } from "./offlineQueue";

export class SyncService extends BaseService<SyncMetadata, NewSyncMetadata> {
  private syncInProgress = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private lastSyncAttempt: Date | null = null;
  private autoSyncInterval?: NodeJS.Timeout;

  get table() {
    return syncMetadata;
  }

  generateId(): string {
    return this.generateUUID();
  }

  constructor() {
    super();
    this.setupAutoSync();
    this.setupConnectionListener();
  }

  private setupAutoSync() {
    // Auto-sync every 5 minutes when online
    this.autoSyncInterval = setInterval(() => {
      if (connectionMonitor.isOnline() && !this.syncInProgress) {
        this.performFullSync();
      }
    }, 5 * 60 * 1000);
  }

  private setupConnectionListener() {
    connectionMonitor.subscribe((status) => {
      if (status.isOnline && !this.syncInProgress) {
        // Delay sync slightly to allow connection to stabilize
        setTimeout(() => {
          this.performFullSync();
        }, 2000);
      }
    });
  }

  // Sync metadata methods
  async getSyncStatus(tableName: string): Promise<SyncMetadata | null> {
    try {
      const result = await this.localDb
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.tableName, tableName))
        .limit(1);

      const record = result[0] || null;
      if (record) {
        console.log(`Sync status for ${tableName}:`, {
          lastSyncAt: record.lastSyncAt,
          type: typeof record.lastSyncAt,
          isDate: record.lastSyncAt instanceof Date,
        });
      }
      return record;
    } catch (error) {
      console.error("Error getting sync status:", error);
      throw error;
    }
  }

  async updateSyncStatus(
    tableName: string,
    lastSyncAt: Date,
    version?: number
  ): Promise<void> {
    try {
      const existing = await this.getSyncStatus(tableName);

      if (existing) {
        await this.localDb
          .update(syncMetadata)
          .set({
            lastSyncAt,
            syncVersion: version || (existing.syncVersion || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(syncMetadata.id, existing.id));
      } else {
        await this.create({
          tableName,
          lastSyncAt,
          syncVersion: version || 1,
        });
      }
    } catch (error) {
      console.error("Error updating sync status:", error);
      throw error;
    }
  }

  async incrementConflictCount(tableName: string): Promise<void> {
    try {
      const existing = await this.getSyncStatus(tableName);

      if (existing) {
        await this.localDb
          .update(syncMetadata)
          .set({
            conflictCount: (existing.conflictCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(syncMetadata.id, existing.id));
      }
    } catch (error) {
      console.error("Error incrementing conflict count:", error);
      throw error;
    }
  }

  // Main sync operations
  async performFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        tablesProcessed: 0,
        recordsSynced: 0,
        conflicts: 0,
        errors: ["Sync already in progress"],
      };
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = new Date();

    this.notifySyncListeners({
      isOnline: connectionMonitor.isOnline(),
      isSyncing: true,
      lastSyncAt: null,
      pendingOperations: offlineQueue.getStats().pendingOperations,
      errors: [],
    });

    try {
      // First, process offline queue
      await offlineQueue.processQueue();

      // Then perform bidirectional sync
      const uploadResult = await this.syncToCloud();
      const downloadResult = await this.syncFromCloud();

      const combinedResult: SyncResult = {
        success: uploadResult.success && downloadResult.success,
        tablesProcessed:
          uploadResult.tablesProcessed + downloadResult.tablesProcessed,
        recordsSynced:
          uploadResult.recordsSynced + downloadResult.recordsSynced,
        conflicts: uploadResult.conflicts + downloadResult.conflicts,
        errors: [...uploadResult.errors, ...downloadResult.errors],
      };

      this.notifySyncListeners({
        isOnline: connectionMonitor.isOnline(),
        isSyncing: false,
        lastSyncAt: combinedResult.success ? new Date() : null,
        pendingOperations: offlineQueue.getStats().pendingOperations,
        errors: combinedResult.errors,
      });

      return combinedResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.notifySyncListeners({
        isOnline: connectionMonitor.isOnline(),
        isSyncing: false,
        lastSyncAt: null,
        pendingOperations: offlineQueue.getStats().pendingOperations,
        errors: [errorMessage],
      });

      return {
        success: false,
        tablesProcessed: 0,
        recordsSynced: 0,
        conflicts: 0,
        errors: [errorMessage],
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncToCloud(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      tablesProcessed: 0,
      recordsSynced: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      // Skip connection check on server side, test cloud connection directly
      const canConnect = await testCloudConnection();
      if (!canConnect) {
        result.errors.push("Cannot connect to cloud database");
        return result;
      }

      const tablesToSync = [
        "users",
        "categories",
        "products",
        "product_variants",
        "transactions",
        "transaction_items",
      ];

      for (const tableName of tablesToSync) {
        try {
          const syncStats = await this.syncTableToCloud(tableName);
          result.tablesProcessed++;
          result.recordsSynced += syncStats.recordsSynced;
          result.conflicts += syncStats.conflicts;
        } catch (error) {
          result.errors.push(`${tableName}: ${(error as Error).message}`);
        }
      }

      result.success = result.errors.length === 0;

      console.log("Sync to cloud completed:", result);
      return result;
    } catch (error) {
      result.errors.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("Sync to cloud failed:", error);
      return result;
    }
  }

  async syncFromCloud(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      tablesProcessed: 0,
      recordsSynced: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      // Skip connection check on server side, test cloud connection directly
      const canConnect = await testCloudConnection();
      if (!canConnect) {
        result.errors.push("Cannot connect to cloud database");
        return result;
      }

      const tablesToSync = [
        "users",
        "categories",
        "products",
        "product_variants",
        "transactions",
        "transaction_items",
      ];

      for (const tableName of tablesToSync) {
        try {
          const syncStats = await this.syncTableFromCloud(tableName);
          result.tablesProcessed++;
          result.recordsSynced += syncStats.recordsSynced;
          result.conflicts += syncStats.conflicts;
        } catch (error) {
          result.errors.push(
            `${tableName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      result.success = result.errors.length === 0;

      console.log("Sync from cloud completed:", result);
      return result;
    } catch (error) {
      result.errors.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error("Sync from cloud failed:", error);
      return result;
    }
  }

  // Table-specific sync methods
  private async syncTableToCloud(tableName: string): Promise<TableSyncStats> {
    const stats: TableSyncStats = {
      recordsSynced: 0,
      conflicts: 0,
    };

    try {
      const localDb = getLocalDb();
      const cloudDb = getCloudDb();
      const table = this.getTableByName(tableName);

      if (!table) {
        throw new Error(`Unknown table: ${tableName}`);
      }

      // Get last sync timestamp
      const syncStatus = await this.getSyncStatus(tableName);

      // If we have a recent sync status, skip this table
      if (syncStatus && syncStatus.lastSyncAt) {
        const lastSyncTime =
          syncStatus.lastSyncAt instanceof Date
            ? syncStatus.lastSyncAt.getTime()
            : typeof syncStatus.lastSyncAt === "number"
            ? syncStatus.lastSyncAt * 1000
            : 0;

        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (timeSinceLastSync < 60000) {
          // Skip if synced within last minute
          console.log(`Skipping ${tableName} - recently synced`);
          return stats;
        }
      }

      const lastSyncDate = syncStatus?.lastSyncAt || new Date(0);
      // Handle both Date objects and timestamps
      const lastSync =
        lastSyncDate instanceof Date
          ? Math.floor(lastSyncDate.getTime() / 1000)
          : typeof lastSyncDate === "number"
          ? lastSyncDate
          : 0;

      // Get records modified since last sync
      console.log(`Syncing ${tableName} to cloud, lastSync: ${lastSync}`);

      // Check if table has updatedAt field, otherwise use createdAt
      const timestampField =
        "updatedAt" in table ? table.updatedAt : table.createdAt;
      const modifiedRecords =
        (await localDb
          .select()
          .from(table)
          .where(gt(timestampField, lastSync))) || [];

      console.log(
        `Found ${modifiedRecords.length} modified records for ${tableName}`
      );
      for (const record of modifiedRecords) {
        try {
          console.log(`Processing record ${record.id} for ${tableName}`, {
            updatedAt: record.updatedAt,
            type: typeof record.updatedAt,
          });
          // Check if record exists in cloud
          const existingCloudRecord = await cloudDb
            .select()
            .from(table)
            .where(eq(table.id, record.id))
            .limit(1);

          if (existingCloudRecord.length > 0) {
            // Record exists, check for conflicts
            const cloudRecord = existingCloudRecord[0];
            console.log(`Cloud record found for ${record.id}`, {
              updatedAt: cloudRecord.updatedAt,
              type: typeof cloudRecord.updatedAt,
            });
            const conflict = await this.detectConflict(record, cloudRecord);

            if (conflict) {
              const resolvedRecord = await this.resolveConflict(
                record,
                cloudRecord,
                tableName
              );
              await cloudDb
                .update(table)
                .set(resolvedRecord)
                .where(eq(table.id, record.id));
              stats.conflicts++;
            } else {
              // No conflict, update cloud record
              await cloudDb
                .update(table)
                .set(record)
                .where(eq(table.id, record.id));
            }
          } else {
            // Record doesn't exist in cloud, insert it
            await cloudDb.insert(table).values(record);
          }

          stats.recordsSynced++;
        } catch (error) {
          console.error(`Error syncing record ${record.id} to cloud:`, error);
          // Continue with other records
        }
      }

      // Update sync metadata
      await this.updateSyncStatus(tableName, new Date());

      return stats;
    } catch (error) {
      console.error(`Error syncing table ${tableName} to cloud:`, error);
      throw error;
    }
  }

  private async syncTableFromCloud(tableName: string): Promise<TableSyncStats> {
    const stats: TableSyncStats = {
      recordsSynced: 0,
      conflicts: 0,
    };

    try {
      const localDb = getLocalDb();
      const cloudDb = getCloudDb();
      const table = this.getTableByName(tableName);

      if (!table) {
        throw new Error(`Unknown table: ${tableName}`);
      }

      // Get last sync timestamp
      const syncStatus = await this.getSyncStatus(tableName);
      const lastSyncDate = syncStatus?.lastSyncAt || new Date(0);
      // Handle both Date objects and timestamps
      const lastSync =
        lastSyncDate instanceof Date
          ? Math.floor(lastSyncDate.getTime() / 1000)
          : typeof lastSyncDate === "number"
          ? lastSyncDate
          : 0;

      // Get records modified since last sync from cloud
      // Check if table has updatedAt field, otherwise use createdAt
      const timestampField =
        "updatedAt" in table ? table.updatedAt : table.createdAt;
      const modifiedRecords =
        (await cloudDb
          .select()
          .from(table)
          .where(gt(timestampField, lastSync))) || [];

      for (const record of modifiedRecords) {
        try {
          // Check if record exists locally
          const existingLocalRecord = await localDb
            .select()
            .from(table)
            .where(eq(table.id, record.id))
            .limit(1);

          if (existingLocalRecord.length > 0) {
            // Record exists, check for conflicts
            const localRecord = existingLocalRecord[0];
            const conflict = await this.detectConflict(localRecord, record);

            if (conflict) {
              const resolvedRecord = await this.resolveConflict(
                localRecord,
                record,
                tableName
              );
              await localDb
                .update(table)
                .set(resolvedRecord)
                .where(eq(table.id, record.id));
              stats.conflicts++;
            } else {
              // No conflict, update local record
              await localDb
                .update(table)
                .set(record)
                .where(eq(table.id, record.id));
            }
          } else {
            // Record doesn't exist locally, insert it
            await localDb.insert(table).values(record);
          }

          stats.recordsSynced++;
        } catch (error) {
          console.error(`Error syncing record ${record.id} from cloud:`, error);
          // Continue with other records
        }
      }

      // Update sync metadata
      await this.updateSyncStatus(tableName, new Date());

      return stats;
    } catch (error) {
      console.error(`Error syncing table ${tableName} from cloud:`, error);
      throw error;
    }
  }

  // Conflict detection and resolution
  private async detectConflict(
    localRecord: any,
    cloudRecord: any
  ): Promise<boolean> {
    // A conflict exists if both records have been modified since the last sync
    // and they have different updatedAt timestamps (or createdAt if no updatedAt)
    const localTimestamp = localRecord.updatedAt || localRecord.createdAt;
    const cloudTimestamp = cloudRecord.updatedAt || cloudRecord.createdAt;

    // Handle null/undefined timestamps
    if (!localTimestamp || !cloudTimestamp) {
      return false; // No conflict if either timestamp is missing
    }

    const localUpdated =
      typeof localTimestamp === "number"
        ? localTimestamp
        : localTimestamp instanceof Date
        ? Math.floor(localTimestamp.getTime() / 1000)
        : 0;
    const cloudUpdated =
      typeof cloudTimestamp === "number"
        ? cloudTimestamp
        : cloudTimestamp instanceof Date
        ? Math.floor(cloudTimestamp.getTime() / 1000)
        : 0;

    // If timestamps are the same, no conflict
    if (localUpdated === cloudUpdated) {
      return false;
    }

    // Check if the records have different content (excluding timestamps)
    const localCopy = { ...localRecord };
    const cloudCopy = { ...cloudRecord };

    // Remove timestamp fields for comparison
    delete localCopy.createdAt;
    delete localCopy.updatedAt;
    delete cloudCopy.createdAt;
    delete cloudCopy.updatedAt;

    return JSON.stringify(localCopy) !== JSON.stringify(cloudCopy);
  }

  private async resolveConflict(
    localRecord: any,
    cloudRecord: any,
    tableName: string
  ): Promise<any> {
    // Timestamp-based conflict resolution: most recent update wins
    const localTimestamp = localRecord.updatedAt || localRecord.createdAt;
    const cloudTimestamp = cloudRecord.updatedAt || cloudRecord.createdAt;

    // Handle null/undefined timestamps - prefer cloud record if local timestamp is missing
    if (!localTimestamp && cloudTimestamp) return cloudRecord;
    if (localTimestamp && !cloudTimestamp) return localRecord;
    if (!localTimestamp && !cloudTimestamp) return cloudRecord; // Default to cloud

    const localUpdated =
      typeof localTimestamp === "number"
        ? localTimestamp
        : localTimestamp instanceof Date
        ? Math.floor(localTimestamp.getTime() / 1000)
        : 0;
    const cloudUpdated =
      typeof cloudTimestamp === "number"
        ? cloudTimestamp
        : cloudTimestamp instanceof Date
        ? Math.floor(cloudTimestamp.getTime() / 1000)
        : 0;

    const winner = localUpdated > cloudUpdated ? localRecord : cloudRecord;

    // Log the conflict for audit purposes
    console.log(
      `Conflict resolved for ${tableName} record ${localRecord.id}:`,
      {
        localUpdated: new Date(localUpdated * 1000).toISOString(),
        cloudUpdated: new Date(cloudUpdated * 1000).toISOString(),
        winner: localUpdated > cloudUpdated ? "local" : "cloud",
      }
    );

    // Increment conflict count in metadata
    await this.incrementConflictCount(tableName);

    return {
      ...winner,
      updatedAt: new Date(), // Update timestamp to mark resolution
    };
  }

  private getTableByName(tableName: string): any {
    const tableMap: Record<string, any> = {
      users,
      categories,
      products,
      product_variants: productVariants,
      transactions,
      transaction_items: transactionItems,
    };

    return tableMap[tableName];
  }

  // Queue integration methods
  public queueOperation(
    type: "create" | "update" | "delete",
    tableName: string,
    data: any,
    priority = 1
  ): string {
    return offlineQueue.enqueue({
      type,
      tableName,
      data,
      priority,
      maxRetries: 3,
    });
  }

  public async processOfflineQueue(): Promise<void> {
    await offlineQueue.processQueue();
  }

  // Sync status management
  public subscribeSyncStatus(
    listener: (status: SyncStatus) => void
  ): () => void {
    this.syncListeners.add(listener);

    // Immediately call with current status
    listener(this.getCurrentSyncStatus());

    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifySyncListeners(status: SyncStatus) {
    this.syncListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in sync status listener:", error);
      }
    });
  }

  private getCurrentSyncStatus(): SyncStatus {
    return {
      isOnline: connectionMonitor.isOnline(),
      isSyncing: this.syncInProgress,
      lastSyncAt: this.lastSyncAttempt,
      pendingOperations: offlineQueue.getStats().pendingOperations,
      errors: [],
    };
  }

  // Cleanup
  public destroy() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
    this.syncListeners.clear();
  }

  // Utility methods
  async getAllSyncStatuses(): Promise<SyncMetadata[]> {
    try {
      return await this.localDb
        .select()
        .from(syncMetadata)
        .orderBy(syncMetadata.tableName);
    } catch (error) {
      console.error("Error getting all sync statuses:", error);
      throw error;
    }
  }

  async resetSyncStatus(tableName: string): Promise<void> {
    try {
      await this.localDb
        .delete(syncMetadata)
        .where(eq(syncMetadata.tableName, tableName));
    } catch (error) {
      console.error("Error resetting sync status:", error);
      throw error;
    }
  }
}

// Types
export interface SyncResult {
  success: boolean;
  tablesProcessed: number;
  recordsSynced: number;
  conflicts: number;
  errors: string[];
}

export interface TableSyncStats {
  recordsSynced: number;
  conflicts: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingOperations: number;
  errors: string[];
}

// Export singleton instance
export const syncService = new SyncService();
