import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getLocalDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import type { AuthUser, LoginRequest, LoginResponse, UserRole, Permission } from '@/types/auth';
import { ROLE_PERMISSIONS, DEFAULT_AUTH_CONFIG } from '@/types/auth';

export class AuthService {
  private static instance: AuthService;
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private db = getLocalDb();

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Hash a PIN using bcrypt
   */
  async hashPin(pin: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(pin, saltRounds);
  }

  /**
   * Verify a PIN against its hash
   */
  async verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pin, hash);
  }

  /**
   * Authenticate user with username and PIN
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { username, pin } = credentials;

    // Check for rate limiting
    if (this.isUserLocked(username)) {
      return {
        success: false,
        message: `Account temporarily locked. Try again in ${DEFAULT_AUTH_CONFIG.lockoutDurationMinutes} minutes.`,
      };
    }

    try {
      // Find user by username
      const userResult = await this.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (userResult.length === 0) {
        this.recordFailedAttempt(username);
        return {
          success: false,
          message: 'Invalid username or PIN',
        };
      }

      const user = userResult[0];

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated. Contact administrator.',
        };
      }

      // Verify PIN
      const isValidPin = await this.verifyPin(pin, user.pinHash);
      if (!isValidPin) {
        this.recordFailedAttempt(username);
        return {
          success: false,
          message: 'Invalid username or PIN',
        };
      }

      // Clear failed attempts on successful login
      this.loginAttempts.delete(username);

      // Update last login timestamp
      await this.db
        .update(users)
        .set({ 
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Return authenticated user
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
        isActive: user.isActive ?? true,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
      };

      return {
        success: true,
        user: authUser,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const userResult = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return null;
      }

      const user = userResult[0];
      return {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
        isActive: user.isActive ?? true,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
      };
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userRole: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[userRole].includes(permission as any);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Validate PIN complexity
   */
  validatePin(pin: string): { isValid: boolean; message?: string } {
    if (!pin || pin.length < 4) {
      return {
        isValid: false,
        message: 'PIN must be at least 4 digits long',
      };
    }

    if (pin.length > 8) {
      return {
        isValid: false,
        message: 'PIN must not exceed 8 digits',
      };
    }

    if (!/^\d+$/.test(pin)) {
      return {
        isValid: false,
        message: 'PIN must contain only numbers',
      };
    }

    // Check for simple patterns (e.g., 1111, 1234, 4321)
    if (this.isWeakPin(pin)) {
      return {
        isValid: false,
        message: 'PIN is too simple. Avoid sequential or repeated digits',
      };
    }

    return { isValid: true };
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(username: string): void {
    const now = Date.now();
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: now };
    
    attempts.count += 1;
    attempts.lastAttempt = now;
    
    this.loginAttempts.set(username, attempts);
  }

  /**
   * Check if user is temporarily locked due to failed attempts
   */
  private isUserLocked(username: string): boolean {
    const attempts = this.loginAttempts.get(username);
    if (!attempts || attempts.count < DEFAULT_AUTH_CONFIG.maxLoginAttempts) {
      return false;
    }

    const lockoutDuration = DEFAULT_AUTH_CONFIG.lockoutDurationMinutes * 60 * 1000;
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    
    if (timeSinceLastAttempt > lockoutDuration) {
      // Lockout period has expired, clear attempts
      this.loginAttempts.delete(username);
      return false;
    }

    return true;
  }

  /**
   * Check if PIN is weak (simple patterns)
   */
  private isWeakPin(pin: string): boolean {
    // Check for repeated digits (1111, 2222, etc.)
    if (/^(\d)\1+$/.test(pin)) {
      return true;
    }

    // Check for sequential ascending (1234, 2345, etc.)
    let isAscending = true;
    for (let i = 1; i < pin.length; i++) {
      if (parseInt(pin[i]) !== parseInt(pin[i - 1]) + 1) {
        isAscending = false;
        break;
      }
    }
    if (isAscending) return true;

    // Check for sequential descending (4321, 5432, etc.)
    let isDescending = true;
    for (let i = 1; i < pin.length; i++) {
      if (parseInt(pin[i]) !== parseInt(pin[i - 1]) - 1) {
        isDescending = false;
        break;
      }
    }
    if (isDescending) return true;

    return false;
  }

  /**
   * Clear all login attempts (for testing)
   */
  clearLoginAttempts(): void {
    this.loginAttempts.clear();
  }
}

export const authService = AuthService.getInstance();