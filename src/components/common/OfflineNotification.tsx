'use client';

import React, { useState, useEffect } from 'react';
import { useConnectionStatus } from '@/lib/utils/connection';
import { offlineQueue, type QueueStats } from '@/services/database/offlineQueue';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface OfflineNotificationProps {
  className?: string;
  position?: 'top' | 'bottom';
  showFeatureLimitations?: boolean;
}

export function OfflineNotification({ 
  className = '', 
  position = 'top',
  showFeatureLimitations = true 
}: OfflineNotificationProps) {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    completedOperations: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe(setQueueStats);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Show notification when offline or when there are pending operations
    const shouldShow = !connectionStatus.isOnline || queueStats.pendingOperations > 0;
    setIsVisible(shouldShow && !isDismissed);
    
    // Reset dismissal when coming back online with no pending operations
    if (connectionStatus.isOnline && queueStats.pendingOperations === 0) {
      setIsDismissed(false);
    }
  }, [connectionStatus.isOnline, queueStats.pendingOperations, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const getNotificationContent = () => {
    if (!connectionStatus.isOnline) {
      return {
        type: 'offline' as const,
        title: 'Working Offline',
        message: 'No internet connection. Changes will be saved locally and synced when connection is restored.',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600'
      };
    } else if (queueStats.pendingOperations > 0) {
      return {
        type: 'syncing' as const,
        title: 'Syncing Changes',
        message: `${queueStats.pendingOperations} operations pending sync to cloud.`,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      };
    }
    
    return null;
  };

  const content = getNotificationContent();

  if (!isVisible || !content) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-4' 
    : 'bottom-4';

  return (
    <div className={`fixed left-4 right-4 z-50 ${positionClasses} ${className}`}>
      <div className={`${content.bgColor} ${content.borderColor} border rounded-lg shadow-lg p-4 mx-auto max-w-2xl`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {content.type === 'offline' ? (
                <svg className={`w-5 h-5 ${content.iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 ${content.iconColor} animate-spin`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${content.textColor}`}>
                  {content.title}
                </h4>
                {content.type === 'offline' && (
                  <Badge variant="destructive" size="sm">Offline</Badge>
                )}
                {content.type === 'syncing' && (
                  <Badge variant="secondary" size="sm">Syncing</Badge>
                )}
              </div>
              
              <p className={`text-sm ${content.textColor} opacity-90`}>
                {content.message}
              </p>
              
              {/* Queue Details */}
              {queueStats.totalOperations > 0 && (
                <div className="mt-2 flex items-center space-x-4 text-xs">
                  <span className={content.textColor}>
                    Pending: {queueStats.pendingOperations}
                  </span>
                  {queueStats.failedOperations > 0 && (
                    <span className="text-red-600">
                      Failed: {queueStats.failedOperations}
                    </span>
                  )}
                </div>
              )}
              
              {/* Feature Limitations */}
              {showFeatureLimitations && content.type === 'offline' && (
                <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-300">
                  <p className="text-xs font-medium text-yellow-800 mb-1">
                    Limited Features in Offline Mode:
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-0.5">
                    <li>• Cloud reports and analytics unavailable</li>
                    <li>• Real-time inventory sync disabled</li>
                    <li>• User management restricted</li>
                    <li>• Receipt printing may be limited</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 ${content.textColor}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for status bars
export function OfflineStatusBadge({ className = '' }: { className?: string }) {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    completedOperations: 0
  });
  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe(setQueueStats);
    return unsubscribe;
  }, []);

  if (connectionStatus.isOnline && queueStats.pendingOperations === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {!connectionStatus.isOnline && (
        <Badge variant="destructive" size="sm">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
          Offline
        </Badge>
      )}
      
      {queueStats.pendingOperations > 0 && (
        <Badge variant="secondary" size="sm">
          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {queueStats.pendingOperations} Syncing
        </Badge>
      )}
    </div>
  );
}