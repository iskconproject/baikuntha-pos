import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;

export function getLocalDb() {
  if (!db) {
    const sqlite = new Database('local.db');
    db = drizzle(sqlite, { schema });
  }
  return db;
}