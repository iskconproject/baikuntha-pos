'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface OfflineReportStatusProps {
  isOnline: boolean;
}

interface SyncStatus {
  isActive: boolean;
  progress: number;
  message: string;
  lastSyncTime?: Date;
  pendingReports: number;
}

export function OfflineReportStatus({ isOnline }: OfflineReportStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    progress: 0,
    message: 'All reports up to date',
    pendingReports: 0,
  });

  useEffect(() => {
    // Check for pending reports and sync status
    checkSyncStatus();
    
    // Set up periodic sync status checks
    const interval = setInterval(checkSyncStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [isOnline]);

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isActive: true, message: 'Starting sync...' }));
      
      const response = await fetch('/api/sync/trigger', { method: 'POST' });
      if (response.ok) {
        checkSyncStatus();
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        isActive: false, 
        message: 'Sync failed - will retry automatically' 
      }));
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus.isActive) return 'bg-yellow-500';
    if (syncStatus.pendingReports > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline - Reports available locally';
    if (syncStatus.isActive) return `Syncing... ${syncStatus.progress}%`;
    if (syncStatus.pendingReports > 0) return `${syncStatus.pendingReports} reports pending sync`;
    return 'All reports synced';
  };

  return (
    <div className="bg-white rounded-lg border p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Report Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <span className="text-xs text-gray-500">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          {getStatusText()}
        </div>

        {syncStatus.isActive && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${syncStatus.progress}%` }}
            ></div>
          </div>
        )}

        {syncStatus.lastSyncTime && (
          <div className="text-xs text-gray-500">
            Last sync: {syncStatus.lastSyncTime.toLocaleString()}
          </div>
        )}

        <div className="text-xs text-gray-500">
          {syncStatus.message}
        </div>

        {isOnline && syncStatus.pendingReports > 0 && !syncStatus.isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={triggerSync}
            className="w-full mt-2"
          >
            Sync Now
          </Button>
        )}

        {!isOnline && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>Offline Mode:</strong> Reports are generated from local data. 
            Some data may be incomplete until connection is restored.
          </div>
        )}
      </div>
    </div>
  );
}