'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { trustedDeviceService } from '@/services/auth/trustedDeviceService';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [loginError, setLoginError] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      // Redirect based on user role
      const dashboardPath = getDashboardPath(user.role);
      router.replace(dashboardPath);
    }
  }, [user, isLoading, router]);

  // Load remember device preference and last username from localStorage
  useEffect(() => {
    const remembered = localStorage.getItem('vaikuntha-remember-device') === 'true';
    setRememberDevice(remembered);
  }, []);

  const handleLogin = async (username: string, pin: string) => {
    setLoginError('');
    
    const result = await login(username, pin);
    
    if (result.success) {
      // Handle remember device functionality
      if (rememberDevice) {
        localStorage.setItem('vaikuntha-remember-device', 'true');
        trustedDeviceService.trustDevice(username);
        trustedDeviceService.setLastRememberedUsername(username);
      } else {
        localStorage.removeItem('vaikuntha-remember-device');
        trustedDeviceService.untrustDevice(username);
        trustedDeviceService.clearLastRememberedUsername();
      }
      
      // Navigation will be handled by the useEffect above
    } else {
      setLoginError(result.error || 'Login failed');
    }
    
    return result;
  };

  const handleRememberDeviceChange = (remember: boolean) => {
    setRememberDevice(remember);
    if (!remember) {
      localStorage.removeItem('vaikuntha-remember-device');
      trustedDeviceService.clearLastRememberedUsername();
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-saffron-50 to-saffron-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-600 mx-auto mb-4"></div>
          <p className="text-saffron-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 to-saffron-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm
          onLogin={handleLogin}
          isLoading={isLoading}
          error={loginError}
          rememberDevice={rememberDevice}
          onRememberDeviceChange={handleRememberDeviceChange}
        />
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-saffron-600">
            ISKCON Asansol Temple
          </p>
          <p className="text-xs text-saffron-500 mt-1">
            Gift & Book Store POS System
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Get dashboard path based on user role
 */
function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'manager':
      return '/dashboard/manager';
    case 'cashier':
      return '/dashboard/cashier';
    default:
      return '/dashboard';
  }
}