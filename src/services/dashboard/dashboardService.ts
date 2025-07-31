import { getLocalDb } from '@/lib/db/connection';
import { transactions, products, users, categories, transactionItems, productVariants } from '@/lib/db/schema';
import { sql, eq, and, gte, desc, count } from 'drizzle-orm';
import type { DashboardMetrics, QuickStats } from '@/types';

export class DashboardService {
  private db = getLocalDb();

  /**
   * Get comprehensive dashboard metrics for admin users
   */
  async getAdminMetrics(): Promise<DashboardMetrics> {
    const [
      todaySales,
      yesterdaySales,
      inventoryStats,
      userStats,
      recentTransactions,
      topProducts
    ] = await Promise.all([
      this.getTodaySales(),
      this.getYesterdaySales(),
      this.getInventoryStats(),
      this.getUserStats(),
      this.getRecentTransactions(5),
      this.getTopProducts(5)
    ]);

    // Calculate trend
    const salesTrend = this.calculateTrend(todaySales.total, yesterdaySales);

    return {
      todaySales: {
        ...todaySales,
        trend: salesTrend
      },
      inventory: inventoryStats,
      users: userStats,
      recentTransactions,
      topProducts
    };
  }

  /**
   * Get dashboard metrics for manager users
   */
  async getManagerMetrics(): Promise<Omit<DashboardMetrics, 'users'>> {
    const [
      todaySales,
      yesterdaySales,
      inventoryStats,
      recentTransactions,
      topProducts
    ] = await Promise.all([
      this.getTodaySales(),
      this.getYesterdaySales(),
      this.getInventoryStats(),
      this.getRecentTransactions(5),
      this.getTopProducts(5)
    ]);

    const salesTrend = this.calculateTrend(todaySales.total, yesterdaySales);

    return {
      todaySales: {
        ...todaySales,
        trend: salesTrend
      },
      inventory: inventoryStats,
      recentTransactions,
      topProducts
    };
  }

  /**
   * Get dashboard metrics for cashier users
   */
  async getCashierMetrics(userId: string): Promise<{
    todaySales: DashboardMetrics['todaySales'];
    myTransactions: DashboardMetrics['recentTransactions'];
  }> {
    const [todaySales, yesterdaySales, myTransactions] = await Promise.all([
      this.getTodaySales(),
      this.getYesterdaySales(),
      this.getUserTransactions(userId, 10)
    ]);

    const salesTrend = this.calculateTrend(todaySales.total, yesterdaySales);

    return {
      todaySales: {
        ...todaySales,
        trend: salesTrend
      },
      myTransactions
    };
  }

  /**
   * Get today's sales statistics
   */
  private async getTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(
        and(
          sql`${transactions.createdAt} >= ${today.toISOString()}`,
          sql`${transactions.createdAt} < ${tomorrow.toISOString()}`,
          eq(transactions.status, 'completed')
        )
      );

    const { total, count } = result[0] || { total: 0, count: 0 };
    const averageTransaction = count > 0 ? total / count : 0;

