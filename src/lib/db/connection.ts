import { drizzle as drizzleLocal } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleTurso } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Local SQLite database connection
let localDb: ReturnType<typeof drizzleLocal> | null = null;

export function getLocalDb() {
  if (!localDb) {
    const sqlite = new Database(
      process.env.DATABASE_URL?.replace("file:", "") || "./local.db"
    );

    // Enable WAL mode for better concurrency
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("cache_size = 1000000");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("temp_store = MEMORY");

    localDb = drizzleLocal(sqlite, { schema });
  }
  return localDb;
}

// Turso cloud database connection
let cloudDb: ReturnType<typeof drizzleTurso> | null = null;

export function getCloudDb() {
  if (!cloudDb) {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      throw new Error("Turso database credentials not configured");
    }

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    cloudDb = drizzleTurso(client, { schema });
  }
  return cloudDb;
}

// Database connection type
export type LocalDatabase = ReturnType<typeof getLocalDb>;
export type CloudDatabase = ReturnType<typeof getCloudDb>;

// Connection health check
export async function checkLocalConnection(): Promise<boolean> {
  try {
    const db = getLocalDb();
    await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    console.error("Local database connection failed:", error);
    return false;
  }
}

export async function checkCloudConnection(): Promise<boolean> {
  try {
    const db = getCloudDb();
    await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    console.error("Cloud database connection failed:", error);
    return false;
  }
}

// Close connections (useful for testing)
export function closeConnections() {
  localDb = null;
  cloudDb = null;
}
