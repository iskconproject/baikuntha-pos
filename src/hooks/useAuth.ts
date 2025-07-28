import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@/types/auth';
import { DEFAULT_AUTH_CONFIG } from '@/types/auth';

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  timeUntilLogout: number | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilLogout, setTimeUntilLogout] = useState<number | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Login function
  const login = useCallback(async (username: string, pin: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        updateActivity();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [updateActivity]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTimeUntilLogout(null);
    }
  }, []);

  // Refresh authentication status
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        updateActivity();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [updateActivity]);

  // Auto-logout timer effect
  useEffect(() => {
    if (!user) {
      setTimeUntilLogout(null);
      return;
    }

    const timeoutMs = DEFAULT_AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000;
    
    const updateTimer = () => {
      const timeSinceActivity = Date.now() - lastActivity;
      const remaining = timeoutMs - timeSinceActivity;
      
      if (remaining <= 0) {
        logout();
        return;
      }
      
      setTimeUntilLogout(Math.ceil(remaining / 1000)); // Convert to seconds
    };

    // Update timer immediately
    updateTimer();
    
    // Update timer every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [user, lastActivity, logout]);

  // Activity tracking effect
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, updateActivity]);

  // Initial auth check
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return {
    user,
    isLoading,
    login,
    logout,
    refreshAuth,
    timeUntilLogout,
  };
}