    return {
      total,
      transactionCount: count,
      averageTransaction
    };
  }

  /**
   * Get yesterday's sales for trend calculation
   */
  private async getYesterdaySales(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${transactions.total}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          sql`${transactions.createdAt} >= ${yesterday.toISOString()}`,
          sql`${transactions.createdAt} < ${today.toISOString()}`,
          eq(transactions.status, 'completed')
        )
      );

    return Number(result[0]?.total || 0);
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStats() {
    const [productStats, categoryCount, variantStats] = await Promise.all([
      this.db
        .select({
          totalProducts: sql<number>`COUNT(*)`,
        })
        .from(products)
        .where(eq(products.isActive, true)),
      
      this.db
        .select({ count: count() })
        .from(categories)
        .where(eq(categories.isActive, true)),

      this.db
        .select({
          lowStockCount: sql<number>`COUNT(CASE WHEN ${productVariants.stockQuantity} <= 10 AND ${productVariants.stockQuantity} > 0 THEN 1 END)`,
          outOfStockCount: sql<number>`COUNT(CASE WHEN ${productVariants.stockQuantity} = 0 THEN 1 END)`,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(eq(products.isActive, true))
    ]);

    return {
      totalProducts: productStats[0]?.totalProducts || 0,
      lowStockCount: variantStats[0]?.lowStockCount || 0,
      outOfStockCount: variantStats[0]?.outOfStockCount || 0,
      totalCategories: categoryCount[0]?.count || 0,
    };
  }

  /**
   * Get user statistics (admin only)
   */
  private async getUserStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        activeUsers: sql<number>`SUM(CASE WHEN ${users.isActive} = 1 THEN 1 ELSE 0 END)`,
        recentLogins: sql<number>`SUM(CASE WHEN ${users.lastLoginAt} >= ${thirtyDaysAgo.toISOString()} THEN 1 ELSE 0 END)`,
      })
      .from(users);

    return result[0] || { totalUsers: 0, activeUsers: 0, recentLogins: 0 };
  }

  /**
   * Get recent transactions
   */
  private async getRecentTransactions(limit: number = 5) {
    const result = await this.db
      .select({
        id: transactions.id,
        total: transactions.total,
        itemCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${transactionItems} 
          WHERE ${transactionItems.transactionId} = ${transactions.id}
        )`,
        paymentMethod: transactions.paymentMethod,
        createdAt: transactions.createdAt,
        userName: users.username,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.status, 'completed'))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      total: row.total,
      itemCount: Number(row.itemCount),
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt || new Date(),
      userName: row.userName || 'Unknown User'
    }));
  }

  /**
   * Get user's own transactions (for cashiers)
   */
  private async getUserTransactions(userId: string, limit: number = 10) {
    const result = await this.db
      .select({
        id: transactions.id,
        total: transactions.total,
        itemCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${transactionItems} 
          WHERE ${transactionItems.transactionId} = ${transactions.id}
        )`,
        paymentMethod: transactions.paymentMethod,
        createdAt: transactions.createdAt,
        userName: users.username,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, 'completed')
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      total: row.total,
      itemCount: Number(row.itemCount),
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt || new Date(),
      userName: row.userName || 'Unknown User'
    }));
  }

  /**
   * Get top-selling products
   */
  private async getTopProducts(limit: number = 5) {
    const result = await this.db
      .select({
        id: products.id,
        name: products.name,
        salesCount: sql<number>`COALESCE(SUM(${transactionItems.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${transactionItems.totalPrice}), 0)`,
      })
      .from(products)
      .leftJoin(transactionItems, eq(products.id, transactionItems.productId))
      .leftJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`(${transactions.status} = 'completed' OR ${transactions.status} IS NULL)`
        )
      )
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`COALESCE(SUM(${transactionItems.quantity}), 0)`))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      name: row.name,
      salesCount: Number(row.salesCount),
      revenue: Number(row.revenue),
    }));
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrend(current: number, previous: number): {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  } {
    if (previous === 0) {
      return { value: 0, direction: 'neutral' };
    }

    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';

    return {
      value: Math.round(Math.abs(percentage)),
      direction
    };
  }

  /**
   * Get quick stats for role-based display
   */
  async getQuickStats(role: string, userId?: string): Promise<QuickStats[]> {
    switch (role) {
      case 'admin':
        return this.getAdminQuickStats();
      case 'manager':
        return this.getManagerQuickStats();
      case 'cashier':
        return this.getCashierQuickStats(userId!);
      default:
        return [];
    }
  }

  private async getAdminQuickStats(): Promise<QuickStats[]> {
    const metrics = await this.getAdminMetrics();
    
    return [
      {
        label: 'Today\'s Sales',
        value: `₹${metrics.todaySales.total.toLocaleString()}`,
        subValue: `${metrics.todaySales.transactionCount} transactions`,
        trend: {
          ...metrics.todaySales.trend,
          label: 'vs yesterday'
        }
      },
      {
        label: 'Total Products',
        value: metrics.inventory.totalProducts,
        subValue: `${metrics.inventory.lowStockCount} low stock`
      },
      {
        label: 'Active Users',
        value: metrics.users?.activeUsers || 0,
        subValue: `of ${metrics.users?.totalUsers || 0} total`
      },
      {
        label: 'Categories',
        value: metrics.inventory.totalCategories
      }
    ];
  }

  private async getManagerQuickStats(): Promise<QuickStats[]> {
    const metrics = await this.getManagerMetrics();
    
    return [
      {
        label: 'Today\'s Sales',
        value: `₹${metrics.todaySales.total.toLocaleString()}`,
        subValue: `${metrics.todaySales.transactionCount} transactions`,
        trend: {
          ...metrics.todaySales.trend,
          label: 'vs yesterday'
        }
      },
      {
        label: 'Products',
        value: metrics.inventory.totalProducts,
        subValue: `${metrics.inventory.lowStockCount} low stock`
      },
      {
        label: 'Avg. Transaction',
        value: `₹${Math.round(metrics.todaySales.averageTransaction)}`
      }
    ];
  }

  private async getCashierQuickStats(userId: string): Promise<QuickStats[]> {
    const metrics = await this.getCashierMetrics(userId);
    
    return [
      {
        label: 'Today\'s Sales',
        value: `₹${metrics.todaySales.total.toLocaleString()}`,
        subValue: `${metrics.todaySales.transactionCount} transactions`,
        trend: {
          ...metrics.todaySales.trend,
          label: 'vs yesterday'
        }
      },
      {
        label: 'My Transactions',
        value: metrics.myTransactions.length,
        subValue: 'today'
      },
      {
        label: 'Avg. Sale',
        value: `₹${Math.round(metrics.todaySales.averageTransaction)}`
      }
    ];
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;