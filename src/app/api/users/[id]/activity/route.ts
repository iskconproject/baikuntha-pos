import { NextRequest, NextResponse } from 'next/server';
import { userActivityService } from '@/services/database/userActivity';
import { getSessionUser } from '@/lib/auth/session';
import { authService } from '@/services/auth/authService';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/users/[id]/activity - Get user activity log
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const currentUser = await getSessionUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!authService.hasPermission(currentUser.role, 'users:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    // Get activity log
    const activityLog = await userActivityService.getActivityLog({
      userId: params.id,
      action,
      startDate,
      endDate,
      limit,
      offset,
    });
    
    return NextResponse.json({ activities: activityLog });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}