'use client';

import React, { useState, useEffect } from 'react';
import { syncService, type SyncStatus } from '@/services/database/sync';
import { offlineQueue, type QueueStats } from '@/services/database/offlineQueue';
import { useConnectionStatus } from '@/lib/utils/connection';
import { SyncStatusPanel } from './SyncStatus';

export function SyncDemo() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncAt: null,
    pendingOperations: 0,
    errors: []
  });
  
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    completedOperations: 0
  });

  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    const unsubscribeSync = syncService.subscribeSyncStatus(setSyncStatus);
    const unsubscribeQueue = offlineQueue.subscribe(setQueueStats);
    
    return () => {
      unsubscribeSync();
      unsubscribeQueue();
    };
  }, []);

  const handleAddOperation = () => {
    const operationId = syncService.queueOperation(
      'create',
      'products',
      {
        id: `demo-${Date.now()}`,
        name: `Demo Product ${Date.now()}`,
        description: 'A demo product created for testing sync',
        basePrice: 99.99,
        categoryId: 'demo-category',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      1
    );
    
    console.log('Queued operation:', operationId);
  };

  const handleManualSync = async () => {
    try {
      const result = await syncService.performFullSync();
      console.log('Manual sync result:', result);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleClearQueue = () => {
    offlineQueue.clear();
  };

  const handleRetryFailed = () => {
    offlineQueue.retryFailed();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sync System Demo</h2>
        <p className="text-gray-600 mb-6">
          This demo shows the offline-first sync system in action. You can queue operations,
          monitor sync status, and test conflict resolution.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Connection Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Connection Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${connectionStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">
                    {connectionStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              {connectionStatus.connectionType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium">{connectionStatus.connectionType}</span>
                </div>
              )}
              
              {connectionStatus.effectiveType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Speed:</span>
                  <span className="text-sm font-medium">{connectionStatus.effectiveType}</span>
                </div>
              )}
            </div>
          </div>

          {/* Queue Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Queue Statistics</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Operations:</span>
                <span className="text-sm font-medium">{queueStats.totalOperations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending:</span>
                <span className="text-sm font-medium text-blue-600">{queueStats.pendingOperations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failed:</span>
                <span className="text-sm font-medium text-red-600">{queueStats.failedOperations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed:</span>
                <span className="text-sm font-medium text-green-600">{queueStats.completedOperations}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleAddOperation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Demo Operation
          </button>
          
          <button
            onClick={handleManualSync}
            disabled={syncStatus.isSyncing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncStatus.isSyncing ? 'Syncing...' : 'Manual Sync'}
          </button>
          
          <button
            onClick={handleClearQueue}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Queue
          </button>
          
          {queueStats.failedOperations > 0 && (
            <button
              onClick={handleRetryFailed}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Retry Failed ({queueStats.failedOperations})
            </button>
          )}
        </div>
      </div>

      {/* Detailed Sync Status */}
      <SyncStatusPanel />

      {/* Recent Operations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Operations</h3>
        <div className="space-y-2">
          {offlineQueue.getAllOperations().slice(0, 5).map((operation) => (
            <div key={operation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    operation.type === 'create' ? 'bg-green-100 text-green-800' :
                    operation.type === 'update' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {operation.type.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{operation.tableName}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {operation.data.name || operation.data.id || 'Unknown'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  Retry: {operation.retryCount}/{operation.maxRetries}
                </div>
                <div className="text-xs text-gray-500">
                  Priority: {operation.priority}
                </div>
              </div>
            </div>
          ))}
          
          {offlineQueue.getAllOperations().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No operations in queue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}