import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

let testDb: Database.Database;

export async function setupTestDb(): Promise<void> {
  // Create in-memory test database
  testDb = new Database(':memory:');
  
  // Enable foreign keys
  testDb.pragma('foreign_keys = ON');
  
  // Read and execute schema
  const schemaPath = join(process.cwd(), 'drizzle', '0000_large_machine_man.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  testDb.exec(schema);
  
  // Read and execute FTS5 setup
  const ftsPath = join(process.cwd(), 'src', 'lib', 'db', 'migrations', '001_setup_fts5_search.sql');
  const ftsSetup = readFileSync(ftsPath, 'utf-8');
  testDb.exec(ftsSetup);
  
  console.log('Test database setup complete');
}

export async function cleanupTestDb(): Promise<void> {
  if (testDb) {
    testDb.close();
    console.log('Test database cleanup complete');
  }
}

export function getTestDb(): Database.Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return testDb;
}

// Export testDb for direct access in tests
export { testDb };