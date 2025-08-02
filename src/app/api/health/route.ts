import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors/apiErrorHandler';

async function healthHandler(request: NextRequest): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  
  // Basic health check
  const health = {
    status: 'healthy',
    timestamp,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  // For HEAD requests (used by connectivity checks), return minimal response
  if (request.method === 'HEAD') {
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }

  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

export const GET = withErrorHandling(healthHandler);
export const HEAD = withErrorHandling(healthHandler);