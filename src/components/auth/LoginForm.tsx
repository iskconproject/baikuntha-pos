'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  onLogin: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  error?: string;
  rememberDevice?: boolean;
  onRememberDeviceChange?: (remember: boolean) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  isLoading = false,
  error,
  rememberDevice = false,
  onRememberDeviceChange,
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [formError, setFormError] = useState('');
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  // Focus username field on mount and load remembered username
  useEffect(() => {
    // Load remembered username if device is trusted
    const lastUsername = localStorage.getItem('baikuntha-last-username');
    const isRemembered = localStorage.getItem('baikuntha-remember-device') === 'true';
    
    if (isRemembered && lastUsername && !username) {
      setUsername(lastUsername);
      // Focus PIN field if username is pre-filled
      setTimeout(() => {
        pinRef.current?.focus();
      }, 0);
    } else {
      usernameRef.current?.focus();
    }
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Basic validation
    if (!username.trim()) {
      setFormError('Username is required');
      usernameRef.current?.focus();
      return;
    }

    if (!pin.trim()) {
      setFormError('PIN is required');
      pinRef.current?.focus();
      return;
    }

    if (pin.length < 4) {
      setFormError('PIN must be at least 4 digits');
      pinRef.current?.focus();
      return;
    }

    try {
      const result = await onLogin(username.trim(), pin);
      if (!result.success) {
        setFormError(result.error || 'Login failed');
        // Clear PIN on failed login for security
        setPin('');
        pinRef.current?.focus();
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
      setPin('');
      pinRef.current?.focus();
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (/^\d*$/.test(value) && value.length <= 8) {
      setPin(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
      return;
    }
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    // Prevent non-numeric input
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const displayError = error || formError;

  return (
    <Card variant="elevated" className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-saffron-400 to-saffron-600 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BaikunthaPOS</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              ref={usernameRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn(
                'w-full px-4 py-3 rounded-lg border bg-white text-base',
                'min-h-[48px] transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                displayError
                  ? 'border-error-500 focus:border-error-500 focus:ring-error-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              )}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          {/* PIN Field */}
          <div className="space-y-2">
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-gray-700"
            >
              PIN
            </label>
            <div className="relative">
              <input
                ref={pinRef}
                id="pin"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={handlePinChange}
                onKeyDown={handleKeyDown}
                className={cn(
                  'w-full px-4 py-3 pr-12 rounded-lg border bg-white text-base',
                  'min-h-[48px] transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-1',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  // Monospace font for PIN display
                  'font-mono tracking-wider',
                  displayError
                    ? 'border-error-500 focus:border-error-500 focus:ring-error-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                )}
                placeholder="Enter your PIN"
                disabled={isLoading}
                autoComplete="current-password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
              />
              
              {/* Show/Hide PIN Button */}
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className={cn(
                  'absolute inset-y-0 right-0 pr-3 flex items-center',
                  'text-gray-400 hover:text-gray-600 transition-colors',
                  'focus:outline-none focus:text-gray-600',
                  'min-w-[44px] min-h-[44px]'
                )}
                disabled={isLoading}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* PIN Helper Text */}
            <p className="text-xs text-gray-500">
              Enter your 4-8 digit PIN
            </p>
          </div>

          {/* Remember Device Checkbox */}
          {onRememberDeviceChange && (
            <div className="flex items-center">
              <input
                id="remember-device"
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => onRememberDeviceChange(e.target.checked)}
                className={cn(
                  'h-4 w-4 rounded border-gray-300 text-primary-600',
                  'focus:ring-primary-500 focus:ring-offset-0',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
                disabled={isLoading}
              />
              <label
                htmlFor="remember-device"
                className="ml-2 block text-sm text-gray-700 cursor-pointer"
              >
                Remember this device
              </label>
            </div>
          )}

          {/* Error Message */}
          {displayError && (
            <div
              className="flex items-center space-x-2 p-3 rounded-lg bg-error-50 border border-error-200"
              role="alert"
              aria-live="polite"
            >
              <svg
                className="h-5 w-5 text-error-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-error-700">{displayError}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            loadingText="Signing in..."
            className="w-full"
            disabled={!username.trim() || !pin.trim() || isLoading}
          >
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};