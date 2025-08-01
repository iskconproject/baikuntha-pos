import { eq, count } from "drizzle-orm";
import { getLocalDb } from "@/lib/db/connection";

// Base database service class with common CRUD operations
export abstract class BaseService<T, TInsert extends Record<string, any>> {
  protected localDb: ReturnType<typeof getLocalDb>;

  constructor() {
    this.localDb = getLocalDb();
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
      const now = new Date();
      const insertData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      } as any;

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
  ): Promise<void> {
    try {
      // Get table name first
      const tableName = this.getTableName();

      // Skip sync if we can't determine table name
      if (tableName === "unknown_table") {
        console.warn(
          `Skipping sync for ${operation} operation - unknown table name`
        );
        return;
      }

      // Import sync service dynamically to avoid circular dependencies
      const { syncService } = await import("./sync");

      // Get the record data for the sync operation
      let data: any = null;
      if (operation !== "delete") {
        data = await this.findById(recordId);
      } else {
        data = { id: recordId };
      }

      // Queue the operation for sync
      syncService.queueOperation(operation, tableName, data);
    } catch (error) {
      console.error(`Error queuing ${operation} operation for sync:`, error);
      // Don't throw the error - sync failure shouldn't break the main operation
    }
  }

  // Get table name for sync operations
  protected getTableName(): string {
    try {
      // Import table references for comparison
      const {
        products,
        categories,
        users,
        productVariants,
        transactions,
        transactionItems,
      } = require("@/lib/db/schema");

      // Method 1: Direct table comparison (most reliable)
      if (this.table === products) return "products";
      if (this.table === categories) return "categories";
      if (this.table === users) return "users";
      if (this.table === productVariants) return "product_variants";
      if (this.table === transactions) return "transactions";
      if (this.table === transactionItems) return "transaction_items";

      // Method 2: Check the Symbol.for('drizzle:Name') property
      const nameSymbol = Symbol.for("drizzle:Name");
      if (this.table[nameSymbol]) {
        return this.table[nameSymbol];
      }

      // Method 3: Check all symbols for drizzle name
      const symbols = Object.getOwnPropertySymbols(this.table);
      for (const symbol of symbols) {
        const symbolStr = symbol.toString();
        if (symbolStr.includes("drizzle:Name")) {
          const value = this.table[symbol];
          if (typeof value === "string" && value.length > 0) {
            return value;
          }
        }
      }

      // Method 4: Check for modern Drizzle structure
      if (this.table._ && this.table._.name) {
        return this.table._.name;
      }

      if (this.table._ && this.table._.baseName) {
        return this.table._.baseName;
      }

      // Method 5: Try to extract from toString
      const tableStr = this.table.toString();
      const match = tableStr.match(/table "([^"]+)"/);
      if (match) {
        return match[1];
      }

      console.warn(
        "Could not determine table name for sync. Disabling sync for this table."
      );
      return "unknown_table";
    } catch (error) {
      console.error("Error extracting table name:", error);
      return "unknown_table";
    }
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
