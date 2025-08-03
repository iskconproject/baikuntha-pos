import { eq, count } from "drizzle-orm";
import { getDb } from "@/lib/db/connection";

// Base database service class with common CRUD operations
export abstract class BaseService<T, TInsert extends Record<string, any>> {
  protected db: ReturnType<typeof getDb>;

  constructor() {
    this.db = getDb();
  }

  // Abstract methods to be implemented by child classes
  abstract get table(): any;
  abstract generateId(): string;

  // Common CRUD operations
  async findById(id: string): Promise<T | null> {
    try {
      const result = await this.db
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
      let query = this.db.select().from(this.table);

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
      const now = new Date(); // Drizzle will convert to Unix timestamp
      const insertData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      } as any;

      await this.db.insert(this.table).values(insertData);

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
        updatedAt: new Date(), // Drizzle will convert to Unix timestamp
      } as any;

      await this.db
        .update(this.table)
        .set(updateData)
        .where(eq(this.table.id, id));

      return await this.findById(id);
    } catch (error) {
      console.error(`Error updating ${this.table}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(this.table)
        .where(eq(this.table.id, id));

      return result.rowsAffected > 0;
    } catch (error) {
      console.error(`Error deleting ${this.table}:`, error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(this.table);

      return result[0]?.count || 0;
    } catch (error) {
      console.error(`Error counting ${this.table}:`, error);
      throw error;
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
    return new Date(); // Drizzle will convert to Unix timestamp
  }
}
