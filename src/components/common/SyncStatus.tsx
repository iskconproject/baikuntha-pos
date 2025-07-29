'use client';

import React, { useState, useEffect } from 'react';
import { syncService, type SyncStatus } from '@/services/database/sync';
import { useConnectionStatus } from '@/lib/utils/connection';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatusIndicator({ className = '', showDetails = false }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncAt: null,
    pendingOperations: 0,
    errors: []
  });
  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    const unsubscribe = syncService.subscribeSyncStatus(setSyncStatus);
    return unsubscribe;
  }, []);

  const getStatusColor = () => {
    if (!connectionStatus.isOnline) return 'bg-red-500';
    if (syncStatus.isSyncing) return 'bg-yellow-500 animate-pulse';
    if (syncStatus.errors.length > 0) return 'bg-orange-500';
    if (syncStatus.pendingOperations > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!connectionStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.errors.length > 0) return 'Sync Error';
    if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} Pending`;
    return 'Synced';
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSyncAt) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - syncStatus.lastSyncAt.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleManualSync = async () => {
    try {
      await syncService.performFullSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
        <button
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing || !connectionStatus.isOnline}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {connectionStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last Sync:</span>
          <span className="text-sm font-medium">{formatLastSync()}</span>
        </div>

        {/* Pending Operations */}
        {syncStatus.pendingOperations > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Pending:</span>
            <span className="text-sm font-medium text-blue-600">
              {syncStatus.pendingOperations} operations
            </span>
          </div>
        )}

        {/* Errors */}
        {syncStatus.errors.length > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-1">Sync Errors:</p>
            <ul className="text-xs text-red-700 space-y-1">
              {syncStatus.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Connection Details */}
        {connectionStatus.isOnline && connectionStatus.connectionType && (
          <div className="mt-3 p-2 bg-gray-50 rounded border">
            <p className="text-xs text-gray-600">
              Connection: {connectionStatus.connectionType}
              {connectionStatus.effectiveType && ` (${connectionStatus.effectiveType})`}
              {connectionStatus.downlink && ` • ${connectionStatus.downlink} Mbps`}
              {connectionStatus.rtt && ` • ${connectionStatus.rtt}ms RTT`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SyncStatusBadge({ className = '' }: { className?: string }) {
  return <SyncStatusIndicator className={className} showDetails={false} />;
}

export function SyncStatusPanel({ className = '' }: { className?: string }) {
  return <SyncStatusIndicator className={className} showDetails={true} />;
}