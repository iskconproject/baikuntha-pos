import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getUsersGET, POST as createUserPOST } from '@/app/api/users/route';
import { GET as getUserGET, PUT as updateUserPUT, DELETE as deactivateUserDELETE } from '@/app/api/users/[id]/route';
import { POST as reactivateUserPOST } from '@/app/api/users/[id]/reactivate/route';

// Mock the services
vi.mock('@/services/database/users', () => ({
  userService: {
    searchUsers: vi.fn(),
    createUser: vi.fn(),
    findById: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
  },
}));

vi.mock('@/services/database/userActivity', () => ({
  userActivityService: {
    getActivityLog: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

import { userService } from '@/services/database/users';
import { userActivityService } from '@/services/database/userActivity';
import { getSessionUser } from '@/lib/auth/session';

describe('User API Endpoints', () => {
  const mockAdminUser = {
    id: 'admin_123',
    username: 'admin',
    role: 'admin' as const,
    isActive: true,
  };

  const mockManagerUser = {
    id: 'manager_123',
    username: 'manager',
    role: 'manager' as const,
    isActive: true,
  };

  const mockCashierUser = {
    id: 'cashier_123',
    username: 'cashier',
    role: 'cashier' as const,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return users list for admin', async () => {
      const mockUsers = [
        {
          id: 'user_1',
          username: 'user1',
          pinHash: 'hashed_pin',
          role: 'cashier',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        },
      ];

      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.searchUsers).mockResolvedValue({
        users: mockUsers,
        total: 1,
      });

      const request = new NextRequest('http://localhost/api/users');
      const response = await getUsersGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users');
      const response = await getUsersGET(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 for cashier role', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockCashierUser);

      const request = new NextRequest('http://localhost/api/users');
      const response = await getUsersGET(request);

      expect(response.status).toBe(403);
    });

    it('should handle search parameters', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.searchUsers).mockResolvedValue({
        users: [],
        total: 0,
      });

      const request = new NextRequest('http://localhost/api/users?search=test&role=cashier&page=2');
      await getUsersGET(request);

      expect(userService.searchUsers).toHaveBeenCalledWith({
        search: 'test',
        role: 'cashier',
        isActive: undefined,
        limit: 20,
        offset: 20,
      });
    });
  });

  describe('POST /api/users', () => {
    it('should create user for admin', async () => {
const newUser = {
  id: 'user_123',
  username: 'testuser',
  pinHash: '',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
};

      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.createUser).mockResolvedValue(newUser);

      const requestBody = {
        username: 'newuser',
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier',
      };

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await createUserPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.username).toBe('newuser');
      expect(userService.createUser).toHaveBeenCalledWith(
        {
          username: 'newuser',
          pin: '1357',
          role: 'cashier',
        },
        'admin_123',
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        })
      );
    });

    it('should return 403 for manager role', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockManagerUser);

      const requestBody = {
        username: 'newuser',
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier',
      };

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await createUserPOST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid data', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);

      const requestBody = {
        username: 'ab', // Too short
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier',
      };

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await createUserPOST(request);

      expect(response.status).toBe(400);
    });

    it('should return 409 for duplicate username', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.createUser).mockRejectedValue(new Error('Username already exists'));

      const requestBody = {
        username: 'existinguser',
        pin: '1357',
        confirmPin: '1357',
        role: 'cashier',
      };

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await createUserPOST(request);

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/users/[id]', () => {
    it('should return user with activity log', async () => {
const mockUser = {
  id: 'user_123',
  username: 'testuser',
  pinHash: '',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
};

      const mockActivity = [
        {
          id: 'activity_1',
          userId: 'user_123',
          username: 'testuser',
          action: 'login',
          timestamp: new Date(),
        },
      ];

      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.findById).mockResolvedValue(mockUser);
      vi.mocked(userActivityService.getActivityLog).mockResolvedValue(mockActivity);

      const request = new NextRequest('http://localhost/api/users/user_123');
      const response = await getUserGET(request, { params: { id: 'user_123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.username).toBe('testuser');
      expect(data.user.recentActivity).toHaveLength(1);
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.findById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/nonexistent');
      const response = await getUserGET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/[id]', () => {
    it('should update user for admin', async () => {
const updatedUser = {
  id: 'user_123',
  username: 'updateduser',
  pinHash: '',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
};

      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.updateUser).mockResolvedValue(updatedUser);

      const requestBody = {
        username: 'updateduser',
        role: 'manager',
      };

      const request = new NextRequest('http://localhost/api/users/user_123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await updateUserPUT(request, { params: { id: 'user_123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.username).toBe('updateduser');
      expect(userService.updateUser).toHaveBeenCalledWith(
        'user_123',
        requestBody,
        'admin_123',
        expect.any(Object)
      );
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.updateUser).mockResolvedValue(null);

      const requestBody = { username: 'newname' };

      const request = new NextRequest('http://localhost/api/users/nonexistent', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await updateUserPUT(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should deactivate user for admin', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.deactivateUser).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/users/user_123', {
        method: 'DELETE',
      });

      const response = await deactivateUserDELETE(request, { params: { id: 'user_123' } });

      expect(response.status).toBe(200);
      expect(userService.deactivateUser).toHaveBeenCalledWith(
        'user_123',
        'admin_123',
        expect.any(Object)
      );
    });

    it('should return 400 when trying to deactivate self', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);

      const request = new NextRequest('http://localhost/api/users/admin_123', {
        method: 'DELETE',
      });

      const response = await deactivateUserDELETE(request, { params: { id: 'admin_123' } });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.deactivateUser).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/users/nonexistent', {
        method: 'DELETE',
      });

      const response = await deactivateUserDELETE(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users/[id]/reactivate', () => {
    it('should reactivate user for admin', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.reactivateUser).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/users/user_123/reactivate', {
        method: 'POST',
      });

      const response = await reactivateUserPOST(request, { params: { id: 'user_123' } });

      expect(response.status).toBe(200);
      expect(userService.reactivateUser).toHaveBeenCalledWith(
        'user_123',
        'admin_123',
        expect.any(Object)
      );
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockAdminUser);
      vi.mocked(userService.reactivateUser).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/users/nonexistent/reactivate', {
        method: 'POST',
      });

      const response = await reactivateUserPOST(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });
  });
});
