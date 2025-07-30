import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { SessionData, AuthUser } from '@/types/auth';
import { DEFAULT_AUTH_CONFIG } from '@/types/auth';
import { authService } from '@/services/auth/authService';

const SESSION_COOKIE_NAME = 'vaikuntha-session';
const SESSION_SECRET = process.env.APP_SECRET || 'fallback-secret-key-change-in-production';

/**
 * Simple JWT-like token encoding/decoding without external dependencies
 */
class SimpleTokenManager {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Encode session data to a token
   */
  encode(data: SessionData): string {
    const payload = JSON.stringify(data);
    const signature = this.createSignature(payload);
    return `${Buffer.from(payload).toString('base64')}.${signature}`;
  }

  /**
   * Decode and verify token
   */
  decode(token: string): SessionData | null {
    try {
      const [payloadBase64, signature] = token.split('.');
      if (!payloadBase64 || !signature) return null;

      const payload = Buffer.from(payloadBase64, 'base64').toString();
      const expectedSignature = this.createSignature(payload);

      // Verify signature
      if (signature !== expectedSignature) return null;

      const data = JSON.parse(payload) as SessionData;
      
      // Check expiration
      if (Date.now() > data.expiresAt) return null;

      return data;
    } catch {
      return null;
    }
  }

  private createSignature(payload: string): string {
    // Simple HMAC-like signature using built-in crypto
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
  }
}

const tokenManager = new SimpleTokenManager(SESSION_SECRET);

/**
 * Create a new session for authenticated user
 */
export function createSession(user: AuthUser): string {
  const now = Date.now();
  const expiresAt = now + (DEFAULT_AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000);

  const sessionData: SessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginAt: now,
    expiresAt,
  };

  return tokenManager.encode(sessionData);
}

/**
 * Verify and decode session token
 */
export function verifySession(token: string): SessionData | null {
  return tokenManager.decode(token);
}

/**
 * Set session cookie in response
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const maxAge = DEFAULT_AUTH_CONFIG.sessionTimeoutMinutes * 60; // seconds

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Get session from request cookies
 */
export async function getSessionFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionData = verifySession(token);
  if (!sessionData) return null;

  // Get fresh user data from database
  const user = await authService.getUserById(sessionData.userId);
  if (!user || !user.isActive) return null;

  return user;
}

/**
 * Get session from server cookies (for server components)
 */
export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionData = verifySession(token);
  if (!sessionData) return null;

  // Get fresh user data from database
  const user = await authService.getUserById(sessionData.userId);
  if (!user || !user.isActive) return null;

  return user;
}

/**
 * Check if session is about to expire (within 5 minutes)
 */
export function isSessionExpiringSoon(sessionData: SessionData): boolean {
  const fiveMinutes = 5 * 60 * 1000;
  return (sessionData.expiresAt - Date.now()) < fiveMinutes;
}

/**
 * Refresh session token with new expiration
 */
export function refreshSession(sessionData: SessionData): string {
  const now = Date.now();
  const expiresAt = now + (DEFAULT_AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000);

  const refreshedData: SessionData = {
    ...sessionData,
    expiresAt,
  };

  return tokenManager.encode(refreshedData);
}

/**
 * Get authenticated user from request (for API routes)
 */
export async function getSessionUser(request?: NextRequest): Promise<AuthUser | null> {
  if (request) {
    return getSessionFromRequest(request);
  }
  return getSession();
}