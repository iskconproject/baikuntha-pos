import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    console.log('Environment variables:');
    console.log('URL:', url);
    console.log('Token exists:', !!authToken);

    if (!url) {
      return NextResponse.json({ 
        success: false, 
        error: 'TURSO_DATABASE_URL is missing' 
      });
    }

    console.log('Creating Turso client...');
    const client = createClient({
      url,
      authToken,
    });

    console.log('Executing test query...');
    const result = await client.execute('SELECT COUNT(*) as count FROM users');
    
    console.log('Query result:', result);

    await client.close();

    return NextResponse.json({
      success: true,
      result: result.rows,
      message: 'Cloud connection successful'
    });
  } catch (error) {
    console.error('Cloud connection test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}