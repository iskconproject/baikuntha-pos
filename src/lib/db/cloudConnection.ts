/**
 * Cloud database connection using Turso LibSQL
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

let cloudDb: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof createClient> | null = null;

export function getCloudDb() {
  if (!cloudDb) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is required');
    }

    client = createClient({
      url,
      authToken,
    });

    cloudDb = drizzle(client, { schema });
  }

  return cloudDb;
}

export function getCloudClient() {
  if (!client) {
    getCloudDb(); // This will initialize the client
  }
  return client!;
}

export async function testCloudConnection(): Promise<boolean> {
  try {
    const db = getCloudDb();
    await db.select().from(schema.syncMetadata).limit(1);
    return true;
  } catch (error) {
    console.error('Cloud database connection test failed:', error);
    return false;
  }
}

export async function closeCloudConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    cloudDb = null;
  }
}