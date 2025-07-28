import { eq, count } from "drizzle-orm";
import {
  getLocalDb,
  getCloudDb,
  type LocalDatabase,
  type CloudDatabase,
} from "@/lib/db/connection";

// Base database service class with common CRUD operations
export abstract class BaseService<T, TInsert extends Record<string, any>> {
  protected localDb: LocalDatabase;
  protected cloudDb: CloudDatabase | null = null;

  constructor() {
    this.localDb = getLocalDb();
    // Initialize cloud DB lazily to avoid connection errors during seeding
  }

  protected getCloudDb(): CloudDatabase {
    if (!this.cloudDb) {
      this.cloudDb = getCloudDb();
    }
    return this.cloudDb;
  }

  // Abstract methods to be implemented by child classes
  abstract get table(): any;
  abstract generateId(): string;

  // Common CRUD operations
  async findById(id: string): Promise<T | null> {
    try {
      const result = await this.localDb
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      return (result[0] as T) || null;
    } catch (error) {
      console.error(`Error finding ${this.table} by ID:`, error);
      throw error;
    }
  }

  async findAll(limit?: number, offset?: number): Promise<T[]> {
    try {
      let query = this.localDb.select().from(this.table);

      if (limit && offset) {
        return (await query.limit(limit).offset(offset)) as T[];
      } else if (limit) {
        return (await query.limit(limit)) as T[];
      } else if (offset) {
        return (await query.offset(offset)) as T[];
      }

      return (await query) as T[];
    } catch (error) {
      console.error(`Error finding all ${this.table}:`, error);
      throw error;
    }
  }

  async create(data: Omit<TInsert, "id">): Promise<T> {
    try {
      const id = this.generateId();
      const insertData = { ...data, id } as any;

      await this.localDb.insert(this.table).values(insertData);

      // Queue for sync
      await this.queueForSync("create", id);

      return (await this.findById(id)) as T;
    } catch (error) {
      console.error(`Error creating ${this.table}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<TInsert>): Promise<T | null> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      } as any;

      await this.localDb
        .update(this.table)
        .set(updateData)
        .where(eq(this.table.id, id));

      // Queue for sync
      await this.queueForSync("update", id);

      return await this.findById(id);
    } catch (error) {
      console.error(`Error updating ${this.table}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .delete(this.table)
        .where(eq(this.table.id, id));

      // Queue for sync
      await this.queueForSync("delete", id);

      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting ${this.table}:`, error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      const result = await this.localDb
        .select({ count: count() })
        .from(this.table);

      return result[0]?.count || 0;
    } catch (error) {
      console.error(`Error counting ${this.table}:`, error);
      throw error;
    }
  }

  // Sync operations
  protected async queueForSync(
    operation: "create" | "update" | "delete",
    recordId: string
  ) {
    // This will be implemented in the sync service
    // For now, we'll just log the operation
    console.log(`Queued for sync: ${operation} ${this.table.name} ${recordId}`);
  }

  // Utility methods
  protected generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  protected getCurrentTimestamp(): Date {
    return new Date();
  }
}
