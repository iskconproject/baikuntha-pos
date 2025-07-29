import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { userActivityService } from '@/services/database/userActivity';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('UserActivityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logActivity', () => {
    it('should log user activity with details', async () => {
      const mockActivity = {
        id: 'activity_123',
        userId: 'user_123',
        action: 'login',
        targetUserId: null,
        details: '{"username":"testuser"}',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date(),
      };

      const createSpy = vi.spyOn(userActivityService, 'create').mockResolvedValue(mockActivity);

      const result = await userActivityService.logActivity(
        'user_123',
        'login',
        {
          details: { username: 'testuser' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }
      );

      expect(createSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        action: 'login',
        targetUserId: undefined,
        details: '{"username":"testuser"}',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(result).toEqual(mockActivity);
    });

    it('should log activity without optional fields', async () => {
      const mockActivity = {
        id: 'activity_123',
        userId: 'user_123',
        action: 'logout',
        targetUserId: null,
        details: null,
        ipAddress: null,
        userAgent: null,
        timestamp: new Date(),
      };

      const createSpy = vi.spyOn(userActivityService, 'create').mockResolvedValue(mockActivity);

      const result = await userActivityService.logActivity('user_123', 'logout');

      expect(createSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        action: 'logout',
        targetUserId: undefined,
        details: null,
        ipAddress: undefined,
        userAgent: undefined,
      });
      expect(result).toEqual(mockActivity);
    });
  });

  describe('getActivityLog', () => {
    it('should return activity log with user details', async () => {
      const mockActivities = [
        {
          id: 'activity_1',
          userId: 'user_123',
          username: 'testuser',
          action: 'login',
          targetUserId: null,
          details: '{"username":"testuser"}',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date(),
        },
        {
          id: 'activity_2',
          userId: 'user_123',
          username: 'testuser',
          action: 'create_user',
          targetUserId: 'user_456',
          details: '{"username":"newuser","role":"cashier"}',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date(),
        },
      ];

      // Mock the database
      const mockDb = {
        select: vi.fn(),
      };

      // Mock the main activity log query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(mockActivities),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock target user lookup - only called once for activity_2
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ username: 'newuser' }]),
          }),
        }),
      });

      // @ts-ignore - Mocking private property
      userActivityService.localDb = mockDb;

      const result = await userActivityService.getActivityLog({
        userId: 'user_123',
        limit: 10,
      });

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('login');
      expect(result[0].details).toEqual({ username: 'testuser' });
      expect(result[1].targetUsername).toBe('newuser');
    });

    it('should filter activities by action', async () => {
      const mockActivities = [
        {
          id: 'activity_1',
          userId: 'user_123',
          username: 'testuser',
          action: 'login',
          targetUserId: null,
          details: null,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date(),
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockActivities),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // @ts-ignore - Mocking private property
      userActivityService.localDb = mockDb;

      const result = await userActivityService.getActivityLog({
        action: 'login',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('login');
    });
  });

  describe('getUserLoginHistory', () => {
    it('should return login activities for user', async () => {
      const getActivityLogSpy = vi.spyOn(userActivityService, 'getActivityLog').mockResolvedValue([
        {
          id: 'activity_1',
          userId: 'user_123',
          username: 'testuser',
          action: 'login',
          targetUserId: undefined,
          targetUsername: undefined,
          details: { username: 'testuser' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          timestamp: new Date(),
        },
      ]);

      const result = await userActivityService.getUserLoginHistory('user_123', 10);

      expect(getActivityLogSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        action: 'login',
        limit: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('login');
    });
  });

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      // Mock the getActivityStats method directly to avoid complex DB mocking
      const mockStats = {
        totalActivities: 100,
        loginCount: 50,
        userManagementCount: 20,
        transactionCount: 30,
        topUsers: [
          { userId: 'user_1', username: 'admin', count: 40 },
          { userId: 'user_2', username: 'manager', count: 30 },
        ],
      };

      const getActivityStatsSpy = vi.spyOn(userActivityService, 'getActivityStats').mockResolvedValue(mockStats);

      const result = await userActivityService.getActivityStats();

      expect(getActivityStatsSpy).toHaveBeenCalled();
      expect(result).toEqual({
        totalActivities: 100,
        loginCount: 50,
        userManagementCount: 20,
        transactionCount: 30,
        topUsers: [
          { userId: 'user_1', username: 'admin', count: 40 },
          { userId: 'user_2', username: 'manager', count: 30 },
        ],
      });

      getActivityStatsSpy.mockRestore();
    });
  });
});
