'use client';

import React, { useState, useEffect } from 'react';
import { syncService, type SyncStatus } from '@/services/database/sync';
import { useConnectionStatus } from '@/lib/utils/connection';
import { SyncManager } from './SyncManager';
import { ConflictResolver, useConflictResolver } from './ConflictResolver';
import { DataBackupRestore } from './DataBackupRestore';
import { Button } from '@/components/ui/Button';

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
  const [showSyncManager, setShowSyncManager] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const connectionStatus = useConnectionStatus();
  const conflictResolver = useConflictResolver();

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
    <>
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBackupRestore(true)}
            >
              Backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSyncManager(true)}
            >
              Manage
            </Button>
            <button
              onClick={handleManualSync}
              disabled={syncStatus.isSyncing || !connectionStatus.isOnline}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
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

          {/* Conflicts */}
          {conflictResolver.hasConflicts && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conflicts:</span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {/* Open conflict resolver */}}
                className="text-orange-600 hover:text-orange-700"
              >
                {conflictResolver.conflicts.length} to resolve
              </Button>
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

      {/* Modals */}
      {showSyncManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Sync Management</h2>
              <button
                onClick={() => setShowSyncManager(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <SyncManager />
            </div>
          </div>
        </div>
      )}

      <DataBackupRestore
        isOpen={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
      />

      <ConflictResolver
        conflicts={conflictResolver.conflicts}
        onResolve={conflictResolver.resolveConflict}
        onClose={conflictResolver.clearAllConflicts}
        isOpen={conflictResolver.hasConflicts}
      />
    </>
  );
}

export function SyncStatusBadge({ className = '' }: { className?: string }) {
  return <SyncStatusIndicator className={className} showDetails={false} />;
}

export function SyncStatusPanel({ className = '' }: { className?: string }) {
  return <SyncStatusIndicator className={className} showDetails={true} />;
}