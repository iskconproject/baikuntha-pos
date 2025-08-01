import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/services/dashboard/dashboardService';
import { verifySession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookies
    const sessionToken = request.cookies.get('baikuntha-session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }
    
    // Verify session
    const session = await verifySession(sessionToken);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }
    
    // Use the user ID from the session
    const metrics = await dashboardService.getCashierMetrics(session.userId);
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch cashier dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}