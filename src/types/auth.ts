export type UserRole = 'admin' | 'manager' | 'cashier';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface LoginRequest {
  username: string;
  pin: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
}

export interface SessionData {
  userId: string;
  username: string;
  role: UserRole;
  loginAt: number;
  expiresAt: number;
}

export interface AuthConfig {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
};

export const ROLE_PERMISSIONS = {
  admin: ['users:read', 'users:write', 'products:read', 'products:write', 'transactions:read', 'transactions:write', 'reports:read'],
  manager: ['products:read', 'products:write', 'transactions:read', 'transactions:write', 'reports:read'],
  cashier: ['transactions:read', 'transactions:write'],
} as const;

export type Permission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS][number];