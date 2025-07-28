import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the database using vi.hoisted to ensure it's available during module loading
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

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import { authService } from '@/services/auth/authService';
import type { LoginRequest, UserRole } from '@/types/auth';
import { ROLE_PERMISSIONS } from '@/types/auth';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear login attempts before each test
    authService.clearLoginAttempts();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PIN validation', () => {
    it('should validate correct PIN format', () => {
      const result = authService.validatePin('1357'); // Non-sequential PIN
      expect(result.isValid).toBe(true);
    });

    it('should reject PIN that is too short', () => {
      const result = authService.validatePin('123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 4 digits');
    });

    it('should reject PIN that is too long', () => {
      const result = authService.validatePin('123456789');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('not exceed 8 digits');
    });

    it('should reject PIN with non-numeric characters', () => {
      const result = authService.validatePin('12a4');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('only numbers');
    });

    it('should reject weak PINs with repeated digits', () => {
      const result = authService.validatePin('1111');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too simple');
    });

    it('should reject weak PINs with sequential ascending digits', () => {
      const result = authService.validatePin('1234');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too simple');
    });

    it('should reject weak PINs with sequential descending digits', () => {
      const result = authService.validatePin('4321');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too simple');
    });

    it('should accept strong PINs', () => {
      const result = authService.validatePin('1357');
      expect(result.isValid).toBe(true);
    });
  });

  describe('PIN hashing and verification', () => {
    it('should hash PIN correctly', async () => {
      const bcrypt = await import('bcryptjs');
      (bcrypt.default.hash as any).mockResolvedValue('hashed_pin');

      const result = await authService.hashPin('1234');
      expect(result).toBe('hashed_pin');
      expect(bcrypt.default.hash).toHaveBeenCalledWith('1234', 12);
    });

    it('should verify PIN correctly', async () => {
      const bcrypt = await import('bcryptjs');
      (bcrypt.default.compare as any).mockResolvedValue(true);

      const result = await authService.verifyPin('1234', 'hashed_pin');
      expect(result).toBe(true);
      expect(bcrypt.default.compare).toHaveBeenCalledWith('1234', 'hashed_pin');
    });
  });

  describe('Permission system', () => {
    it('should check admin permissions correctly', () => {
      const hasUserRead = authService.hasPermission('admin', 'users:read');
      const hasUserWrite = authService.hasPermission('admin', 'users:write');
      const hasProductRead = authService.hasPermission('admin', 'products:read');
      
      expect(hasUserRead).toBe(true);
      expect(hasUserWrite).toBe(true);
      expect(hasProductRead).toBe(true);
    });

    it('should check manager permissions correctly', () => {
      const hasUserRead = authService.hasPermission('manager', 'users:read');
      const hasUserWrite = authService.hasPermission('manager', 'users:write');
      const hasProductRead = authService.hasPermission('manager', 'products:read');
      const hasProductWrite = authService.hasPermission('manager', 'products:write');
      
      expect(hasUserRead).toBe(false);
      expect(hasUserWrite).toBe(false);
      expect(hasProductRead).toBe(true);
      expect(hasProductWrite).toBe(true);
    });

    it('should check cashier permissions correctly', () => {
      const hasUserRead = authService.hasPermission('cashier', 'users:read');
      const hasProductRead = authService.hasPermission('cashier', 'products:read');
      const hasTransactionRead = authService.hasPermission('cashier', 'transactions:read');
      const hasTransactionWrite = authService.hasPermission('cashier', 'transactions:write');
      
      expect(hasUserRead).toBe(false);
      expect(hasProductRead).toBe(false);
      expect(hasTransactionRead).toBe(true);
      expect(hasTransactionWrite).toBe(true);
    });

    it('should check if user has any of specified permissions', () => {
      const hasAny = authService.hasAnyPermission('manager', ['users:read', 'products:read']);
      expect(hasAny).toBe(true);

      const hasNone = authService.hasAnyPermission('cashier', ['users:read', 'products:read']);
      expect(hasNone).toBe(false);
    });

    it('should check if user has all specified permissions', () => {
      const hasAll = authService.hasAllPermissions('admin', ['users:read', 'products:read']);
      expect(hasAll).toBe(true);

      const hasNotAll = authService.hasAllPermissions('manager', ['users:read', 'products:read']);
      expect(hasNotAll).toBe(false);
    });
  });

  describe('Login functionality', () => {
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

      const credentials: LoginRequest = {
        username: 'testuser',
        pin: '1234',
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('testuser');
      expect(result.user?.role).toBe('manager');
    });

    it('should handle login with invalid username', async () => {
      const { getLocalDb } = await import('@/lib/db/connection');
      const db = vi.mocked(getLocalDb)();

      // Mock empty database response
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      } as any);

      const credentials: LoginRequest = {
        username: 'nonexistent',
        pin: '1234',
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid username or PIN');
    });

    it('should handle login with invalid PIN', async () => {
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

      // Mock PIN verification failure
      (bcrypt.default.compare as any).mockResolvedValue(false);

      const credentials: LoginRequest = {
        username: 'testuser',
        pin: 'wrong',
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid username or PIN');
    });

    it('should handle login with inactive user', async () => {
      // Mock database response with inactive user
      vi.mocked(mockDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'user1',
              username: 'testuser',
              pinHash: 'hashed_pin',
              role: 'manager',
              isActive: false,
              lastLoginAt: null,
            }])
          })
        })
      } as any);

      const credentials: LoginRequest = {
        username: 'testuser',
        pin: '1234',
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('deactivated');
    });
  });

  describe('Rate limiting', () => {
    it('should allow login attempts under the limit', async () => {
      // Mock database response with no user (to trigger failed attempts)
      vi.mocked(mockDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      } as any);

      const credentials: LoginRequest = {
        username: 'testuser',
        pin: '1234',
      };

      // Make 4 failed attempts (under the limit of 5)
      for (let i = 0; i < 4; i++) {
        const result = await authService.login(credentials);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid username or PIN');
      }
    });

    it('should lock user after max failed attempts', async () => {
      // Mock database response with no user (to trigger failed attempts)
      vi.mocked(mockDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      } as any);

      const credentials: LoginRequest = {
        username: 'testuser',
        pin: '1234',
      };

      // Make 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        await authService.login(credentials);
      }

      // Next attempt should be locked
      const result = await authService.login(credentials);
      expect(result.success).toBe(false);
      expect(result.message).toContain('temporarily locked');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
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
              lastLoginAt: new Date('2024-01-01'),
            }])
          })
        })
      } as any);

      const user = await authService.getUserById('user1');

      expect(user).toBeDefined();
      expect(user?.id).toBe('user1');
      expect(user?.username).toBe('testuser');
      expect(user?.role).toBe('manager');
    });

    it('should return null when user not found', async () => {
      // Mock empty database response
      vi.mocked(mockDb.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      } as any);

      const user = await authService.getUserById('nonexistent');

      expect(user).toBeNull();
    });
  });
});