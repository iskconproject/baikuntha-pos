import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/database/users';
import { userActivityService } from '@/services/database/userActivity';
import { createUserSchema, userQuerySchema } from '@/lib/validation/user';
import { getSessionUser } from '@/lib/auth/session';
import { authService } from '@/services/auth/authService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/users - List users with filtering and pagination
export async function GET(request: NextRequest) {
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
    const queryData = {
      role: searchParams.get('role') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };
    
    const validatedQuery = userQuerySchema.parse(queryData);
    const offset = (validatedQuery.page - 1) * validatedQuery.limit;
    
    // Search users
    const result = await userService.searchUsers({
      search: validatedQuery.search,
      role: validatedQuery.role,
      isActive: validatedQuery.isActive,
      limit: validatedQuery.limit,
      offset,
    });
    
    // Remove sensitive data
    const sanitizedUsers = result.users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    }));
    
    return NextResponse.json({
      users: sanitizedUsers,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / validatedQuery.limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
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
    const validatedData = createUserSchema.parse(body);
    
    // Extract activity tracking info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Create user
    const newUser = await userService.createUser(
      {
        username: validatedData.username,
        pin: validatedData.pin,
        role: validatedData.role,
      },
      currentUser.id,
      { ipAddress, userAgent }
    );
    
    // Return sanitized user data
    const sanitizedUser = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      lastLoginAt: newUser.lastLoginAt,
    };
    
    return NextResponse.json({ user: sanitizedUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Zod validation error
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
