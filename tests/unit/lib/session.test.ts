import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession, verifySession, isSessionExpiringSoon, refreshSession } from '@/lib/auth/session';
import type { AuthUser, SessionData } from '@/types/auth';
import { DEFAULT_AUTH_CONFIG } from '@/types/auth';

// Mock environment variable
process.env.SESSION_SECRET = 'test-secret-key';

describe('Session Management', () => {
  const mockUser: AuthUser = {
    id: 'user1',
    username: 'testuser',
    role: 'manager',
    isActive: true,
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a valid session token', () => {
      const token = createSession(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.includes('.')).toBe(true); // Should have signature separator
    });

    it('should create session with correct expiration time', () => {
      const beforeCreate = Date.now();
      const token = createSession(mockUser);
      const afterCreate = Date.now();
      
      const sessionData = verifySession(token);
      
      expect(sessionData).toBeDefined();
      expect(sessionData!.expiresAt).toBeGreaterThan(beforeCreate);
      expect(sessionData!.expiresAt).toBeLessThanOrEqual(
        afterCreate + (DEFAULT_AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000)
      );
    });

    it('should include all user data in session', () => {
      const token = createSession(mockUser);
      const sessionData = verifySession(token);
      
      expect(sessionData).toBeDefined();
      expect(sessionData!.userId).toBe(mockUser.id);
      expect(sessionData!.username).toBe(mockUser.username);
      expect(sessionData!.role).toBe(mockUser.role);
    });
  });

  describe('verifySession', () => {
    it('should verify valid session token', () => {
      const token = createSession(mockUser);
      const sessionData = verifySession(token);
      
      expect(sessionData).toBeDefined();
      expect(sessionData!.userId).toBe(mockUser.id);
      expect(sessionData!.username).toBe(mockUser.username);
      expect(sessionData!.role).toBe(mockUser.role);
    });

    it('should reject invalid token format', () => {
      const invalidToken = 'invalid-token';
      const sessionData = verifySession(invalidToken);
      
      expect(sessionData).toBeNull();
    });

    it('should reject token with invalid signature', () => {
      const token = createSession(mockUser);
      const [payload] = token.split('.');
      const tamperedToken = `${payload}.invalid-signature`;
      
      const sessionData = verifySession(tamperedToken);
      
      expect(sessionData).toBeNull();
    });

    it('should reject expired token', () => {
      // Create a session that expires immediately
      const now = Date.now();
      const expiredSessionData: SessionData = {
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: now - 1000,
        expiresAt: now - 1, // Expired 1ms ago
      };

      // We need to manually create an expired token for testing
      const payload = JSON.stringify(expiredSessionData);
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-secret-key')
        .update(payload)
        .digest('hex');
      const expiredToken = `${Buffer.from(payload).toString('base64')}.${signature}`;
      
      const sessionData = verifySession(expiredToken);
      
      expect(sessionData).toBeNull();
    });

    it('should reject malformed JSON in token', () => {
      const invalidPayload = 'invalid-json';
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-secret-key')
        .update(invalidPayload)
        .digest('hex');
      const invalidToken = `${Buffer.from(invalidPayload).toString('base64')}.${signature}`;
      
      const sessionData = verifySession(invalidToken);
      
      expect(sessionData).toBeNull();
    });
  });

  describe('isSessionExpiringSoon', () => {
    it('should return true for session expiring within 5 minutes', () => {
      const now = Date.now();
      const sessionData: SessionData = {
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: now,
        expiresAt: now + (4 * 60 * 1000), // Expires in 4 minutes
      };

      const isExpiring = isSessionExpiringSoon(sessionData);
      
      expect(isExpiring).toBe(true);
    });

    it('should return false for session expiring after 5 minutes', () => {
      const now = Date.now();
      const sessionData: SessionData = {
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: now,
        expiresAt: now + (10 * 60 * 1000), // Expires in 10 minutes
      };

      const isExpiring = isSessionExpiringSoon(sessionData);
      
      expect(isExpiring).toBe(false);
    });

    it('should return true for already expired session', () => {
      const now = Date.now();
      const sessionData: SessionData = {
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: now - 1000,
        expiresAt: now - 1, // Already expired
      };

      const isExpiring = isSessionExpiringSoon(sessionData);
      
      expect(isExpiring).toBe(true);
    });
  });

  describe('refreshSession', () => {
    it('should create new token with extended expiration', () => {
      const now = Date.now();
      const originalSessionData: SessionData = {
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: now - (10 * 60 * 1000), // Logged in 10 minutes ago
        expiresAt: now + (5 * 60 * 1000), // Expires in 5 minutes
      };

      const newToken = refreshSession(originalSessionData);
      const newSessionData = verifySession(newToken);
      
      expect(newSessionData).toBeDefined();
      expect(newSessionData!.userId).toBe(originalSessionData.userId);
      expect(newSessionData!.username).toBe(originalSessionData.username);
      expect(newSessionData!.role).toBe(originalSessionData.role);
      expect(newSessionData!.loginAt).toBe(originalSessionData.loginAt);
      expect(newSessionData!.expiresAt).toBeGreaterThan(originalSessionData.expiresAt);
    });

    it('should preserve original login time', () => {
      const originalLoginTime = Date.now() - (20 * 60 * 1000); // 20 minutes ago
      const sessionData: SessionData = {
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        loginAt: originalLoginTime,
        expiresAt: Date.now() + (5 * 60 * 1000),
      };

      const newToken = refreshSession(sessionData);
      const newSessionData = verifySession(newToken);
      
      expect(newSessionData!.loginAt).toBe(originalLoginTime);
    });
  });

  describe('Token security', () => {
    it('should create different tokens for same user', async () => {
      const token1 = createSession(mockUser);
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const token2 = createSession(mockUser);
      
      expect(token1).not.toBe(token2);
    });

    it('should not be able to modify token payload without invalidating signature', () => {
      const token = createSession(mockUser);
      const [payloadBase64, signature] = token.split('.');
      
      // Try to modify the payload
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      payload.role = 'admin'; // Try to escalate privileges
      
      const modifiedPayloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const modifiedToken = `${modifiedPayloadBase64}.${signature}`;
      
      const sessionData = verifySession(modifiedToken);
      
      expect(sessionData).toBeNull(); // Should be rejected due to invalid signature
    });
  });
});