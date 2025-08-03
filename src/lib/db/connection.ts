import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is required');
    }

    client = createClient({
      url,
      authToken,
    });

    db = drizzle(client, { schema });
  }

  return db;
}

export function getClient() {
  if (!client) {
    getDb(); // This will initialize the client
  }
  return client!;
}

export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      console.error('TURSO_DATABASE_URL is missing');
      return false;
    }

    console.log('Creating client with URL:', url);
    
    const testClient = createClient({
      url,
      authToken,
    });
    
    console.log('Test client created, executing query...');
    
    // Simple query to test connection
    const result = await testClient.execute('SELECT COUNT(*) as count FROM users');
    console.log('Query executed successfully, result:', result.rows);
    
    await testClient.close();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    console.error('Error details:', error);
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}