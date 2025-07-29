import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService, dashboardService } from '@/services/dashboard/dashboardService';
import { getLocalDb } from '@/lib/db/connection';

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getLocalDb: vi.fn()
}));

// Mock database query results
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  execute: vi.fn()
};

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocalDb).mockReturnValue(mockDb as any);
  });

  describe('getAdminMetrics', () => {
    it('should return comprehensive admin metrics', async () => {
      // Mock today's sales
      mockDb.execute
        .mockResolvedValueOnce([{ total: 5000, count: 25 }]) // Today's sales
        .mockResolvedValueOnce([{ total: 4500 }]) // Yesterday's sales
        .mockResolvedValueOnce([{ 
          totalProducts: 150, 
          lowStockCount: 5, 
          outOfStockCount: 2 
        }]) // Inventory stats
        .mockResolvedValueOnce([{ count: 10 }]) // Category count
        .mockResolvedValueOnce([{ 
          totalUsers: 8, 
          activeUsers: 6, 
          recentLogins: 4 
        }]) // User stats
        .mockResolvedValueOnce([{ // Recent transactions
          id: '1',
          total: 250,
          itemCount: 3,
          paymentMethod: 'cash',
          createdAt: new Date(),
          userName: 'cashier1'
        }])
        .mockResolvedValueOnce([{ // Top products
          id: '1',
          name: 'Bhagavad Gita',
          salesCount: 15,
          revenue: 3750
        }]);

      const result = await dashboardService.getAdminMetrics();

      expect(result).toEqual({
        todaySales: {
          total: 5000,
          transactionCount: 25,
          averageTransaction: 200,
          trend: {
            value: 11,
            direction: 'up'
          }
        },
        inventory: {
          totalProducts: 150,
          lowStockCount: 5,
          outOfStockCount: 2,
          totalCategories: 10
        },
        users: {
          totalUsers: 8,
          activeUsers: 6,
          recentLogins: 4
        },
        recentTransactions: [{
          id: '1',
          total: 250,
          itemCount: 3,
          paymentMethod: 'cash',
          createdAt: expect.any(Date),
          userName: 'cashier1'
        }],
        topProducts: [{
          id: '1',
          name: 'Bhagavad Gita',
          salesCount: 15,
          revenue: 3750
        }]
      });
    });

    it('should handle zero sales correctly', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ total: 0, count: 0 }]) // Today's sales
        .mockResolvedValueOnce([{ total: 0 }]) // Yesterday's sales
        .mockResolvedValueOnce([{ 
          totalProducts: 150, 
          lowStockCount: 5, 
          outOfStockCount: 2 
        }])
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([{ 
          totalUsers: 8, 
          activeUsers: 6, 
          recentLogins: 4 
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await dashboardService.getAdminMetrics();

      expect(result.todaySales).toEqual({
        total: 0,
        transactionCount: 0,
        averageTransaction: 0,
        trend: {
          value: 0,
          direction: 'neutral'
        }
      });
    });
  });

  describe('getManagerMetrics', () => {
    it('should return manager metrics without user data', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ total: 3500, count: 18 }]) // Today's sales
        .mockResolvedValueOnce([{ total: 3000 }]) // Yesterday's sales
        .mockResolvedValueOnce([{ 
          totalProducts: 120, 
          lowStockCount: 3, 
          outOfStockCount: 1 
        }])
        .mockResolvedValueOnce([{ count: 8 }])
        .mockResolvedValueOnce([{
          id: '1',
          total: 180,
          itemCount: 2,
          paymentMethod: 'upi',
          createdAt: new Date(),
          userName: 'cashier1'
        }])
        .mockResolvedValueOnce([{
          id: '1',
          name: 'Srimad Bhagavatam',
          salesCount: 12,
          revenue: 2400
        }]);

      const result = await dashboardService.getManagerMetrics();

      expect(result).not.toHaveProperty('users');
      expect(result.todaySales.total).toBe(3500);
      expect(result.inventory.totalProducts).toBe(120);
      expect(result.recentTransactions).toHaveLength(1);
      expect(result.topProducts).toHaveLength(1);
    });
  });

  describe('getCashierMetrics', () => {
    it('should return cashier-specific metrics', async () => {
      const userId = 'cashier-123';
      
      mockDb.execute
        .mockResolvedValueOnce([{ total: 1200, count: 8 }]) // Today's sales
        .mockResolvedValueOnce([{ total: 1100 }]) // Yesterday's sales
        .mockResolvedValueOnce([{ // User transactions
          id: '1',
          total: 150,
          itemCount: 2,
          paymentMethod: 'cash',
          createdAt: new Date(),
          userName: 'cashier'
        }]);

      const result = await dashboardService.getCashierMetrics(userId);

      expect(result).toEqual({
        todaySales: {
          total: 1200,
          transactionCount: 8,
          averageTransaction: 150,
          trend: {
            value: 9,
            direction: 'up'
          }
        },
        myTransactions: [{
          id: '1',
          total: 150,
          itemCount: 2,
          paymentMethod: 'cash',
          createdAt: expect.any(Date),
          userName: 'cashier'
        }]
      });
    });
  });

  describe('getQuickStats', () => {
    it('should return admin quick stats', async () => {
      // Mock the getAdminMetrics call
      const service = new DashboardService();
      vi.spyOn(service, 'getAdminMetrics').mockResolvedValue({
        todaySales: {
          total: 5000,
          transactionCount: 25,
          averageTransaction: 200,
          trend: { value: 15, direction: 'up' }
        },
        inventory: {
          totalProducts: 150,
          lowStockCount: 5,
          totalCategories: 10,
          outOfStockCount: 2
        },
        users: {
          totalUsers: 8,
          activeUsers: 6,
          recentLogins: 4
        },
        recentTransactions: [],
        topProducts: []
      });

      const result = await service.getQuickStats('admin');

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        label: 'Today\'s Sales',
        value: '₹5,000',
        subValue: '25 transactions',
        trend: {
          value: 15,
          direction: 'up',
          label: 'vs yesterday'
        }
      });
    });

    it('should return manager quick stats', async () => {
      const service = new DashboardService();
      vi.spyOn(service, 'getManagerMetrics').mockResolvedValue({
        todaySales: {
          total: 3500,
          transactionCount: 18,
          averageTransaction: 194,
          trend: { value: 8, direction: 'up' }
        },
        inventory: {
          totalProducts: 120,
          lowStockCount: 3,
          totalCategories: 8,
          outOfStockCount: 1
        },
        recentTransactions: [],
        topProducts: []
      });

      const result = await service.getQuickStats('manager');

      expect(result).toHaveLength(3);
      expect(result[0].label).toBe('Today\'s Sales');
      expect(result[1].label).toBe('Products');
      expect(result[2].label).toBe('Avg. Transaction');
    });

    it('should return cashier quick stats', async () => {
      const service = new DashboardService();
      const userId = 'cashier-123';
      
      vi.spyOn(service, 'getCashierMetrics').mockResolvedValue({
        todaySales: {
          total: 1200,
          transactionCount: 8,
          averageTransaction: 150,
          trend: { value: 5, direction: 'up' }
        },
        myTransactions: [
          { id: '1', total: 150, itemCount: 2, paymentMethod: 'cash', createdAt: new Date(), userName: 'cashier' }
        ]
      });

      const result = await service.getQuickStats('cashier', userId);

      expect(result).toHaveLength(3);
      expect(result[0].label).toBe('Today\'s Sales');
      expect(result[1].label).toBe('My Transactions');
      expect(result[2].label).toBe('Avg. Sale');
    });

    it('should return empty array for unknown role', async () => {
      const service = new DashboardService();
      const result = await service.getQuickStats('unknown');

      expect(result).toEqual([]);
    });
  });

  describe('trend calculation', () => {
    it('should calculate upward trend correctly', () => {
      const service = new DashboardService();
      const trend = (service as any).calculateTrend(1200, 1000);

      expect(trend).toEqual({
        value: 20,
        direction: 'up'
      });
    });

    it('should calculate downward trend correctly', () => {
      const service = new DashboardService();
      const trend = (service as any).calculateTrend(800, 1000);

      expect(trend).toEqual({
        value: 20,
        direction: 'down'
      });
    });

    it('should handle zero previous value', () => {
      const service = new DashboardService();
      const trend = (service as any).calculateTrend(1000, 0);

      expect(trend).toEqual({
        value: 0,
        direction: 'neutral'
      });
    });

    it('should handle equal values', () => {
      const service = new DashboardService();
      const trend = (service as any).calculateTrend(1000, 1000);

      expect(trend).toEqual({
        value: 0,
        direction: 'neutral'
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      await expect(dashboardService.getAdminMetrics()).rejects.toThrow('Database error');
    });

    it('should handle empty database results', async () => {
      mockDb.execute
        .mockResolvedValueOnce([]) // Empty today's sales
        .mockResolvedValueOnce([]) // Empty yesterday's sales
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await dashboardService.getAdminMetrics();

      expect(result.todaySales.total).toBe(0);
      expect(result.todaySales.transactionCount).toBe(0);
      expect(result.todaySales.averageTransaction).toBe(0);
    });
  });
});