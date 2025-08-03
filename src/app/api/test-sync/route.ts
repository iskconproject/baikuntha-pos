import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db/connection';
import { syncService } from '@/services/database/sync';

export async function GET() {
  try {
    console.log('Environment check:');
    console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);
    console.log('TURSO_AUTH_TOKEN exists:', !!process.env.TURSO_AUTH_TOKEN);
    
    console.log('Testing cloud connection...');
    const canConnect = await testConnection();
    
    if (!canConnect) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot connect to cloud database',
        env: {
          hasUrl: !!process.env.TURSO_DATABASE_URL,
          hasToken: !!process.env.TURSO_AUTH_TOKEN
        }
      }, { status: 500 });
    }

    console.log('Performing test sync...');
    const syncResult = await syncService.performFullSync();
    
    return NextResponse.json({
      success: true,
      databaseConnection: canConnect,
      syncResult
    });
  } catch (error) {
    console.error('Test sync error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}