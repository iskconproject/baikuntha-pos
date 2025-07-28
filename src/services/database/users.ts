import { eq, and, desc } from 'drizzle-orm';
import { users, type User, type NewUser } from '@/lib/db/schema';
import { BaseService } from './base';
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
  
  async createUser(userData: Omit<NewUser, 'id' | 'pinHash'> & { pin: string }): Promise<User> {
    try {
      const { pin, ...rest } = userData;
      
      // Hash the PIN
      const saltRounds = parseInt(process.env.PIN_HASH_ROUNDS || '12');
      const pinHash = await bcrypt.hash(pin, saltRounds);
      
      const newUser = {
        ...rest,
        pinHash,
      } as Omit<NewUser, 'id'>;
      
      return await this.create(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async verifyPin(username: string, pin: string): Promise<User | null> {
    try {
      const user = await this.findByUsername(username);
      
      if (!user || !user.isActive) {
        return null;
      }
      
      const isValidPin = await bcrypt.compare(pin, user.pinHash);
      
      if (isValidPin) {
        // Update last login time
        await this.updateLastLogin(user.id);
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
  
  async changePin(userId: string, newPin: string): Promise<boolean> {
    try {
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
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error changing PIN:', error);
      throw error;
    }
  }
  
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await this.queueForSync('update', userId);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }
  
  async reactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await this.localDb
        .update(users)
        .set({ 
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await this.queueForSync('update', userId);
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();