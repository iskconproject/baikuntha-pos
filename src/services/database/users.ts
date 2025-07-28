import { eq, and, desc, like, or, sql } from 'drizzle-orm';
import { users, type User, type NewUser } from '@/lib/db/schema';
import { BaseService } from './base';
import { userActivityService } from './userActivity';
import bcrypt from 'bcryptjs';

export class UserService extends BaseService<User, NewUser> {
  get table() {
    return users;
  }
  
  generateId(): string {
    return this.generateUUID();
  }
  
  // User-specific methods
  async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.localDb
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }
  
  async findByRole(role: string): Promise<User[]> {
    try {
      return await this.localDb
        .select()
        .from(users)
        .where(eq(users.role, role))
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error finding users by role:', error);
      throw error;
    }
  }
  
  async findActiveUsers(): Promise<User[]> {
    try {
      return await this.localDb
        .select()
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error finding active users:', error);
      throw error;
    }
  }
  
  async createUser(
    userData: Omit<NewUser, 'id' | 'pinHash'> & { pin: string },
    createdByUserId?: string,
    activityOptions?: { ipAddress?: string; userAgent?: string }
  ): Promise<User> {
    try {
      const { pin, ...rest } = userData;
      
      // Check if username already exists
      const existingUser = await this.findByUsername(rest.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }
      
      // Hash the PIN
      const saltRounds = parseInt(process.env.PIN_HASH_ROUNDS || '12');
      const pinHash = await bcrypt.hash(pin, saltRounds);
      
      const newUser = {
        ...rest,
        pinHash,
      } as Omit<NewUser, 'id'>;
      
      const createdUser = await this.create(newUser);
      
      // Log activity if creator is provided
      if (createdByUserId) {
        await userActivityService.logActivity(
          createdByUserId,
          'create_user',
          {
            targetUserId: createdUser.id,
            details: {
              username: createdUser.username,
              role: createdUser.role,
            },
            ...activityOptions,
          }
        );
      }
      
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async verifyPin(
    username: string, 
    pin: string,
    activityOptions?: { ipAddress?: string; userAgent?: string }
  ): Promise<User | null> {
    try {
      const user = await this.findByUsername(username);
      
      if (!user || !user.isActive) {
        return null;
      }
      
      const isValidPin = await bcrypt.compare(pin, user.pinHash);
      
      if (isValidPin) {
        // Update last login time
        await this.updateLastLogin(user.id);
        
        // Log login activity
        await userActivityService.logActivity(
          user.id,
          'login',
          {
            details: { username: user.username },
            ...activityOptions,
          }
        );
        
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      throw error;
    }
  }
  
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.localDb
        .update(users)
        .set({ 
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await this.queueForSync('update', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }
  
  async changePin(
    userId: string, 
    newPin: string,
    changedByUserId?: string,
    activityOptions?: { ipAddress?: string; userAgent?: string }
  ): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const saltRounds = parseInt(process.env.PIN_HASH_ROUNDS || '12');
      const pinHash = await bcrypt.hash(newPin, saltRounds);
      
      const result = await this.localDb
        .update(users)
        .set({ 
          pinHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await this.queueForSync('update', userId);
      
      // Log activity
      const actorUserId = changedByUserId || userId;
      await userActivityService.logActivity(
        actorUserId,
        'change_pin',
        {
          targetUserId: userId,
          details: {
            username: user.username,
            selfChange: !changedByUserId,
          },
          ...activityOptions,
        }
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error changing PIN:', error);
      throw error;
    }
  }
  
  async deactivateUser(
    userId: string,
    deactivatedByUserId: string,
    activityOptions?: { ipAddress?: string; userAgent?: string }
  ): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const result = await this.localDb
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await this.queueForSync('update', userId);
      
      // Log activity
      await userActivityService.logActivity(
        deactivatedByUserId,
        'deactivate_user',
        {
          targetUserId: userId,
          details: {
            username: user.username,
            role: user.role,
          },
          ...activityOptions,
        }
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }
  
  async reactivateUser(
    userId: string,
    reactivatedByUserId: string,
    activityOptions?: { ipAddress?: string; userAgent?: string }
  ): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const result = await this.localDb
        .update(users)
        .set({ 
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await this.queueForSync('update', userId);
      
      // Log activity
      await userActivityService.logActivity(
        reactivatedByUserId,
        'reactivate_user',
        {
          targetUserId: userId,
          details: {
            username: user.username,
            role: user.role,
          },
          ...activityOptions,
        }
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }
  
  // Update user information
  async updateUser(
    userId: string,
    updateData: Partial<Pick<User, 'username' | 'role'>>,
    updatedByUserId: string,
    activityOptions?: { ipAddress?: string; userAgent?: string }
  ): Promise<User | null> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if new username already exists (if username is being updated)
      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await this.findByUsername(updateData.username);
        if (existingUser) {
          throw new Error('Username already exists');
        }
      }
      
      const result = await this.localDb
        .update(users)
        .set({ 
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      if (result.changes === 0) {
        return null;
      }
      
      await this.queueForSync('update', userId);
      
      // Log activity
      await userActivityService.logActivity(
        updatedByUserId,
        'update_user',
        {
          targetUserId: userId,
          details: {
            username: user.username,
            changes: updateData,
          },
          ...activityOptions,
        }
      );
      
      return await this.findById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  // Search users with pagination
  async searchUsers(options: {
    search?: string;
    role?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ users: User[]; total: number }> {
    try {
      const { search, role, isActive, limit = 20, offset = 0 } = options;
      
      const conditions = [];
      
      if (search) {
        conditions.push(like(users.username, `%${search}%`));
      }
      
      if (role) {
        conditions.push(eq(users.role, role));
      }
      
      if (typeof isActive === 'boolean') {
        conditions.push(eq(users.isActive, isActive));
      }
      
      // Get users
      const usersQuery = conditions.length > 0
        ? this.localDb
            .select()
            .from(users)
            .where(and(...conditions))
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset)
        : this.localDb
            .select()
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);
      const userResults = await usersQuery;
      
      // Get total count
      const countQuery = this.localDb
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      const countResult = conditions.length > 0 
        ? await countQuery.where(and(...conditions))
        : await countQuery;
      const total = countResult[0]?.count || 0;
      
      return {
        users: userResults,
        total,
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();
