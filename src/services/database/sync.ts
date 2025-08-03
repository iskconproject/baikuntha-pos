import { eq } from "drizzle-orm";
import {
  syncMetadata,
  type SyncMetadata,
  type NewSyncMetadata,
} from "@/lib/db/schema";
import { getDb, testConnection } from "@/lib/db/connection";
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
    // Process offline queue every 2 minutes when online
    this.autoSyncInterval = setInterval(() => {
      if (connectionMonitor.isOnline() && !this.syncInProgress) {
        this.processOfflineQueue();
      }
    }, 2 * 60 * 1000);
  }

  private setupConnectionListener() {
    connectionMonitor.subscribe((status) => {
      if (status.isOnline && !this.syncInProgress) {
        // Delay sync slightly to allow connection to stabilize
        setTimeout(() => {
          this.processOfflineQueue();
        }, 2000);
      }
    });
  }

  // Sync metadata methods
  async getSyncStatus(tableName: string): Promise<SyncMetadata | null> {
    try {
      const result = await this.db
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.tableName, tableName))
        .limit(1);

      const record = result[0] || null;
      if (record) {
        console.log(`Sync status for ${tableName}:`, {
          lastSyncAt: record.lastSyncAt,
          type: typeof record.lastSyncAt,
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
        await this.db
          .update(syncMetadata)
          .set({
            lastSyncAt,
            syncVersion: version || (existing.syncVersion || 0) + 1,
            updatedAt: this.getCurrentTimestamp(),
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

  // Main sync operations - simplified to just process offline queue
  async performFullSync(): Promise<SyncResult> {
    return this.processOfflineQueue();
  }

  async processOfflineQueue(): Promise<SyncResult> {
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
      // Test database connection
      const canConnect = await testConnection();
      if (!canConnect) {
        throw new Error("Cannot connect to database");
      }

      // Process offline queue
      await offlineQueue.processQueue();

      const result: SyncResult = {
        success: true,
        tablesProcessed: 1,
        recordsSynced: 0, // Will be updated by queue processing
        conflicts: 0,
        errors: [],
      };

      this.notifySyncListeners({
        isOnline: connectionMonitor.isOnline(),
        isSyncing: false,
        lastSyncAt: new Date(),
        pendingOperations: offlineQueue.getStats().pendingOperations,
        errors: [],
      });

      return result;
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
      return await this.db
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
      await this.db
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
