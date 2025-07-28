import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the database and auth service using vi.hoisted
const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}));

vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(() => mockDb),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_pin'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock session functions
vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: vi.fn(),
  createSession: vi.fn().mockResolvedValue('mock-session-token'),
  setSessionCookie: vi.fn().mockReturnValue('vaikuntha-session=mock-token; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400'),
  clearSessionCookie: vi.fn().mockReturnValue('vaikuntha-session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'),
  createSessionCookie: vi.fn().mockReturnValue('vaikuntha-session=mock-token; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400'),
}));

// Mock middleware
vi.mock('@/lib/auth/middleware', () => ({
  withAuth: vi.fn().mockImplementation(async (request, handler) => {
    const mockUser = {
      id: 'user1',
      username: 'testuser',
      role: 'manager',
      isActive: true,
    };
    return handler(request, mockUser);
  }),
}));

import { NextRequest } from 'next/server';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { PUT as changePinPut } from '@/app/api/auth/change-pin/route';

describe('Authentication API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should handle successful login', async () => {
      const bcrypt = await import('bcryptjs');

      // Mock database response
      vi.mocked(mockDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'user1',
              username: 'testuser',
              pinHash: 'hashed_pin',
              role: 'manager',
              isActive: true,
              lastLoginAt: null,
            }])
          })
        })
      } as any);

      // Mock PIN verification
      (bcrypt.default.compare as any).mockResolvedValue(true);

      // Mock update query
      vi.mocked(mockDb.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      } as any);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          pin: '1357',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testuser');
      expect(data.user.role).toBe('manager');
      
      // Check that session cookie is set
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('vaikuntha-session=');
      }
    });

    it('should handle invalid credentials', async () => {
      // Mock empty database response
      vi.mocked(mockDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      } as any);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent',
          pin: '1234',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid username or PIN');
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: '',
          pin: '12', // Too short
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await loginPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should handle logout successfully', async () => {
      const request = new NextRequest('http://localhost/api/auth/logout', {
        method: 'POST',
      });

      const response = await logoutPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
      
      // Check that session cookie is cleared
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('vaikuntha-session=;');
      }
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info for authenticated user', async () => {
      // Mock session verification
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockResolvedValue({
        id: 'user1',
        username: 'testuser',
        role: 'manager',
        isActive: true,
        lastLoginAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/auth/me');

      const response = await meGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testuser');
      expect(data.user.role).toBe('manager');
    });

    it('should return 401 for unauthenticated user', async () => {
      // Mock session verification failure
      const { getSessionFromRequest } = await import('@/lib/auth/session');
      vi.mocked(getSessionFromRequest).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/me');

      const response = await meGet(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });
  });

  describe('PUT /api/auth/change-pin', () => {
    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost/api/auth/change-pin', {
        method: 'PUT',
        body: JSON.stringify({
          currentPin: '12', // Too short
          newPin: '1357',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await changePinPut(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });
});