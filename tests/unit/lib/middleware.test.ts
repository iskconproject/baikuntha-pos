import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canAccess, getRoleLevel, hasRoleLevel } from '@/lib/auth/middleware';
import type { AuthUser, UserRole, Permission } from '@/types/auth';

// Mock the session functions
vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: vi.fn(),
  setSessionCookie: vi.fn(),
  refreshSession: vi.fn(),
  isSessionExpiringSoon: vi.fn(),
  verifySession: vi.fn(),
}));

// Mock the auth service
vi.mock('@/services/auth/authService', () => ({
  authService: {
    hasPermission: vi.fn(),
    hasAnyPermission: vi.fn(),
    hasAllPermissions: vi.fn(),
  },
}));

describe('Authentication Middleware', () => {
  const mockUser: AuthUser = {
    id: 'user1',
    username: 'testuser',
    role: 'manager',
    isActive: true,
    lastLoginAt: new Date(),
  };

  const mockAdminUser: AuthUser = {
    id: 'admin1',
    username: 'admin',
    role: 'admin',
    isActive: true,
    lastLoginAt: new Date(),
  };

  const mockCashierUser: AuthUser = {
    id: 'cashier1',
    username: 'cashier',
    role: 'cashier',
    isActive: true,
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withAuth', () => {
    it('should allow authenticated user to access endpoint', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockResolvedValue(mockUser);

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const response = await withAuth(mockRequest, mockHandler);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockUser);
      expect(response.status).toBe(200);
    });

    it('should reject unauthenticated user', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockResolvedValue(null);

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn();

      const response = await withAuth(mockRequest, mockHandler);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('should enforce role requirements', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockResolvedValue(mockCashierUser);

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn();

      const response = await withAuth(
        mockRequest, 
        mockHandler, 
        { requiredRole: 'manager' }
      );

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('should allow admin to access any role-restricted endpoint', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockResolvedValue(mockAdminUser);

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const response = await withAuth(
        mockRequest, 
        mockHandler, 
        { requiredRole: 'manager' }
      );

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockAdminUser);
      expect(response.status).toBe(200);
    });

    it('should enforce permission requirements with hasAllPermissions', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      const { authService } = await import('@/services/auth/authService');
      
      vi.mocked(getSessionFromRequest).mockResolvedValue(mockUser);
      vi.mocked(authService.hasAllPermissions).mockReturnValue(false);

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn();

      const response = await withAuth(
        mockRequest, 
        mockHandler, 
        { requiredPermissions: ['users:read', 'users:write'] }
      );

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('should enforce permission requirements with hasAnyPermission', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      const { authService } = await import('@/services/auth/authService');
      
      vi.mocked(getSessionFromRequest).mockResolvedValue(mockUser);
      vi.mocked(authService.hasAnyPermission).mockReturnValue(true);

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const response = await withAuth(
        mockRequest, 
        mockHandler, 
        { 
          requiredPermissions: ['users:read', 'products:read'],
          requireAnyPermission: true 
        }
      );

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockUser);
      expect(response.status).toBe(200);
      expect(authService.hasAnyPermission).toHaveBeenCalledWith(
        mockUser.role, 
        ['users:read', 'products:read']
      );
    });

    it('should handle session refresh when expiring soon', async () => {
      const { 
        getSessionFromRequest, 
        verifySession, 
        isSessionExpiringSoon, 
        refreshSession,
        setSessionCookie 
      } = await import('@/lib/auth/session');
      
      vi.mocked(getSessionFromRequest).mockResolvedValue(mockUser);
      vi.mocked(verifySession).mockReturnValue({
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: Date.now() - 1000,
        expiresAt: Date.now() + (4 * 60 * 1000), // Expires in 4 minutes
      });
      vi.mocked(isSessionExpiringSoon).mockReturnValue(true);
      vi.mocked(refreshSession).mockReturnValue('new-token');

      const mockRequest = new NextRequest('http://localhost/api/test');
      mockRequest.cookies.set('baikuntha-session', 'old-token');
      
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const response = await withAuth(mockRequest, mockHandler);

      expect(refreshSession).toHaveBeenCalled();
      expect(setSessionCookie).toHaveBeenCalledWith(response, 'new-token');
      expect(response.status).toBe(200);
    });

    it('should handle middleware errors gracefully', async () => {
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockRejectedValue(new Error('Database error'));

      const mockRequest = new NextRequest('http://localhost/api/test');
      const mockHandler = vi.fn();

      const response = await withAuth(mockRequest, mockHandler);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('canAccess', () => {
    it('should check access permissions correctly', async () => {
      const { authService } = await import('@/services/auth/authService');
      vi.mocked(authService.hasAllPermissions).mockReturnValue(true);

      const result = canAccess('admin', ['users:read', 'users:write']);

      expect(result).toBe(true);
      expect(authService.hasAllPermissions).toHaveBeenCalledWith(
        'admin', 
        ['users:read', 'users:write']
      );
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct role levels', () => {
      expect(getRoleLevel('cashier')).toBe(1);
      expect(getRoleLevel('manager')).toBe(2);
      expect(getRoleLevel('admin')).toBe(3);
    });

    it('should return 0 for unknown role', () => {
      expect(getRoleLevel('unknown' as UserRole)).toBe(0);
    });
  });

  describe('hasRoleLevel', () => {
    it('should correctly compare role levels', () => {
      expect(hasRoleLevel('admin', 'manager')).toBe(true);
      expect(hasRoleLevel('admin', 'cashier')).toBe(true);
      expect(hasRoleLevel('manager', 'cashier')).toBe(true);
      expect(hasRoleLevel('manager', 'admin')).toBe(false);
      expect(hasRoleLevel('cashier', 'manager')).toBe(false);
      expect(hasRoleLevel('cashier', 'admin')).toBe(false);
    });

    it('should return true for same role level', () => {
      expect(hasRoleLevel('admin', 'admin')).toBe(true);
      expect(hasRoleLevel('manager', 'manager')).toBe(true);
      expect(hasRoleLevel('cashier', 'cashier')).toBe(true);
    });
  });
});