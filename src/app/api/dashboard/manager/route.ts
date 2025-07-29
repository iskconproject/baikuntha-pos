import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/dashboard/dashboardService';
import { verifySession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookies
    const sessionToken = request.cookies.get('vaikuntha-session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }
    
    // Verify session and check manager/admin role
    const session = await verifySession(sessionToken);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }
    
    if (session.role !== 'manager' && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Manager or Admin access required' },
        { status: 403 }
      );
    }
    
    const metrics = await dashboardService.getManagerMetrics();
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch manager dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}