import { NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/db/connection';
import { getCloudDb } from '@/lib/db/cloudConnection';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('Testing simple sync...');
    
    const localDb = getLocalDb();
    const cloudDb = getCloudDb();
    
    // Get all users from local database
    const localUsers = await localDb.select().from(users);
    console.log('Local users:', localUsers.length);
    
    // Get all users from cloud database
    const cloudUsers = await cloudDb.select().from(users);
    console.log('Cloud users:', cloudUsers.length);
    
    return NextResponse.json({
      success: true,
      local: {
        count: localUsers.length,
        users: localUsers.map(u => ({ id: u.id, username: u.username, updatedAt: u.updatedAt }))
      },
      cloud: {
        count: cloudUsers.length,
        users: cloudUsers.map(u => ({ id: u.id, username: u.username, updatedAt: u.updatedAt }))
      }
    });
  } catch (error) {
    console.error('Simple sync test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}