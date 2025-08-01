"use client";

import React, { useState, useEffect } from "react";
import {
  syncService,
  type SyncStatus,
  type SyncResult,
} from "@/services/database/sync";
import {
  offlineQueue,
  type QueueStats,
  type QueuedOperation,
} from "@/services/database/offlineQueue";
import { useConnectionStatus } from "@/lib/utils/connection";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";

interface SyncManagerProps {
  className?: string;
}

export function SyncManager({ className = "" }: SyncManagerProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncAt: null,
    pendingOperations: 0,
    errors: [],
  });
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    completedOperations: 0,
  });
  const [queueOperations, setQueueOperations] = useState<QueuedOperation[]>([]);
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncResult[]>([]);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    const unsubscribeSync = syncService.subscribeSyncStatus(setSyncStatus);
    const unsubscribeQueue = offlineQueue.subscribe(setQueueStats);

    // Load queue operations
    setQueueOperations(offlineQueue.getAllOperations());

    return () => {
      unsubscribeSync();
      unsubscribeQueue();
    };
  }, []);

  const handleManualSync = async () => {
    if (!connectionStatus?.isOnline || syncStatus.isSyncing) return;

    setIsManualSyncing(true);
    try {
      const result = await syncService.performFullSync();

      // Add to sync history
      setSyncHistory((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10 results

      if (!result.success) {
        console.error("Manual sync failed:", result.errors);
      }
    } catch (error) {
      console.error("Manual sync error:", error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRetryFailed = () => {
    offlineQueue.retryFailed();
    setQueueOperations(offlineQueue.getAllOperations());
  };

  const handleClearQueue = () => {
    if (
      confirm(
        "Are you sure you want to clear all queued operations? This cannot be undone."
      )
    ) {
      offlineQueue.clear();
      setQueueOperations([]);
    }
  };

  const getStatusColor = () => {
    if (!connectionStatus?.isOnline) return "bg-red-500";
    if (syncStatus.isSyncing || isManualSyncing)
      return "bg-yellow-500 animate-pulse";
    if (syncStatus.errors.length > 0) return "bg-orange-500";
    if (queueStats.pendingOperations > 0) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (!connectionStatus?.isOnline) return "Offline";
    if (syncStatus.isSyncing || isManualSyncing) return "Syncing...";
    if (syncStatus.errors.length > 0) return "Sync Error";
    if (queueStats.pendingOperations > 0)
      return `${queueStats.pendingOperations} Pending`;
    return "Synced";
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSyncAt) return "Never";

    const now = new Date();
    const lastSyncTime = syncStatus.lastSyncAt instanceof Date ? 
      syncStatus.lastSyncAt.getTime() : 
      (typeof syncStatus.lastSyncAt === 'number' ? syncStatus.lastSyncAt * 1000 : 0);
    const diff = now.getTime() - lastSyncTime;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatOperationType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatTableName = (tableName: string) => {
    return tableName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
            <Badge variant={connectionStatus?.isOnline ? "success" : "destructive"}>
              {connectionStatus?.isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSyncHistory(true)}
            >
              History
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSync}
              disabled={
                !connectionStatus?.isOnline ||
                syncStatus.isSyncing ||
                isManualSyncing
              }
            >
              {syncStatus.isSyncing || isManualSyncing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Syncing...
                </>
              ) : (
                "Sync Now"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Details */}
      <div className="p-4 space-y-4">
        {/* Connection Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="font-medium">{getStatusText()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Last Sync</p>
            <p className="font-medium">{formatLastSync()}</p>
          </div>
        </div>

        {/* Connection Details */}
        {connectionStatus?.isOnline && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">
                Connected
              </span>
              <div className="text-xs text-green-700">
                {connectionStatus?.connectionType && (
                  <span className="capitalize">
                    {connectionStatus.connectionType}
                  </span>
                )}
                {connectionStatus?.effectiveType && (
                  <span className="ml-2">
                    ({connectionStatus.effectiveType})
                  </span>
                )}
                {connectionStatus?.downlink && (
                  <span className="ml-2">{connectionStatus.downlink} Mbps</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Offline Mode Notice */}
        {!connectionStatus?.isOnline && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
              <span className="text-sm font-medium text-red-800">
                Offline Mode
              </span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Operations will be queued and synced when connection is restored
            </p>
          </div>
        )}

        {/* Queue Status */}
        {queueStats.totalOperations > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                Operation Queue
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQueueDetails(true)}
              >
                View Details
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-blue-600">Pending: </span>
                <span className="font-medium">
                  {queueStats.pendingOperations}
                </span>
              </div>
              <div>
                <span className="text-red-600">Failed: </span>
                <span className="font-medium">
                  {queueStats.failedOperations}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total: </span>
                <span className="font-medium">
                  {queueStats.totalOperations}
                </span>
              </div>
            </div>
            {queueStats.failedOperations > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryFailed}
                className="mt-2"
              >
                Retry Failed
              </Button>
            )}
          </div>
        )}

        {/* Sync Errors */}
        {syncStatus.errors.length > 0 && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-2">
              Sync Errors:
            </p>
            <ul className="text-xs text-red-700 space-y-1">
              {syncStatus.errors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Queue Details Modal */}
      <Modal
        isOpen={showQueueDetails}
        onClose={() => setShowQueueDetails(false)}
        title="Operation Queue Details"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {queueOperations.length} operations in queue
            </p>
            {queueOperations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </div>

          {queueOperations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No operations in queue
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {queueOperations.map((operation) => (
                <div
                  key={operation.id}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          operation.retryCount >= operation.maxRetries
                            ? "destructive"
                            : "default"
                        }
                      >
                        {formatOperationType(operation.type)}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatTableName(operation.tableName)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(operation.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {operation.retryCount > 0 && (
                    <div className="text-xs text-orange-600 mb-1">
                      Retry {operation.retryCount}/{operation.maxRetries}
                    </div>
                  )}

                  <div className="text-xs text-gray-600">
                    ID: {operation.data?.id || "N/A"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Sync History Modal */}
      <Modal
        isOpen={showSyncHistory}
        onClose={() => setShowSyncHistory(false)}
        title="Sync History"
        size="lg"
      >
        <div className="space-y-4">
          {syncHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sync history available
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncHistory.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    result.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={result.success ? "success" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-600">Tables: </span>
                      <span className="font-medium">
                        {result.tablesProcessed}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Records: </span>
                      <span className="font-medium">
                        {result.recordsSynced}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Conflicts: </span>
                      <span className="font-medium">{result.conflicts}</span>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="text-xs text-red-700">
                      <p className="font-medium mb-1">Errors:</p>
                      <ul className="space-y-1">
                        {result.errors.map((error, errorIndex) => (
                          <li key={errorIndex}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
