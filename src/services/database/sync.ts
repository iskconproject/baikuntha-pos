import { eq, and, or, desc, sql } from 'drizzle-orm';
import { syncMetadata, type SyncMetadata, type NewSyncMetadata } from '@/lib/db/schema';
import { getLocalDb, getCloudDb, checkCloudConnection } from '@/lib/db/connection';
import { BaseService } from './base';

export class SyncService extends BaseService<SyncMetadata, NewSyncMetadata> {
  get table() {
    return syncMetadata;
  }
  
  generateId(): string {
    return this.generateUUID();
  }
  
  // Sync metadata methods
  async getSyncStatus(tableName: string): Promise<SyncMetadata | null> {
    try {
      const result = await this.localDb
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.tableName, tableName))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }
  
  async updateSyncStatus(tableName: string, lastSyncAt: Date, version?: number): Promise<void> {
    try {
      const existing = await this.getSyncStatus(tableName);
      
      if (existing) {
        await this.localDb
          .update(syncMetadata)
          .set({
            lastSyncAt,
            syncVersion: version || (existing.syncVersion || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(syncMetadata.id, existing.id));
      } else {
        await this.create({
          tableName,
          lastSyncAt,
          syncVersion: version || 1
        });
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
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
            updatedAt: new Date()
          })
          .where(eq(syncMetadata.id, existing.id));
      }
    } catch (error) {
      console.error('Error incrementing conflict count:', error);
      throw error;
    }
  }
  
  // Main sync operations
  async syncToCloud(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      tablesProcessed: 0,
      recordsSynced: 0,
      conflicts: 0,
      errors: []
    };
    
    try {
      // Check cloud connection
      const isCloudAvailable = await checkCloudConnection();
      if (!isCloudAvailable) {
        throw new Error('Cloud database is not available');
      }
      
      const tablesToSync = ['users', 'categories', 'products', 'product_variants', 'transactions', 'transaction_items'];
      
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
      
      console.log('Sync to cloud completed:', result);
      return result;
    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Sync to cloud failed:', error);
      return result;
    }
  }
  
  async syncFromCloud(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      tablesProcessed: 0,
      recordsSynced: 0,
      conflicts: 0,
      errors: []
    };
    
    try {
      // Check cloud connection
      const isCloudAvailable = await checkCloudConnection();
      if (!isCloudAvailable) {
        throw new Error('Cloud database is not available');
      }
      
      const tablesToSync = ['users', 'categories', 'products', 'product_variants', 'transactions', 'transaction_items'];
      
      for (const tableName of tablesToSync) {
        try {
          const syncStats = await this.syncTableFromCloud(tableName);
          result.tablesProcessed++;
          result.recordsSynced += syncStats.recordsSynced;
          result.conflicts += syncStats.conflicts;
        } catch (error) {
          result.errors.push(`${tableName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      result.success = result.errors.length === 0;
      
      console.log('Sync from cloud completed:', result);
      return result;
    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Sync from cloud failed:', error);
      return result;
    }
  }
  
  // Table-specific sync methods
  private async syncTableToCloud(tableName: string): Promise<TableSyncStats> {
    const stats: TableSyncStats = {
      recordsSynced: 0,
      conflicts: 0
    };
    
    try {
      const localDb = getLocalDb();
      const cloudDb = this.getCloudDb();
      
      // Get last sync timestamp
      const syncStatus = await this.getSyncStatus(tableName);
      const lastSync = syncStatus?.lastSyncAt || new Date(0);
      
      // Get records modified since last sync
      const modifiedRecords = await localDb.all(sql`
        SELECT * FROM ${sql.identifier(tableName)}
        WHERE updated_at > ${lastSync}
        ORDER BY updated_at ASC
      `);
      
      for (const record of modifiedRecords) {
        try {
          // Check if record exists in cloud
          const existingRecord = await cloudDb.all(sql`
            SELECT * FROM ${sql.identifier(tableName)}
            WHERE id = ${(record as any).id}
            LIMIT 1
          `);
          
          if (existingRecord.length > 0) {
            // Update existing record
            const existing = existingRecord[0];
            
            // Check for conflicts (cloud record is newer)
            if (new Date((existing as any).updated_at) > new Date((record as any).updated_at)) {
              stats.conflicts++;
              await this.incrementConflictCount(tableName);
              continue;
            }
            
            // Update cloud record
            await this.updateCloudRecord(tableName, record);
          } else {
            // Insert new record
            await this.insertCloudRecord(tableName, record);
          }
          
          stats.recordsSynced++;
        } catch (error) {
          console.error(`Error syncing record ${(record as any).id}:`, error);
          stats.conflicts++;
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
      conflicts: 0
    };
    
    try {
      const localDb = getLocalDb();
      const cloudDb = this.getCloudDb();
      
      // Get last sync timestamp
      const syncStatus = await this.getSyncStatus(tableName);
      const lastSync = syncStatus?.lastSyncAt || new Date(0);
      
      // Get records modified since last sync from cloud
      const modifiedRecords = await cloudDb.all(sql`
        SELECT * FROM ${sql.identifier(tableName)}
        WHERE updated_at > ${lastSync}
        ORDER BY updated_at ASC
      `);
      
      for (const record of modifiedRecords) {
        try {
          const recordData = record as any;
          // Check if record exists locally
          const existingRecord = await localDb.all(sql`
            SELECT * FROM ${sql.identifier(tableName)}
            WHERE id = ${recordData.id}
            LIMIT 1
          `);
          
          if (existingRecord.length > 0) {
            // Update existing record
            const existing = existingRecord[0] as any;
            
            // Check for conflicts (local record is newer)
            if (new Date(existing.updated_at) > new Date(recordData.updated_at)) {
              stats.conflicts++;
              await this.incrementConflictCount(tableName);
              continue;
            }
            
            // Update local record
            await this.updateLocalRecord(tableName, recordData);
          } else {
            // Insert new record
            await this.insertLocalRecord(tableName, recordData);
          }
          
          stats.recordsSynced++;
        } catch (error) {
          console.error(`Error syncing record ${(record as any).id}:`, error);
          stats.conflicts++;
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
  
  // Helper methods for record operations
  private async updateCloudRecord(tableName: string, record: any): Promise<void> {
    const cloudDb = this.getCloudDb();
    
    // Build dynamic update query
    const columns = Object.keys(record).filter(key => key !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => record[col]);
    
    await cloudDb.run(sql`
      UPDATE ${sql.identifier(tableName)}
      SET ${sql.raw(setClause)}
      WHERE id = ${record.id}
    `);
  }
  
  private async insertCloudRecord(tableName: string, record: any): Promise<void> {
    const cloudDb = this.getCloudDb();
    
    // Build dynamic insert query
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => record[col]);
    
    await cloudDb.run(sql`
      INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columns.join(', '))})
      VALUES (${sql.raw(placeholders)})
    `);
  }
  
  private async updateLocalRecord(tableName: string, record: any): Promise<void> {
    const localDb = getLocalDb();
    
    // Build dynamic update query
    const columns = Object.keys(record).filter(key => key !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => record[col]);
    
    await localDb.run(sql`
      UPDATE ${sql.identifier(tableName)}
      SET ${sql.raw(setClause)}
      WHERE id = ${record.id}
    `);
  }
  
  private async insertLocalRecord(tableName: string, record: any): Promise<void> {
    const localDb = getLocalDb();
    
    // Build dynamic insert query
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => record[col]);
    
    await localDb.run(sql`
      INSERT INTO ${sql.identifier(tableName)} (${sql.raw(columns.join(', '))})
      VALUES (${sql.raw(placeholders)})
    `);
  }
  
  // Utility methods
  async getAllSyncStatuses(): Promise<SyncMetadata[]> {
    try {
      return await this.localDb
        .select()
        .from(syncMetadata)
        .orderBy(syncMetadata.tableName);
    } catch (error) {
      console.error('Error getting all sync statuses:', error);
      throw error;
    }
  }
  
  async resetSyncStatus(tableName: string): Promise<void> {
    try {
      await this.localDb
        .delete(syncMetadata)
        .where(eq(syncMetadata.tableName, tableName));
    } catch (error) {
      console.error('Error resetting sync status:', error);
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

// Export singleton instance
export const syncService = new SyncService();