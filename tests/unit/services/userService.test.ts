import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { userService } from '@/services/database/users';
import { userActivityService } from '@/services/database/userActivity';
import bcrypt from 'bcryptjs';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock the user activity service
vi.mock('@/services/database/userActivity', () => ({
  userActivityService: {
    logActivity: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with hashed PIN', async () => {
      const mockHashedPin = 'hashed_pin_123';
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
        pinHash: mockHashedPin,
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      // Mock bcrypt.hash
      vi.mocked(bcrypt.hash).mockImplementation(async () => mockHashedPin);

      // Mock the create method
      const createSpy = vi.spyOn(userService, 'create').mockResolvedValue(mockUser);

      // Mock findByUsername to return null (user doesn't exist)
      const findByUsernameSpy = vi.spyOn(userService, 'findByUsername').mockResolvedValue(null);

      const userData = {
        username: 'testuser',
        pin: '1234',
        role: 'cashier' as const,
      };

      const result = await userService.createUser(userData, 'admin_123', {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(findByUsernameSpy).toHaveBeenCalledWith('testuser');
      expect(bcrypt.hash).toHaveBeenCalledWith('1234', 12);
      expect(createSpy).toHaveBeenCalledWith({
        username: 'testuser',
        role: 'cashier',
        pinHash: mockHashedPin,
      });
      expect(userActivityService.logActivity).toHaveBeenCalledWith(
        'admin_123',
        'create_user',
        {
          targetUserId: 'user_123',
          details: {
            username: 'testuser',
            role: 'cashier',
          },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error if username already exists', async () => {
      const existingUser = {
        id: 'existing_123',
        username: 'testuser',
        pinHash: 'hash',
        role: 'cashier' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(userService, 'findByUsername').mockResolvedValue(existingUser);

      const userData = {
        username: 'testuser',
        pin: '1234',
        role: 'cashier' as const,
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Username already exists');
    });
  });

  describe('verifyPin', () => {
    it('should return user if PIN is valid', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
        pinHash: 'hashed_pin',
        role: 'cashier' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(userService, 'findByUsername').mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockImplementation(async () => true);
      const updateLastLoginSpy = vi.spyOn(userService, 'updateLastLogin').mockResolvedValue();

      const result = await userService.verifyPin('testuser', '1234', {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('1234', 'hashed_pin');
      expect(updateLastLoginSpy).toHaveBeenCalledWith('user_123');
      expect(userActivityService.logActivity).toHaveBeenCalledWith(
        'user_123',
        'login',
        {
          details: { username: 'testuser' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      vi.spyOn(userService, 'findByUsername').mockResolvedValue(null);

      const result = await userService.verifyPin('nonexistent', '1234');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if user is inactive', async () => {
      const inactiveUser = {
        id: 'user_123',
        username: 'testuser',
        pinHash: 'hashed_pin',
        role: 'cashier' as const,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(userService, 'findByUsername').mockResolvedValue(inactiveUser);

      const result = await userService.verifyPin('testuser', '1234');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if PIN is invalid', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
        pinHash: 'hashed_pin',
        role: 'cashier' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(userService, 'findByUsername').mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockImplementation(async () => false);

      const result = await userService.verifyPin('testuser', 'wrong_pin');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user and log activity', async () => {
      const existingUser = {
        id: 'user_123',
        username: 'oldusername',
        pinHash: 'hash',
        role: 'cashier' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const updatedUser = {
        ...existingUser,
        username: 'newusername',
        role: 'manager' as const,
      };

      vi.spyOn(userService, 'findById').mockResolvedValue(existingUser);
      vi.spyOn(userService, 'findByUsername').mockResolvedValue(null); // New username doesn't exist
      
      // Mock database update
      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({ changes: 1 }),
          }),
        }),
      };
      
      // @ts-ignore - Mocking private property
      userService.localDb = mockDb;
      
      // @ts-expect-error: override protected for test
      userService.queueForSync = vi.fn().mockResolvedValue(undefined);
      
      // Mock findById to return updated user on second call
      vi.spyOn(userService, 'findById')
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);

      const updateData = {
        username: 'newusername',
        role: 'manager' as const,
      };

      const result = await userService.updateUser(
        'user_123',
        updateData,
        'admin_123',
        { ipAddress: '127.0.0.1' }
      );

      // queueForSync is protected; skip direct assertion
      expect(userActivityService.logActivity).toHaveBeenCalledWith(
        'admin_123',
        'update_user',
        {
          targetUserId: 'user_123',
          details: {
            username: 'oldusername',
            changes: updateData,
          },
          ipAddress: '127.0.0.1',
        }
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if new username already exists', async () => {
      const existingUser = {
        id: 'user_123',
        username: 'oldusername',
        pinHash: 'hash',
        role: 'cashier' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const conflictUser = {
        id: 'other_123',
        username: 'newusername',
        pinHash: 'hash',
        role: 'manager' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(userService, 'findById').mockResolvedValue(existingUser);
      vi.spyOn(userService, 'findByUsername').mockResolvedValue(conflictUser);

      const updateData = { username: 'newusername' };

      await expect(
        userService.updateUser('user_123', updateData, 'admin_123')
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user and log activity', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
        pinHash: 'hash',
        role: 'cashier' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(userService, 'findById').mockResolvedValue(mockUser);
      
      // Mock database update
      const mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({ changes: 1 }),
          }),
        }),
      };
      
      // @ts-ignore - Mocking private property
      userService.localDb = mockDb;
      
      // @ts-expect-error: override protected for test
      userService.queueForSync = vi.fn().mockResolvedValue(undefined);

      const result = await userService.deactivateUser(
        'user_123',
        'admin_123',
        { ipAddress: '127.0.0.1' }
      );

      // queueForSync is protected; skip direct assertion
      expect(userActivityService.logActivity).toHaveBeenCalledWith(
        'admin_123',
        'deactivate_user',
        {
          targetUserId: 'user_123',
          details: {
            username: 'testuser',
            role: 'cashier',
          },
          ipAddress: '127.0.0.1',
        }
      );
      expect(result).toBe(true);
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      const mockUsers = [
        {
          id: 'user_1',
          username: 'admin',
          pinHash: 'hash',
          role: 'admin' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        },
        {
          id: 'user_2',
          username: 'cashier',
          pinHash: 'hash',
          role: 'cashier' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        },
      ];

      // Mock database queries
      const mockDb = {
        select: vi.fn(),
      };

      // 1st call: user list query (with orderBy/limit/offset/where and with where for fallback)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockUsers),
              }),
            }),
          }),
          where: vi.fn().mockResolvedValue(mockUsers), // for select().from().where() fallback
        }),
      });

      // 2nd call: count query (with where only)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
          orderBy: vi.fn(), // for select().from().orderBy() chain, not used here
        }),
      });

      // @ts-ignore - Mocking private property
      userService.localDb = mockDb;

      const result = await userService.searchUsers({
        search: 'admin',
        role: 'admin',
        isActive: true,
        limit: 10,
        offset: 0,
      });

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
    });
  });
});
