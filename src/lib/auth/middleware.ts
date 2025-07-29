import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, setSessionCookie, refreshSession, isSessionExpiringSoon } from './session';
import { authService } from '@/services/auth/authService';
import type { UserRole, Permission } from '@/types/auth';

export interface AuthMiddlewareOptions {
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  requireAnyPermission?: boolean; // If true, user needs ANY of the permissions, otherwise ALL
}

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
): Promise<NextResponse> {
  try {
    // Get user from session
    const user = await getSessionFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check role requirement
    if (options.requiredRole && user.role !== options.requiredRole) {
      // Allow admin to access any role-restricted endpoint
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Check permission requirements
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasPermission = options.requireAnyPermission
        ? authService.hasAnyPermission(user.role, options.requiredPermissions)
        : authService.hasAllPermissions(user.role, options.requiredPermissions);

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Handle session refresh if needed
    const token = request.cookies.get('vaikuntha-session')?.value;
    if (token) {
      const { verifySession } = await import('./session');
      const sessionData = verifySession(token);
      if (sessionData && isSessionExpiringSoon(sessionData)) {
        const newToken = refreshSession(sessionData);
        const response = await handler(request, user);
        setSessionCookie(response, newToken);
        return response;
      }
    }

    // Call the actual handler
    return await handler(request, user);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Role-based access control decorator
 */
export function requireRole(role: UserRole) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (request: NextRequest) {
      return withAuth(request, originalMethod.bind(this), { requiredRole: role });
    };
  };
}

/**
 * Permission-based access control decorator
 */
export function requirePermissions(permissions: Permission[], requireAny = false) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (request: NextRequest) {
      return withAuth(request, originalMethod.bind(this), {
        requiredPermissions: permissions,
        requireAnyPermission: requireAny,
      });
    };
  };
}

/**
 * Admin-only access decorator
 */
export function adminOnly(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (request: NextRequest) {
    return withAuth(request, originalMethod.bind(this), { requiredRole: 'admin' });
  };
}

/**
 * Check if user can access a specific resource
 */
export function canAccess(userRole: UserRole, requiredPermissions: Permission[]): boolean {
  return authService.hasAllPermissions(userRole, requiredPermissions);
}

/**
 * Get user role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: UserRole): number {
  const levels = {
    cashier: 1,
    manager: 2,
    admin: 3,
  };
  return levels[role] || 0;
}

/**
 * Check if user role has higher or equal level than required role
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Simple auth verification for API routes
 */
export async function verifyAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: any;
  error?: string;
  status?: number;
}> {
  try {
    const user = await getSessionFromRequest(request);
    
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      success: false,
      error: 'Internal server error',
      status: 500,
    };
  }
}