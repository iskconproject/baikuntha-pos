import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { userActivity, users, type UserActivity, type NewUserActivity } from '@/lib/db/schema';
import { BaseService } from './base';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  targetUserId?: string;
  targetUsername?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class UserActivityService extends BaseService<UserActivity, NewUserActivity> {
  get table() {
    return userActivity;
  }

  generateId(): string {
    return this.generateUUID();
  }

  constructor() {
    super();
    // Will be set by test or loaded lazily
    this.localDb = undefined;
  }

  private async getDb() {
    if (typeof this.localDb === 'undefined') {
      // Use relative import to avoid alias issues in test
      const { getLocalDb } = await import('../../lib/db/connection');
      this.localDb = getLocalDb();
    }
    return this.localDb;
  }

  get table() {
    return userActivity;
  }
  
  generateId(): string {
    return this.generateUUID();
  }
  
  // Log user activity
  async logActivity(
    userId: string,
    action: string,
    options: {
      targetUserId?: string;
      details?: any;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<UserActivity> {
    try {
      const activityData: Omit<NewUserActivity, 'id'> = {
        userId,
        action,
        targetUserId: options.targetUserId,
        details: options.details ? JSON.stringify(options.details) : null,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      };
      
      return await this.create(activityData);
    } catch (error) {
      console.error('Error logging user activity:', error);
      throw error;
    }
  }
  
  // Get activity log with user details
  async getActivityLog(options: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<ActivityLogEntry[]> {
    try {
      const { userId, action, startDate, endDate, limit = 50, offset = 0 } = options;
      
      // Build conditions
      const conditions = [];
      
      if (userId) {
        conditions.push(eq(userActivity.userId, userId));
      }
      
      if (action) {
        conditions.push(eq(userActivity.action, action));
      }
      
      if (startDate) {
        conditions.push(gte(userActivity.timestamp, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(userActivity.timestamp, endDate));
      }
      
      // Build query
      const db = await this.getDb();
      const baseQuery = db
        .select({
          id: userActivity.id,
          userId: userActivity.userId,
          username: users.username,
          action: userActivity.action,
          targetUserId: userActivity.targetUserId,
          details: userActivity.details,
          ipAddress: userActivity.ipAddress,
          userAgent: userActivity.userAgent,
          timestamp: userActivity.timestamp,
        })
        .from(userActivity)
        .leftJoin(users, eq(userActivity.userId, users.id))
        .orderBy(desc(userActivity.timestamp))
        .limit(limit)
        .offset(offset);
      
      const results = conditions.length > 0 
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;
      
      // For activities with target users, get target user details
      const activitiesWithTargets = await Promise.all(
        results.map(async (activity: any) => {
          let targetUsername = null;

          if (activity.targetUserId) {
            const db = await this.getDb();
            const targetUser = await db
              .select({ username: users.username })
              .from(users)
              .where(eq(users.id, activity.targetUserId))
              .limit(1);

            targetUsername = targetUser[0]?.username || null;
          }

          return {
            ...activity,
            userId: activity.userId || '', // Ensure userId is never null
            username: activity.username || 'Unknown',
            targetUsername,
            details: activity.details ? JSON.parse(activity.details) : null,
          } as ActivityLogEntry;
        })
      );
      
      return activitiesWithTargets;
    } catch (error) {
      console.error('Error getting activity log:', error);
      throw error;
    }
  }
  
  // Get user login history
  async getUserLoginHistory(userId: string, limit: number = 20): Promise<ActivityLogEntry[]> {
    return this.getActivityLog({
      userId,
      action: 'login',
      limit,
    });
  }
  
  // Get recent activity for a user
  async getRecentUserActivity(userId: string, hours: number = 24): Promise<ActivityLogEntry[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.getActivityLog({
      userId,
      startDate,
      limit: 100,
    });
  }
  
  // Get activity statistics
  async getActivityStats(startDate?: Date, endDate?: Date): Promise<{
    totalActivities: number;
    loginCount: number;
    userManagementCount: number;
    transactionCount: number;
    topUsers: { userId: string; username: string; count: number }[];
  }> {
    try {
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(userActivity.timestamp, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(userActivity.timestamp, endDate));
      }

      const db = await this.getDb();
      
      // Get total activities
      const totalQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userActivity);
      
      const totalResult = conditions.length > 0 
        ? await totalQuery.where(and(...conditions))
        : await totalQuery;
      const totalActivities = totalResult[0]?.count || 0;
      
      // Get login count
      const loginConditions = [eq(userActivity.action, 'login'), ...conditions];
      const loginQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userActivity);
      
      const loginResult = await loginQuery.where(and(...loginConditions));
      const loginCount = loginResult[0]?.count || 0;
      
      // Get user management activities count
      const userMgmtConditions = [
        sql`action IN ('create_user', 'update_user', 'deactivate_user', 'reactivate_user', 'change_pin')`,
        ...conditions
      ];
      const userMgmtQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userActivity);
      
      const userMgmtResult = await userMgmtQuery.where(and(...userMgmtConditions));
      const userManagementCount = userMgmtResult[0]?.count || 0;
      
      // Get transaction activities count
      const transactionConditions = [
        sql`action IN ('create_transaction', 'void_transaction')`,
        ...conditions
      ];
      const transactionQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(userActivity);
      
      const transactionResult = await transactionQuery.where(and(...transactionConditions));
      const transactionCount = transactionResult[0]?.count || 0;
      
      // Get top users by activity
      const topUsersQuery = db
        .select({
          userId: userActivity.userId,
          username: users.username,
          count: sql<number>`count(*) as count`,
        })
        .from(userActivity)
        .leftJoin(users, eq(userActivity.userId, users.id))
        .groupBy(userActivity.userId, users.username)
        .orderBy(desc(sql`count(*)`))
        .limit(5);
      
      let topUsers = conditions.length > 0 
        ? await topUsersQuery.where(and(...conditions))
        : await topUsersQuery;
      
      if (!Array.isArray(topUsers)) {
        topUsers = topUsers ? [topUsers] : [];
      }

      return {
        totalActivities,
        loginCount,
        userManagementCount,
        transactionCount,
        topUsers: topUsers.map((user: { userId: string; username: string; count: number }) => ({
          userId: user.userId || '',
          username: user.username || 'Unknown',
          count: user.count,
        })),
      };
    } catch (error) {
      console.error('Error getting activity stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userActivityService = new UserActivityService();
