import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('Testing simple sync...');
    
    const db = getDb();
    
    // Get all users from database
    const allUsers = await db.select().from(users);
    console.log('Users:', allUsers.length);
    
    return NextResponse.json({
      success: true,
      users: {
        count: allUsers.length,
        data: allUsers.map(u => ({ id: u.id, username: u.username, updatedAt: u.updatedAt }))
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