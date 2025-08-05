'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { settingsService } from '@/services/settings/settingsService';

interface SessionTimeoutWarningProps {
  timeUntilLogout: number | null; // seconds until logout
  onExtendSession: () => void;
  onLogout: () => void;
  warningThreshold?: number; // seconds before logout to show warning
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  timeUntilLogout,
  onExtendSession,
  onLogout,
  warningThreshold = 300, // 5 minutes default
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (timeUntilLogout === null) {
      setShowWarning(false);
      return;
    }

    // Show warning when time is below threshold
    if (timeUntilLogout < warningThreshold && timeUntilLogout > 0) {
      setShowWarning(true);
      setCountdown(timeUntilLogout);
    } else {
      setShowWarning(false);
    }

    // Auto-logout when time reaches 0
    if (timeUntilLogout <= 0) {
      setShowWarning(false);
      onLogout();
    }
  }, [timeUntilLogout, warningThreshold, onLogout]);

  const handleExtendSession = () => {
    setShowWarning(false);
    onExtendSession();
  };

  const handleLogoutNow = () => {
    setShowWarning(false);
    onLogout();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  if (!showWarning) return null;

  return (
    <Modal
      isOpen={showWarning}
      onClose={() => {}} // Prevent closing by clicking backdrop
      title="Session Expiring Soon"
      size="sm"

    >
      <div className="text-center space-y-6">
        {/* Warning Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-warning-100">
          <svg
            className="h-8 w-8 text-warning-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Your session will expire soon
          </p>
          <p className="text-gray-600">
            You will be automatically logged out in{' '}
            <span className="font-mono font-semibold text-warning-600">
              {formatTime(countdown)}
            </span>
          </p>
          <p className="text-sm text-gray-500">
            Click &quot;Stay Signed In&quot; to extend your session, or &quot;Sign Out&quot; to logout now.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleExtendSession}
            className="flex-1"
          >
            Stay Signed In
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogoutNow}
            className="flex-1"
          >
            Sign Out Now
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-gray-500 border-t pt-4">
          <p>
            For security, you are automatically signed out after {settingsService.getSettings().security.sessionTimeout} minutes of inactivity.
          </p>
        </div>
      </div>
    </Modal>
  );
};