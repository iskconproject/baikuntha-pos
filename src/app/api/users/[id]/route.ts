import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/database/users';
import { userActivityService } from '@/services/database/userActivity';
import { updateUserSchema } from '@/lib/validation/user';
import { getSessionUser } from '@/lib/auth/session';
import { authService } from '@/services/auth/authService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/users/[id] - Get user by ID
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
    
    const user = await userService.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get user activity log
    const activityLog = await userActivityService.getActivityLog({
      userId: params.id,
      limit: 10,
    });
    
    // Return sanitized user data with activity
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      recentActivity: activityLog,
    };
    
    return NextResponse.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const currentUser = await getSessionUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!authService.hasPermission(currentUser.role, 'users:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    
    // Extract activity tracking info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Update user
    const updatedUser = await userService.updateUser(
      params.id,
      validatedData,
      currentUser.id,
      { ipAddress, userAgent }
    );
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return sanitized user data
    const sanitizedUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt,
    };
    
    return NextResponse.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Deactivate user (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const currentUser = await getSessionUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!authService.hasPermission(currentUser.role, 'users:write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Prevent self-deactivation
    if (params.id === currentUser.id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }
    
    // Extract activity tracking info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Deactivate user
    const success = await userService.deactivateUser(
      params.id,
      currentUser.id,
      { ipAddress, userAgent }
    );
    
    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}