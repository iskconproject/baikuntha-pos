import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/database/users';
import { getSessionUser } from '@/lib/auth/session';
import { authService } from '@/services/auth/authService';
import { ROLE_PERMISSIONS } from '@/types/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/users/[id]/reactivate - Reactivate user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const currentUser = await getSessionUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!ROLE_PERMISSIONS[currentUser.role].includes('users:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Extract activity tracking info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Reactivate user
    const success = await userService.reactivateUser(
      params.id,
      currentUser.id,
      { ipAddress, userAgent }
    );
    
    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating user:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
